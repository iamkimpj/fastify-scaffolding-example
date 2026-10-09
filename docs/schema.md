<!-- docs/schema.md — 스키마와 타입 문서 -->

# 스키마와 타입 (TypeBox)

## 왜 TypeBox 인가

TypeBox 는 스키마를 **JSON Schema 그대로** 만든다. Fastify 는 원래 JSON Schema 로 검증(ajv)과 직렬화(fast-json-stringify)를 한다.
그래서 Zod 처럼 검증기를 갈아 끼울 필요가 없고, Swagger 에도 변환 없이 그대로 나간다.

- 패키지는 `typebox` (1.x). 예전 이름 `@sinclair/typebox` 가 아니다.
- 타입 연결은 `@fastify/type-provider-typebox`. `app.ts` 에서 `withTypeProvider<TypeBoxTypeProvider>()` 한 번.
- 검증기는 **Fastify 기본(ajv)** 을 쓴다. querystring/params 의 문자열 → 숫자 변환도 ajv 가 한다.
- ajv 는 **첫 오류에서 멈춘다** (`allErrors: false`, Fastify 기본값). 큰 본문 검증 비용을 막기 위해 유지한다.

## 스키마를 먼저, 타입은 거기서 뽑는다

타입을 손으로 따로 쓰지 않는다. 스키마와 타입을 **같은 이름**으로 둔다.

```ts
import Type, { type Static } from "typebox";

export const Example = Type.Object({
  id: Type.Integer(),
  title: Type.String(),
  createdAt: Type.String({ format: "date-time" }),
});

export type Example = Static<typeof Example>;
```

## 계약과 라우트 스키마는 다른 파일에 둔다

| | 파일 | 내용 | 누가 쓰나 |
|---|---|---|---|
| **계약** | `src/api-contracts/<기능>.contract.ts` | 요청·응답의 **모양** (`GetExampleParams`, `PostExampleRequest`, `GetExampleResponse` …) + 타입 | BE, **FE** |
| **라우트 스키마** | `src/modules/<기능>/<기능>.schema.ts` | 계약을 경로에 묶은 것 (`getExampleSchema`: tags, summary, params, response) | BE 만 |

계약은 FE 와 공유한다. 모듈 안에 두면 FE 가 가져갈 수 없으므로 `src/api-contracts/` 에 모은다.

### 계약 이름 — API(동작) 단위로 묶는다

동작 이름은 **controller 함수 이름의 PascalCase** 다 (`getExample` → `GetExample`).
같은 API 의 요청과 응답이 같은 접두사로 묶여, `GetExample*` 만 찾으면 그 API 의 계약이 다 나온다.

| 부분 | 이름 | 라우트 스키마에서 넣는 자리 |
|---|---|---|
| 경로 파라미터 | `<동작>Params` | `params` |
| 요청 | `<동작>Request` | GET 이면 `querystring`, 그 밖이면 `body` |
| 응답 (봉투 안의 `data`) | `<동작>Response` | `response[200]` 에 `Ok(...)` 로 감싸서 |
| 공용 리소스 | 명사 (`Example`) | 여러 응답의 부품 |

- **`Params` 는 경로 파라미터**(`/examples/:id` 의 `id`)다. 쿼리 파라미터(`?page=2`)가 아니다.
  한 API 에 둘이 함께 있을 수 있어(`GET /examples/:id?descriptionLength=10`) 이름을 나눈다
- 라우트 스키마의 키와 핸들러에서 꺼내는 이름이 다르다: `params` → `request.params`, **`querystring` → `request.query`**, `body` → `request.body`
- querystring 값은 모두 문자열로 오지만, 스키마가 `Integer` 면 Fastify(ajv)가 숫자로 바꿔 준다 (`"10"` → `10`)
- 요청은 query 와 body 를 나누지 않고 `Request` 하나다. **어디에 실릴지는 메서드가 정한다.**
  API 클라이언트도 대개 "요청 값 하나 + 응답 하나" 로 다루므로 그대로 대응된다
- 응답이 공용 리소스와 같으면 별칭으로 둔다. 그 API 의 응답만 달라지면 `...Response` 만 바꾼다
- `<동작>Response` 는 봉투 **안쪽**이다. 봉투까지 포함한 응답 본문 타입은 `Ok<GetExampleResponse>`

```ts
// src/api-contracts/example.contract.ts — 모양

// 공용 리소스
export const Example = Type.Object({ ... });
export type Example = Static<typeof Example>;

// GET /examples/:id?descriptionLength=10
export const GetExampleParams = Type.Object({ id: Type.Integer({ minimum: 1 }) });
export type GetExampleParams = Static<typeof GetExampleParams>;
export const GetExampleRequest = Type.Object({                 // GET → querystring
  descriptionLength: Type.Optional(Type.Integer({ minimum: 1, maximum: 1000 })),
});
export type GetExampleRequest = Static<typeof GetExampleRequest>;
export const GetExampleResponse = Example;
export type GetExampleResponse = Example;

// POST /examples
export const PostExampleRequest = Type.Object({ title: ..., description: ... });
export type PostExampleRequest = Static<typeof PostExampleRequest>;
export const PostExampleResponse = Example;
export type PostExampleResponse = Example;
```

```ts
// src/modules/example/example.schema.ts — 경로에 묶기. 이름은 <controller 함수 이름>Schema
import { ErrorResponse, GetExampleParams, GetExampleRequest, GetExampleResponse, Ok } from "@/api-contracts";

export const getExampleSchema = {
  tags: ["example"],
  summary: "예시 조회",
  params: GetExampleParams,      // 경로 파라미터 /examples/:id
  querystring: GetExampleRequest, // 쿼리 파라미터 ?descriptionLength=10 (스키마 키는 query 가 아니라 querystring)
  response: {
    200: Ok(GetExampleResponse), // 성공 봉투로 감싼다 → response-envelope.md
    404: ErrorResponse,         // 이 경로가 낼 수 있는 실패 (문서용)
  },
};
```

라우트 스키마 하나를 **두 곳에서** 쓴다.

```ts
// route — 등록 (런타임 검증·직렬화·Swagger)
app.get("/examples/:id", { schema: getExampleSchema }, exampleController.getExample);

// controller — 타입 (Handler<S>)
const getExample: Handler<typeof getExampleSchema> = async (request, reply) => ...;
```

## `Handler<S>` — controller 타입

route 와 controller 를 다른 파일에 두면, `app.get(...)` 이 하는 타입 추론이 controller 까지 오지 않는다.
그래서 controller 는 **반드시 `Handler<typeof 라우트스키마>` 로 선언**한다 (`src/lib/handler.ts`).

이렇게 하면 다음이 스키마 기준으로 타입 체크된다.

| 값 | 타입이 오는 곳 |
|---|---|
| `request.params` / `querystring` / `body` / `headers` | 스키마의 같은 키 |
| `reply.ok(data)` 의 `data` | `response[200]` 의 `Ok(X)` 에서 X |

```ts
// response: { 200: Ok(Type.Object({ n: Type.Number() })) } 인 경로에서
reply.ok({ n: 1 });    // ✅
reply.ok({ n: "x" });  // ❌ 컴파일 에러
```

실패 응답(`404: ErrorResponse`)을 함께 선언해도 `reply.ok` 의 타입 체크는 유지된다.
(`plugins/reply.ts` 의 `OkData` 가 성공 봉투만 골라낸다)

## 환경변수 스키마

`configs/env.config.ts` 도 TypeBox 로 검증한다. → [config.md](config.md)

## `src/api-contracts/` 규칙

**API 계약만 둔다.** 이름이 `contracts` 가 아니라 `api-contracts` 인 이유다.

| 둔다 | 두지 않는다 (있어야 할 곳) |
|---|---|
| 요청 params·querystring·body 모양 | 도메인 타입·상태 값 (모노레포: `packages/domain`) |
| 응답 `data` 모양 | DB 행 타입 (`src/db/types/`) |
| `ERROR_CODE` | 가드 신원·claim (`src/guards/`) |
| 봉투 `Ok` / `ErrorResponse` | 서버 내부 타입 (`Handler`, `Guard` … `src/lib/`) |

판단 기준은 **"HTTP 경계를 넘나?"** 다. "FE 도 쓰나?" 로 판단하면 결국 모든 타입이 여기로 모인다.
모노레포에서 여러 시스템의 타입이 한 패키지에 뒤섞이면 관리할 수 없게 된다.

- **`typebox` 와 `src/api-contracts` 만 import 한다.** Fastify·DB·`@/lib` 등을 import 하면 Biome lint 에러다.
  FE 가 서버 의존성 없이 가져다 쓸 수 있어야 하기 때문이다
- **앱은 `@/api-contracts`(index.ts) 에서만 import 한다.** 개별 파일(`@/api-contracts/example.contract`)을 직접 import 하지 않는다.
  모노레포가 되면 `@/api-contracts` → `@<scope>/api-contracts` 로 경로만 바뀐다
- 새 계약은 `<기능>.contract.ts` 로 만들고 `api-contracts/index.ts` 에 `export *` 한 줄을 추가한다
- 공통 계약: 봉투 `Ok` / `ErrorResponse` (`envelope.contract.ts`), `ERROR_CODE` (`error-code.contract.ts`)
- FE 는 타입으로도, 같은 스키마로 **런타임 검증**(`Value.Check(PostExampleRequest, form)`)으로도 쓸 수 있다
- 프론트가 별도 저장소면 `/docs/json`(OpenAPI)에서 타입을 생성하는 방법도 함께 쓸 수 있다

## API 모양과 DB 행은 다르다

데이터 스키마(`Example`)는 **API 로 내보내는 모양**이다. DB 행 타입(`ExampleRow`, `db/types/example.type.ts`)과 따로 둔다.
- 내보내지 않을 컬럼이 있을 수 있다 (비밀번호 해시 등)
- 타입이 다를 수 있다 (`createdAt`: DB 는 `Date`, API 는 ISO 문자열)

DB 행 → API 모양 변환은 service 가 한다 (`toExample(row)`). → [database.md](database.md)

