<!-- docs/database.md — DB 문서 -->

# DB (Kysely + MySQL)

> 이 저장소에는 **실제 DB 가 없다.** 접속 환경(docker-compose 등)은 프로젝트마다 다르므로 두지 않았다.
> 여기 있는 것은 구조와 사용법을 보여 주는 예시 파일이다. 서버는 DB 없이도 뜬다 (연결 풀은 첫 쿼리 때 접속).

## 파일

```
src/db/
├─ index.ts        # createDatabase(options), Database·DatabaseOptions 타입
├─ env.ts          # DB_* 환경변수 → DatabaseOptions (databaseOptionsFromEnv)
├─ client.ts       # 앱 전체 공용 인스턴스 db
├─ transaction.ts  # executor() / transaction() — 트랜잭션 문맥 (AsyncLocalStorage)
├─ types/
│  ├─ index.ts           # Db 인터페이스 (전체 테이블 등록)
│  └─ example.type.ts    # 테이블별 타입
├─ migrate.ts      # 마이그레이션 실행 (단독 스크립트)
├─ migrations/
│  └─ 2026-10-08-001-create-examples.ts
└─ seeds/
   ├─ index.ts           # 시드 등록부 + 실행기 (단독 스크립트)
   └─ example.seed.ts    # 파트별 시드
src/plugins/db.ts  # 앱 종료 시 연결 정리
```

## src/db 는 바깥을 import 하지 않는다

`src/db/` 안의 파일은 `@/db/...` 만 import 할 수 있다. `@/configs`, `@/lib` 등 바깥을 import 하면 **Biome lint 에러**다
(`biome.jsonc` 의 `overrides`).
모노레포가 되면 이 디렉토리를 그대로 `packages/db` 로 옮기기 위해서다. → [monorepo.md](monorepo.md)

그래서:
- **`createDatabase(options)` 는 환경변수를 읽지 않는다.** 접속 정보를 인자로 받는다
- DB 접속 환경변수(`DB_*`)는 `configs/env.config.ts` 가 아니라 **`db/env.ts`** 가 검증한다
- 환경변수를 읽는 것은 공용 인스턴스를 만드는 `db/client.ts` 한 곳뿐이다

```ts
// db/client.ts
export const db = createDatabase(databaseOptionsFromEnv());
```

## 시간대 — UTC 로 두 곳을 못박는다

`createDatabase()` 는 시간대를 **두 곳** 모두 UTC 로 고정한다. 하나만 하면 안 된다.

| 설정 | 무엇의 기준인가 |
|---|---|
| mysql2 `timezone: "Z"` | 앱이 보내고 받는 `Date` 의 해석 |
| 연결마다 `SET time_zone = '+00:00'` | MySQL 이 스스로 넣는 값 (`DEFAULT CURRENT_TIMESTAMP` 인 `created_at`) |

둘이 어긋나면 **같은 행에서 앱이 넣은 값과 MySQL 이 넣은 값이 다른 시간대로 적힌다** (DB 서버가 KST 면 9시간 차이).
DB 서버 설정에 기대지 않는다. 우리가 띄우는 서버가 아닐 수 있다.
한국 시각으로 보여 주는 것은 화면이 한다.

## 계층별로 DB·트랜잭션을 누가 아나

| 계층 | DB | 트랜잭션 |
|---|---|---|
| controller | 모른다 | 모른다 |
| service | 모른다 | **경계를 정한다** — `transaction(async () => { ... })` |
| repository | `executor()` 로 **스스로 가져온다** | 모른다 (안에서 불리면 자동으로 같은 trx) |

```ts
// controller — DB 를 모른다
const example = await exampleService.getExample(request.params.id, request.query);

// service — DB 인자가 없다. 혼자 돈다 (route·스크립트·스케줄러 어디서든)
const getExample = async (id: number, query: GetExampleRequest): Promise<GetExampleResponse> => {
  const row = await exampleRepository.findById(id);
  ...
};

// repository — DB 를 스스로 가져온다
const findById = (id: number) =>
  executor().selectFrom("examples").selectAll().where("id", "=", id).executeTakeFirst();
```

- service 가 Fastify 도 DB 도 모르므로 **혼자 돈다.** 부르는 쪽이 DB 를 구해 넣을 필요가 없다
- repository 는 누가 자기를 부르는지, 트랜잭션 안인지 모른다
- **repository 는 `db` 를 직접 import 하지 않고 항상 `executor()` 를 쓴다.** `db` 를 직접 쓰면 트랜잭션 안에서 불려도 트랜잭션 밖에서 실행된다

## 트랜잭션

**service 가 연다.** 원자적이어야 하는 단위를 `transaction()` 으로 감싼다. repository·controller 는 열지 않는다.

```ts
const createExample = (input: PostExampleRequest, createdBy: string) =>
  transaction(async () => {
    const id = await exampleRepository.insert({ ... });   // 인자 없이도 같은 trx
    const row = await exampleRepository.findById(id);     // 같은 trx
    ...
  });
```

### 원리 — AsyncLocalStorage

`db/transaction.ts` 는 Node 내장 `AsyncLocalStorage` 로 "지금 진행 중인 트랜잭션" 을 **비동기 흐름을 따라** 전달한다.

```ts
const storage = new AsyncLocalStorage<Transaction<Db>>();

export const executor = () => storage.getStore() ?? db;            // 흐름 안이면 trx, 밖이면 db
export const transaction = (fn) =>
  storage.getStore()
    ? fn()                                                          // 이미 안이면 합류
    : db.transaction().execute((trx) => storage.run(trx, fn));      // 아니면 새로 연다
```

- `storage.run(trx, fn)` 안에서 이어지는 모든 비동기 작업(await …)은 `storage.getStore()` 로 같은 trx 를 본다
- 동시에 들어온 요청은 흐름이 달라 **각자 자기 trx 만 본다**
- Go 로 치면 `context.Context` 를 인자로 넘기지 않고 자동으로 전달하는 것과 같다

### 합류 — service 가 다른 service 를 불러도 한 트랜잭션

```ts
const placeOrder = (input) =>
  transaction(async () => {                    // 새로 연다 (trx A)
    await orderRepository.insert(...);
    await stockService.decrease(input.itemId); // decrease 안의 transaction() → trx A 에 합류
  });
```

- 이미 트랜잭션 안이면 `transaction()` 은 새로 열지 않고 합류한다 → 전체가 한 번에 커밋·롤백
- 단독으로 불리면 자기 트랜잭션을 연다 → service 는 혼자서도 정합성을 지킨다
- 합류가 없으면 각각 다른 연결의 별개 트랜잭션이 되어, 바깥이 롤백돼도 안쪽은 커밋된 채 남는다

### 규칙

- **트랜잭션 안의 호출은 반드시 `await` 한다.** 던져 두면 커밋 뒤에 실행되거나 트랜잭션 밖에서 실행된다.
  Biome `noFloatingPromises`(nursery 규칙)가 await 누락을 lint 에러로 잡는다
- **트랜잭션 안에서 다른 service 의 에러를 삼키지 않는다.** 합류한 쪽만 따로 롤백되지 않으므로,
  try/catch 로 삼키고 계속하면 반쯤 쓴 데이터가 함께 커밋된다. 에러는 그대로 올려 전체를 롤백한다
  (부분 롤백이 정말 필요하면 savepoint 를 따로 검토한다)
- fn 이 throw 하면 롤백되고 에러는 그대로 올라가 error-handler 가 실패 봉투로 응답한다. controller 는 아무것도 하지 않는다
- MySQL 은 `RETURNING` 이 없어, insert 후 같은 트랜잭션에서 다시 조회한다

## 이름 변환 — CamelCasePlugin

DB 는 snake_case, 코드는 camelCase. `createDatabase()` 에 붙은 `CamelCasePlugin` 이 쿼리할 때 바꾼다.

| DB | 코드 (`db/types/`, 쿼리) |
|---|---|
| `created_by` | `createdBy` |
| `created_at` | `createdAt` |

```ts
db.selectFrom("examples").where("createdBy", "=", "u1")  // → WHERE created_by = 'u1'
```

**마이그레이션은 예외:** 컬럼 이름을 snake_case 로 직접 쓴다 (실제 DB 이름을 다루는 곳이므로).

## 테이블 타입 (`db/types/`)

**손으로 작성한다.** 마이그레이션을 추가·변경하면 여기도 함께 고친다.
**테이블별로 파일을 나눈다** (`types/<테이블 단수>.type.ts`). 한 파일에 모으면 테이블이 늘수록 찾기 어렵다.

```ts
// db/types/example.type.ts
export interface ExamplesTable {
  id: Generated<number>;                        // DB 가 채움 → insert 때 생략 가능
  title: string;
  description: string | null;
  createdBy: string;
  createdAt: ColumnType<Date, never, never>;    // 읽기만. insert·update 불가 (DB 기본값)
}

export type ExampleRow = Selectable<ExamplesTable>;     // 조회 결과
export type NewExampleRow = Insertable<ExamplesTable>;  // insert 값
```

```ts
// db/types/index.ts — 모든 테이블을 등록
export interface Db {
  examples: ExamplesTable;   // 키 = 테이블 이름
}
```

쓰는 쪽은 필요한 테이블 파일에서 바로 import 한다.

```ts
import type { Db } from "@/db/types";                         // Kysely 인스턴스용
import type { ExampleRow } from "@/db/types/example.type";    // 행 타입
```

### DB 행 ≠ API 모양

`ExampleRow`(DB 행)와 `Example`(API 응답 계약, `api-contracts/example.contract.ts`)는 따로 둔다.
service 가 바꾼다.

```ts
const toExample = (row: ExampleRow): Example => ({
  id: row.id,
  ...
  createdAt: row.createdAt.toISOString(),  // Date → 문자열
});
```

- 내보낼 필드만 고른다. 응답 스키마도 스키마에 없는 필드를 빼지만, 타입으로 먼저 막는다
- 응답 스키마가 `Type.String({ format: "date-time" })` 이므로 `Date` 를 문자열로 바꿔야 `reply.ok()` 타입이 맞는다

## 마이그레이션

```ts
export async function up(db: Kysely<unknown>): Promise<void> {
  await db.schema
    .createTable("examples")
    .addColumn("id", "integer", (col) => col.primaryKey().autoIncrement())
    ...
    .execute();
}

export async function down(db: Kysely<unknown>): Promise<void> {
  await db.schema.dropTable("examples").execute();
}
```

- 파일 이름: `<YYYY-MM-DD>-<순번 3자리>-<내용>.ts`. 이름 순서로 실행된다
- **한 번 실행된 파일은 고치지 않는다.** 바꿀 게 있으면 새 파일을 추가한다
- `up` 과 `down` 을 함께 쓴다. `down` 은 `up` 을 정확히 되돌린다
- `Kysely<Db>` 가 아니라 `Kysely<unknown>` 을 받는다. 마이그레이션은 그 시점의 스키마를 다루므로 나중에 바뀐 `db/types/` 에 묶이면 안 된다
- 실행 기록은 DB 의 `kysely_migration` 테이블에 남는다
- Kysely 0.29 부터 `Migrator`, `FileMigrationProvider` 는 `kysely/migration` 에서 import 한다

```bash
npm run db:migrate        # 최신까지 up
npm run db:migrate:down   # 한 단계 down
npm run db:seed           # 개발용 데이터 전부 (운영 DB 에 실행 금지)
npm run db:seed -- example  # 한 파트만
```

## 시드

**파트(테이블·기능)별로 파일을 나눈다.** 한 파일에 모으면 커질수록 관리가 어렵다.

```ts
// db/seeds/example.seed.ts
const run = async (): Promise<number> => {
  await executor().deleteFrom("examples").where("createdBy", "=", "seed").execute(); // 이전 시드 데이터 지움
  await executor().insertInto("examples").values(rows).execute();
  return rows.length; // 넣은 건수 (로그용)
};

export default { run };
```

```ts
// db/seeds/index.ts — 순서가 곧 실행 순서
const seeds = [
  ["example", exampleSeed.run],
];
```

- 파일 이름: `<파트>.seed.ts`. `run()` 하나를 default export 객체로 내보낸다
- **몇 번을 실행해도 결과가 같게** 만든다. 넣기 전에 그 시드가 넣었던 행을 지운다 (시드 행을 구분할 표시를 둔다)
- `seeds/index.ts` 에 등록한다. **다른 테이블을 참조(FK)하는 시드는 참조 대상보다 뒤에** 둔다
- 전부 한 트랜잭션으로 실행한다. 하나라도 실패하면 아무것도 남지 않는다
- 시드도 repository 처럼 `executor()` 로 쿼리한다. 실행기가 `transaction()` 으로 감싸므로 같은 트랜잭션이 된다

## 새 테이블 추가 순서

1. `db/migrations/<날짜>-<순번>-create-<테이블>.ts` — up / down
2. `db/types/<테이블 단수>.type.ts` — `<Table>Table` 인터페이스, `<단수>Row` / `New<단수>Row`. `db/types/index.ts` 의 `Db` 에 키 추가
3. `modules/<기능>/<기능>.repository.ts` — 쿼리
4. service 에서 DB 행 → API 모양 변환
5. 개발 데이터가 필요하면 `db/seeds/<파트>.seed.ts` + `seeds/index.ts` 등록
6. `npm run db:migrate` (→ `npm run db:seed`)

## 앱에서

- 인스턴스는 `db/client.ts` 의 `db` 하나다. `fastify.db` 같은 데코레이터는 두지 않는다
- `plugins/db.ts` 는 앱이 닫힐 때(`onClose`) `db.destroy()` 로 연결 풀을 정리하는 일만 한다. 없으면 프로세스가 끝나지 않는다
- 단독 스크립트(`migrate.ts`, `seeds/index.ts`)도 `db/client.ts` 의 `db` 를 쓰고 끝나면 `destroy()` 한다

## 테스트

실제 DB 없이 repository 를 mock 으로 바꿔 끼운다. → [testing.md](testing.md)
