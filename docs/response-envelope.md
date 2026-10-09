<!-- docs/response-envelope.md — 응답 봉투 문서 -->

# 응답 봉투

모든 경로가 **같은 모양**으로 답한다. 클라이언트는 `isOk` 로 성공·실패를 가르고, 실패면 `errorCode` 로 분기한다.

## 모양

```jsonc
// 성공 — 항상 200
{ "isOk": true, "data": { ... } }

// 실패
{
  "isOk": false,
  "errorCode": "UNAUTHORIZED",          // ERROR_CODE 에 선언된 값만
  "errorMessage": "로그인이 필요합니다",   // 개발자가 읽는 문구
  "data": { ... }                        // 덧붙일 것이 있을 때만. 없으면 키 자체가 없다
}
```

- **`errorCode` 는 화면이 분기할 값**, `errorMessage` 는 개발자가 읽는 값이다.
  사용자에게 보일 문구는 화면이 `errorCode` 로 정한다. 서버 문구를 그대로 띄우면 문구 하나 고치려고 서버를 배포해야 한다.
- 같은 404 라도 `ROUTE_NOT_FOUND`(그런 경로가 없다)와 `USER_NOT_FOUND`(경로는 맞는데 대상이 없다)는 화면이 할 일이 다르다. 상태 코드만으로는 구분할 수 없어서 `errorCode` 를 둔다.

## 누가 무엇을 만드나

| 응답 | 만드는 곳 | 코드에서 하는 일 |
|---|---|---|
| 성공 | `plugins/reply.ts` 의 `reply.ok(data)` | controller 에서 `return reply.ok(result)` |
| 실패 | `plugins/error-handler.ts` | service 에서 `throw new AppError(...)` → [error-handling.md](error-handling.md) |

**controller 에서 실패 응답을 직접 보내지 않는다.** (`reply.status(404).send(...)` 금지)
실패는 전부 throw 로 올려 error-handler 한 곳에서 봉투로 만든다. 그래야 모양이 어긋날 자리가 없다.

## 라우트에 선언하기 (`src/api-contracts/envelope.contract.ts`)

봉투 모양은 FE 도 알아야 하므로 **계약**이다. `import { ErrorResponse, Ok } from "@/api-contracts"`.

### `Ok(X)` — 성공 봉투 스키마

```ts
response: {
  200: Ok(GetExampleResponse),
}
```

반드시 `Ok()` 로 감싼다. 감싸야 하는 이유:
- Swagger 에 실제 응답 모양(`{ isOk, data }`)이 나온다
- `reply.ok(data)` 의 `data` 가 `GetExampleResponse` 로 타입 체크된다 → [schema.md](schema.md)
- 응답이 스키마 기준으로 직렬화된다. **스키마에 없는 필드는 응답에서 빠진다** (비밀번호 해시 같은 값이 새지 않는다)

### `Ok<T>` — 성공 봉투 타입

스키마 함수 `Ok(X)` 와 **같은 이름의 타입**도 있다 (TypeBox 스키마는 타입으로 취급하는 규칙).
FE 가 응답 본문 전체의 타입을 적을 때 쓴다.

```ts
import type { Ok, GetExampleResponse } from "@/api-contracts";

type Body = Ok<GetExampleResponse>; // { isOk: true; data: GetExampleResponse }
```

### `ErrorResponse` — 실패 봉투 스키마

그 경로가 낼 수 있는 실패를 **문서에 밝힐 때** 쓴다.

```ts
response: {
  200: Ok(GetExampleResponse),
  404: ErrorResponse,   // EXAMPLE_NOT_FOUND
}
```

- 선언하지 않아도 실패 응답은 error-handler 가 똑같이 보낸다. 차이는 **Swagger 에 보이느냐**뿐이다.
- 클라이언트가 OpenAPI(`/docs/json`)로 타입을 생성한다면 실패 응답 타입도 함께 생긴다.
- `ErrorResponse` 의 `errorCode` 는 `ERROR_CODE` 값만 허용하는 enum 이다. 실패 봉투 타입(`type ErrorResponse`)도 이 스키마에서 뽑는다.

## `reply.ok` 구현 메모

- `decorateReply` 로 붙인다. Fastify 는 reply 를 `this` 로 넘기므로 화살표 함수가 아니라 `function` 으로 쓴다.
- 타입은 `FastifyReply` 를 같은 제네릭으로 확장해, 라우트 스키마에서 추론된 `ReplyType` 으로 `data` 를 제한한다.
- 실패용 `reply.error()` 는 **두지 않는다.** 실패는 throw 로만.
