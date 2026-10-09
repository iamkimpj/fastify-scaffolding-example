<!-- docs/testing.md — 테스트 문서 -->

# 테스트

## 기본 방식

- 테스트 파일은 **대상 파일 옆에** `<이름>.test.ts` 로 둔다.
- HTTP 동작은 `buildApp()` + `app.inject()` 로 확인한다. 실제 포트를 열지 않는다.
- `buildApp()` 이 `listen` 하지 않는 이유가 이것이다 (`listen` 은 `server.ts` 만).

```ts
import { afterAll, beforeAll, describe, expect, it, vi } from "vitest";
import { type App, buildApp } from "@/app";
import exampleRepository from "@/modules/example/example.repository";

describe("GET /api/examples/:id", () => {
  let app: App;

  beforeAll(async () => {
    app = await buildApp();
  });

  afterAll(async () => {
    await app.close();
  });

  it("없으면 404 EXAMPLE_NOT_FOUND", async () => {
    vi.spyOn(exampleRepository, "findById").mockResolvedValue(undefined);

    const res = await app.inject({ method: "GET", url: "/api/examples/999" });

    expect(res.statusCode).toBe(404);
    expect(res.json()).toMatchObject({ isOk: false, errorCode: "EXAMPLE_NOT_FOUND" });
  });
});
```

## 응답은 봉투째 확인한다

상태 코드만 보지 않고 **봉투 모양까지** 확인한다. 실패면 `errorCode` 를 꼭 본다.

```ts
expect(res.statusCode).toBe(401);
expect(res.json()).toMatchObject({ isOk: false, errorCode: "UNAUTHORIZED" });
```

## 플러그인·훅 테스트 — 테스트 전용 경로

플러그인이나 훅처럼 실제 경로가 없는 것은 `buildApp()` 뒤에 **테스트 안에서만 쓰는 경로**를 등록해 확인한다.
`/test/...` 로 시작하게 둔다. 등록이 끝나면 `await app.ready()`.

```ts
beforeAll(async () => {
  app = await buildApp();

  app.get("/test/admin", { onRequest: onRequestHook.onlyLogin("admin") }, async (request) => ({
    admin: await request.authOrFail("admin"),
  }));

  await app.ready();
});
```

예: `plugins/error-handler.test.ts`, `plugins/auth.test.ts`, `hooks/on-request.hook.test.ts`

## export 하지 않은 함수

파일 안에만 있는 함수(예: error-handler 의 `toValidationMessage`)는 테스트를 위해 export 하지 않는다.
그 함수를 거치는 요청을 `inject` 로 보내 결과로 확인한다.

## 인증이 필요한 요청

`signJwt` 로 테스트 토큰을 만든다. 비밀키는 `env` 에서 읽는다 (vitest 설정의 테스트 전용 값).

```ts
const token = await signJwt({ sub: "a1", role: "super" }, {
  secret: env.ADMIN_JWT_SECRET,
  expiresInSeconds: 60,
});

await app.inject({ url: "/test/admin", headers: { authorization: `Bearer ${token}` } });
```

## 호출 횟수 확인

가드 캐시처럼 "몇 번 실행됐나" 를 볼 때는 등록부 객체에 `vi.spyOn` 을 건다.
`request.auth` 가 `guards[name]` 을 호출 시점에 읽기 때문에 spy 가 걸린다.

```ts
const spy = vi.spyOn(guards, "admin");
// ... 요청
expect(spy).toHaveBeenCalledTimes(1);
spy.mockRestore();
```

## DB 가 필요한 모듈 — repository 를 mock 으로

이 저장소에는 실제 DB 가 없다. 모듈 테스트는 **repository 를 `vi.spyOn` 으로 바꿔 끼워** route → controller → service 흐름만 확인한다.
repository 는 default export 객체라 spy 가 걸린다. `afterEach(() => vi.restoreAllMocks())` 로 매번 되돌린다.

```ts
vi.spyOn(exampleRepository, "findById").mockResolvedValue(row);       // 있음
vi.spyOn(exampleRepository, "findById").mockResolvedValue(undefined); // 없음 → 404
```

트랜잭션을 쓰는 service 는 `app.db.transaction` 을 흉내 낸다. 같은 db 로 콜백을 바로 실행한다.

```ts
vi.spyOn(app.db, "transaction").mockReturnValue({
  execute: (fn: (trx: Database) => Promise<unknown>) => fn(app.db),
} as unknown as ReturnType<Database["transaction"]>);
```

DB 연결 풀은 첫 쿼리 때 접속하므로, mock 이 모든 쿼리를 막으면 DB 없이도 테스트가 돈다.
**실제 쿼리가 맞는지**는 DB 가 있는 프로젝트에서 repository 테스트를 따로 둬 확인한다.

예: `modules/example/example.test.ts`

## 확인하지 않는 것

- 운영(`NODE_ENV=production`)에서 500 문구를 숨기는 동작. `isProduction` 이 모듈 로드 시 한 번 정해져 테스트 안에서 바꿀 수 없다.
