<!-- docs/error-handling.md — 에러 처리 문서 -->

# 에러 처리

## 한 줄 요약

**service 는 `throw new AppError(상태, ERROR_CODE.X, 문구)` 만 한다.** 봉투로 바꾸는 일은 `plugins/error-handler.ts` 가 전부 맡는다.
controller 에는 try/catch 를 두지 않는다.

```ts
// user.service.ts
if (!user) {
  throw new AppError(404, ERROR_CODE.USER_NOT_FOUND, "유저가 없습니다");
}

// 덧붙일 정보가 있으면 4번째 인자 → 응답의 data
throw new AppError(409, ERROR_CODE.EMAIL_TAKEN, "이미 쓰는 이메일입니다", { field: "email" });
```

왜 throw 인가:
- service 가 Fastify(`reply`)를 몰라도 된다 → 서버 없이 테스트할 수 있다
- controller 에 try/catch 가 없으니 controller 모양이 모두 같아진다
- 실패 응답을 만드는 곳이 한 군데라 모양이 어긋나지 않는다

## `ERROR_CODE` (`src/api-contracts/error-code.contract.ts`)

FE 가 `errorCode` 로 분기하므로 **계약**이다. `@/api-contracts` 에서 import 한다.

```ts
export const ERROR_CODE = {
  UNAUTHORIZED: "UNAUTHORIZED",
  INVALID_REQUEST: "INVALID_REQUEST",
  ROUTE_NOT_FOUND: "ROUTE_NOT_FOUND",
  INTERNAL_ERROR: "INTERNAL_ERROR",
} as const;
```

- `AppError` 와 `ErrorResponse` 는 **여기 선언된 값만** 받는다. 임의 문자열은 컴파일 에러.
- 값은 키와 같게 둔다. 네트워크 탭에 뜬 문자열로 코드를 바로 검색할 수 있다.
- **쓰는 곳이 없는 코드는 미리 만들지 않는다.** 새 실패 사유가 생기면 그때 추가한다.
- 각 코드에 "무엇을 뜻하는지" 주석을 단다. 비슷한 코드와 어떻게 다른지가 중요하다.

## error-handler 가 오류를 나누는 순서

| 순서 | 오류 | 상태 | errorCode | errorMessage |
|---|---|---|---|---|
| 1 | `AppError` | 들고 온 값 | 들고 온 값 | 들고 온 값 (+ `data`) |
| 2 | 스키마 검증 실패 (`error.validation`) | 400 | `INVALID_REQUEST` | 자동 생성 (아래) |
| 3 | Fastify 가 4xx 로 판단한 것 (깨진 JSON, content-type 불일치, 본문 초과) | 들고 온 값 | `INVALID_REQUEST` | Fastify 문구 |
| 4 | 그 밖의 모든 것 | 500 | `INTERNAL_ERROR` | 운영: 고정 문구 / 개발: 원래 메시지 |
| - | 등록되지 않은 경로 (`setNotFoundHandler`) | 404 | `ROUTE_NOT_FOUND` | 고정 문구 |

- **상태 코드는 오류가 들고 온 것을 살린다.** 무조건 500 으로 덮으면 "보낸 쪽 잘못(4xx)" 과 "서버 고장(5xx)" 을 구분할 수 없다.
- **로그는 500 일 때만** 남긴다. 4xx 까지 error 로그를 남기면 보낸 쪽 실수가 서버 오류 로그를 채운다.
- 404 문구에 **요청 주소를 넣지 않는다.** 받은 값을 그대로 되비추는 자리를 만들지 않는다.
- `setErrorHandler` 와 `setNotFoundHandler` 는 짝이다. 경로를 못 찾으면 핸들러에 들어가지 않아 오류가 생길 자리가 없으므로, 따로 잡지 않으면 없는 경로만 봉투 밖으로 나간다.

## 검증 실패 문구 (`toValidationMessage`)

스키마 검증에 실패하면 ajv 오류 목록을 **필드당 한 줄**로 줄여 `errorMessage` 에 넣는다. error-handler 안에만 있다 (export 하지 않음).

왜 필요한가: 검증기는 `Type.Union` 분기마다 오류를 하나씩 낸다. 값 하나가 틀렸을 뿐인데 같은 말이 여러 번 반복되고,
숫자를 보냈는데 `must be number` 같은 엉뚱한 문구가 섞이기도 한다.

```
?pageSize=7  (pageSize: Union[10, 20, 50])

원본:  querystring/pageSize must be equal to constant, querystring/pageSize must be equal to constant,
       querystring/pageSize must be equal to constant, querystring/pageSize must match a schema in anyOf
정리:  pageSize must be one of the allowed values
```

규칙:
- 필드별로 첫 오류 하나만
- Union 분기 **안의** 오류는 버리고, `anyOf`/`const`/`enum` 실패는 `must be one of the allowed values` 한 줄로
- 허용값은 나열하지 않는다 (스키마·Swagger 에 있다)
- 필수 값 누락은 검증기 문구 그대로 (`must have required property 'email'`)
- **영어 그대로.** 사용자에게 보일 값이 아니라 보낸 쪽 개발자가 무엇을 잘못 보냈는지 알아보는 값이다

**service 가 던지는 `AppError` 의 문구와는 관계없다.** 그 문구는 개발자가 직접 쓴다.
