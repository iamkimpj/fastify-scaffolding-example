<!-- docs/guards.md — 가드 문서 -->

# 가드 (인증)

Laravel 의 guard 개념을 가져왔다. 한 서버에 **이름 붙은 가드 여러 개**(`user`, `admin`)를 두고,
경로와 코드에서 가드 이름으로 고른다. Fastify 에는 같은 개념의 공식 플러그인이 없어 직접 얇게 구현했다.

| Laravel | 여기 |
|---|---|
| `config/auth.php` 의 guards | `src/guards/index.ts` 등록부 |
| guard driver (session, token …) | `src/guards/<이름>.guard.ts` 함수 하나 |
| `Auth::guard('admin')->user()` | `await request.auth("admin")` |
| `...->userOrFail()` | `await request.authOrFail("admin")` |
| `middleware('auth:admin')` | `{ onRequest: onRequestHook.onlyLogin("admin") }` |

## 세 가지 역할

| | 하는 일 | 막나? | 어디서 |
|---|---|---|---|
| **가드** | 요청 → 신원 또는 `null` | 안 막음 | `guards/*.guard.ts` |
| **`request.auth(g)`** | 가드를 실행하고 결과를 **요청 단위로 캐시**. `Identity \| null` | 안 막음 | 로그인이 선택인 경로의 controller |
| **`request.authOrFail(g)`** | `auth` 와 같고, null 이면 401 `AppError`. `Identity` (null 아님) | 막음 | 로그인이 필수인 경로의 controller |
| **`onRequestHook.onlyLogin(g)`** | `authOrFail` 을 부르기만 하는 훅 | 막음 | route 옵션 |

## 쓰는 법

```ts
// route — 이 경로는 admin 로그인이 필요하다고 선언
app.get(
  "/admin/users",
  { onRequest: onRequestHook.onlyLogin("admin"), schema: listUsersSchema },
  adminController.listUsers,
);

// controller — 신원을 null 없이 꺼낸다 (onlyLogin 이 이미 확인해 캐시에 있다)
const listUsers: Handler<typeof listUsersSchema> = async (request, reply) => {
  const admin = await request.authOrFail("admin"); // AdminIdentity
  return reply.ok(await adminService.listUsers(admin));
};
```

로그인이 선택인 경로:

```ts
const user = await request.auth("user"); // UserIdentity | null
```

## onlyLogin 과 authOrFail 을 둘 다 두는 이유

판단 로직은 같다 (`authOrFail` 한 곳에만 있고 `onlyLogin` 은 그것을 부른다). 역할이 다르다.

- **`onlyLogin`** 은 route 선언에 보호 여부를 드러내고, **본문을 읽기 전**(onRequest)에 거절한다.
  핸들러 안에서만 막으면 로그인하지 않은 요청도 본문 파싱·스키마 검증을 다 거친 뒤 거절되고, 401 대신 400 을 먼저 받을 수도 있다.
- **`authOrFail`** 은 controller 에서 **null 없는 타입**으로 신원을 꺼내기 위해 있다.
  `onlyLogin` 을 통과했다는 사실을 타입 시스템은 모르므로, `request.auth()` 를 쓰면 `admin!` 단언이 필요해진다.

**보호 경로 = route 에 `onlyLogin` + controller 에서 `authOrFail`.** 둘 중 하나만 쓰지 않는다.

## 캐시

- **요청 하나 동안만** 유지된다. 요청 객체를 키로 한 `WeakMap` 이라 요청이 끝나면 사라진다.
- 가드별로 **처음 부를 때 한 번만** 가드를 실행한다. `onlyLogin` 에서 실행했다면 controller 의 `authOrFail` 은 캐시를 돌려준다.
- **인증 실패(null)도 캐시**한다. 같은 요청에서 실패한 토큰을 다시 검증하지 않는다.
- 결과가 아니라 **Promise 를 캐시**한다. 동시에 두 번 불려도 가드는 한 번만 돈다.

## 가드 만들기

가드는 `Guard<TIdentity>` = `(request) => Promise<TIdentity | null>` 함수 하나다.

```ts
// guards/admin.guard.ts
export const AdminClaims = Type.Object({
  sub: Type.String(),
  role: Type.Union([Type.Literal("super"), Type.Literal("staff")]),
});

export type AdminIdentity = { id: string; role: AdminClaims["role"] };

const adminGuard: Guard<AdminIdentity> = async (request) => {
  const token = bearerToken(request);
  if (!token) return null;

  const claims = await verifyJwt(token, { secret: env.ADMIN_JWT_SECRET, claims: AdminClaims });
  if (!claims) return null;

  return { id: claims.sub, role: claims.role };
};
```

규칙:
- **막지 않는다.** 인증 실패는 `null`. 차단은 `authOrFail` / `onlyLogin` 의 일이다.
- **인증 실패만 null 로 바꾼다.** DB 장애 같은 다른 오류까지 삼키면 500 이어야 할 상황이 401 로 보인다. (`verifyJwt` 도 jose 오류만 null 로 바꾼다)
- **claim 을 스키마로 검증한다.** 서명이 맞아도 모양이 다르면 null.
- **가드마다 비밀키를 따로 쓴다** (`USER_JWT_SECRET`, `ADMIN_JWT_SECRET`). 그래야 user 토큰으로 admin 경로를 지나갈 수 없다.
- 신원 타입(`AdminIdentity`)은 claim 이 아니라 **controller 가 쓰기 좋은 모양**으로 정한다.
- 계정 상태·세션을 DB 로 확인해야 하면 가드 안에서 repository 를 부른다. 캐시 덕에 요청당 한 번만 조회한다.

### 등록

```ts
// guards/index.ts
export const guards = {
  user: userGuard,
  admin: adminGuard,
} satisfies Record<string, Guard<unknown>>;
```

키가 가드 이름이다. 등록하면 바로:
- `request.auth("<이름>")` 의 이름이 타입으로 제한된다 (오타는 컴파일 에러)
- 반환 타입이 그 가드의 신원 타입으로 추론된다

### driver 를 바꿀 때

가드 함수 안만 바꾼다. JWT → 세션, API Key 등으로 바꿔도 `Guard<T>` 모양만 지키면
`request.auth` / `onlyLogin` / controller 는 바뀌지 않는다.

## 보호 경로를 고르는 방식

경로는 **route 옵션으로** 고른다. `request.url` 문자열로 고르지 않는다.
라우터가 디코드한 경로와 날문자열이 달라 `/%61dmin` 같은 요청이 문자열 검사를 지나갈 수 있다.

## 토큰 발급

`signJwt(claims, { secret, expiresInSeconds })` (`src/lib/jwt.ts`). claim 은 가드의 `XxxClaims` 스키마를 따른다.
로그인 경로 예시는 아직 없다. 가드로 보호한 경로 예시는 `POST /api/examples` (`modules/example/`).
