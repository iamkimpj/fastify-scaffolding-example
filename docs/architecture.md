<!-- docs/architecture.md — 구조 문서 -->

# 구조

## 폴더

```
src/
├─ server.ts              # 진입점. buildApp() → listen, 종료 신호 처리
├─ app.ts                 # buildApp(). 플러그인과 모듈을 순서대로 등록 (listen 안 함 → 테스트에서 재사용)
├─ configs/
│  └─ env.config.ts       # 환경변수 검증. 타입 있는 env 객체
├─ db/                    # DB 인스턴스·테이블 타입·마이그레이션 → database.md
│  ├─ index.ts            # createDatabase(options), Database 타입
│  ├─ env.ts              # DB_* 환경변수 검증 (src/db 는 바깥을 import 하지 않는다)
│  ├─ client.ts           # 공용 인스턴스 db
│  ├─ transaction.ts      # executor() / transaction()
│  ├─ types/              # 테이블 타입. 테이블별 파일 + Db 인터페이스 (index.ts)
│  ├─ migrate.ts          # 마이그레이션 실행 (단독 스크립트)
│  ├─ migrations/         # 마이그레이션 파일
│  └─ seeds/              # 파트별 시드 + 실행기 (index.ts)
├─ api-contracts/         # BE·FE 공유 API 계약 (API 계약만). typebox 만 import → schema.md
│  ├─ index.ts            # 진입점. 앱은 @/api-contracts 에서만 import
│  ├─ envelope.contract.ts    # 응답 봉투 Ok(X), ErrorResponse
│  ├─ error-code.contract.ts  # ERROR_CODE
│  └─ example.contract.ts     # 예시 요청·응답 모양
├─ lib/                   # 여러 곳에서 쓰는 것만
│  ├─ errors.ts           # AppError
│  ├─ handler.ts          # controller 타입 Handler<S>
│  ├─ guard.ts            # Guard<T> 타입, bearerToken()
│  └─ jwt.ts              # signJwt / verifyJwt
├─ plugins/               # fastify-plugin 으로 감싼 앱 전역 기능
│  ├─ reply.ts            # reply.ok()
│  ├─ error-handler.ts    # 모든 오류 → 실패 봉투
│  ├─ security.ts         # cors, helmet
│  ├─ swagger.ts          # /docs
│  ├─ db.ts               # 앱 종료 시 DB 연결 정리
│  └─ auth.ts             # request.auth() / authOrFail()
├─ guards/                # 가드 정의와 등록부
│  ├─ index.ts
│  ├─ user.guard.ts
│  └─ admin.guard.ts
├─ hooks/                 # 라우트에 붙이는 훅. 실행 단계별 파일
│  └─ on-request.hook.ts  # onlyLogin(guard)
└─ modules/               # 기능 단위. 새 기능은 여기에 폴더 하나
   ├─ index.ts            # 모든 모듈 등록 (/api prefix)
   └─ example/            # 모든 계층을 갖춘 예시 모듈
      ├─ example.schema.ts      # 라우트 스키마 (계약을 경로에 묶기)
      ├─ example.route.ts
      ├─ example.controller.ts
      ├─ example.service.ts
      ├─ example.repository.ts
      └─ example.test.ts
```

### 무엇을 어디에 두나

| 폴더 | 기준 |
|---|---|
| `modules/<기능>/` | 그 기능에서만 쓰는 것. 다른 모듈이 import 하지 않는다 |
| `lib/` | **둘 이상의 곳에서 쓰는 것만.** 한 곳에서만 쓰면 그 파일 안에 둔다 (예: `toValidationMessage` 는 error-handler 안에 있다) |
| `api-contracts/` | **API 계약만**: HTTP 로 오가는 요청·응답 모양, `ERROR_CODE`, 봉투. `typebox` 만 import. 도메인·DB·내부 타입은 두지 않는다 |
| `plugins/` | 앱 전체에 붙는 기능 (데코레이터, 전역 핸들러, 외부 플러그인 설정) |
| `hooks/` | 라우트 옵션으로 경로마다 붙이는 훅 |
| `guards/` | 인증 방법 정의. [guards.md](guards.md) |

## 계층

```
HTTP 요청
  → <기능>.route.ts        URL·메서드·스키마·훅을 controller 에 연결만 한다
  → <기능>.controller.ts   요청에서 값을 꺼내 service 에 넘기고, 결과를 reply.ok() 로 보낸다
  → <기능>.service.ts      비즈니스 로직. Fastify 를 모른다. 실패는 AppError 를 throw
  → <기능>.repository.ts   DB 쿼리만
```

| 계층 | 한다 | 하지 않는다 |
|---|---|---|
| route | `app.get(path, { schema, onRequest }, controller.fn)` | 로직, 인라인 핸들러 |
| controller | `request.params/body/query` 꺼내기, `request.authOrFail()`, service 호출, `reply.ok()` | 비즈니스 로직, try/catch, `reply.status(4xx)` |
| service | 로직, DB 행 → API 모양 변환, 트랜잭션 경계(`transaction()`), repository 호출, `throw new AppError()` | `request`/`reply` 받기, Fastify import |
| repository | Kysely 쿼리. DB 는 `executor()` 로 가져온다 | 로직, 에러 판단 (없으면 `undefined` 를 돌려줄 뿐), 트랜잭션 열기 |
| schema | 라우트 스키마 묶음 (계약을 경로에 묶기) | 요청·응답 모양 정의 (→ `api-contracts/`), 로직 |

- **의존 방향은 한쪽으로만.** 아래 계층이 위 계층을 import 하지 않는다. 계층을 건너뛰지 않는다 (controller → repository 금지).
- **단순한 경로도 계층을 생략하지 않는다.** 로직이 한 줄이어도 route/controller/service/schema(+repository) 를 모두 둔다. 예외가 하나라도 있으면 그것이 "생략해도 된다"는 근거가 된다.

## 요청이 지나가는 순서

```
요청
 → onRequest 훅     (경로별) onRequestHook.onlyLogin("admin") — 본문 읽기 전에 인증 확인
 → 본문 파싱
 → 스키마 검증      실패 → error-handler → 400 INVALID_REQUEST
 → controller      → service → (repository)
 → reply.ok(data)  → 응답 스키마로 직렬화 → { isOk: true, data }

 어디서든 throw   → error-handler → { isOk: false, errorCode, errorMessage }
 경로 없음        → notFoundHandler → 404 ROUTE_NOT_FOUND
```

## app.ts 등록 순서

```ts
await app.register(reply);         // reply.ok — 모든 경로보다 먼저
await app.register(errorHandler);  // 실패 봉투
await app.register(security);      // cors, helmet
await app.register(swagger);       // 라우트보다 먼저 등록해야 라우트를 수집한다
await app.register(db);            // 앱 종료 시 DB 연결 정리
await app.register(auth);          // request.auth
await app.register(modules, { prefix: "/api" });
```

## 규칙

### 이름
파일·디렉토리·변수·타입 이름 규칙은 [naming.md](naming.md).
모듈 파일은 `<기능>.<역할>.ts` — `user.route.ts`, `user.controller.ts`, `user.service.ts`, `user.repository.ts`, `user.schema.ts`, `user.test.ts`.

### import
`@/` 는 `src/` 다. **상대경로(`./`, `../`)는 Biome lint 에러**로 막혀 있다.
확장자는 쓰지 않는다 (`moduleResolution: "Bundler"`).

```ts
import exampleService from "@/modules/example/example.service"; // ✅
import exampleService from "./example.service";                 // ❌ lint 에러
```

### export
controller, service, 훅은 **함수들을 객체로 묶어 default export** 한다.
쓰는 쪽에서 `exampleController.getExample` 처럼 **어느 파일에서 왔는지가 이름에 드러나게** 하기 위함이다.

```ts
const getExample: Handler<typeof getExampleSchema> = async (request, reply) => ...;

export default {
  getExample,
};
```

스키마와 타입은 named export (`export const Example`, `export type Example`).

## 새 기능 추가 순서

1. `api-contracts/<기능>.contract.ts` — 요청·응답 모양 (+ `api-contracts/index.ts` 에 등록). 새 실패 사유면 `api-contracts/error-code.contract.ts` 의 `ERROR_CODE` 에 추가
2. `modules/<기능>/<기능>.schema.ts` — 라우트 스키마 (계약을 경로에 묶기)
3. `<기능>.repository.ts` — 쿼리 (DB 가 필요하면). 새 테이블이면 마이그레이션과 `db/types/<테이블>.type.ts` 먼저 → [database.md](database.md)
4. `<기능>.service.ts` — 로직, 실패는 `AppError`
5. `<기능>.controller.ts` — `Handler<typeof xxxSchema>`
6. `<기능>.route.ts` — 연결, 보호가 필요하면 `onRequest: onRequestHook.onlyLogin("<가드>")`
7. `modules/index.ts` — `await app.register(xxxRoute)` 한 줄
8. `<기능>.test.ts` — `app.inject()`
