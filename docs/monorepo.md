<!-- docs/monorepo.md — 모노레포 문서 -->

# 모노레포로 옮길 때

이 스캐폴딩은 단일 앱이다. 서버가 여럿(관리자 서버, 사용자 서버, 스케줄러 …)이 되어 모노레포로 바꿀 때
**여러 앱이 함께 쓰는 것은 앱 위의 공용 패키지로** 올린다. 같은 DB·같은 API 계약을 앱마다 따로 두면 어긋난다.

## 목표 구조

```
packages/
├─ domain/          도메인 값 타입 (상태 enum 등). 아무것도 의존하지 않는다
├─ db/              테이블 타입, createDatabase(options), 마이그레이션, 시드        → domain
├─ api-contracts/   API 요청·응답 스키마, ERROR_CODE, 봉투 스키마 (프론트도 import)  → domain
└─ auth/            JWT 서명·검증
apps/
├─ <서버>/          repository, service, controller, route, plugins, guards, hooks, env
└─ <프론트>/        api-contracts 만 import
```

의존 방향은 **apps → packages** 한쪽으로만. 패키지끼리는 위 화살표 방향으로만.

## 지금 파일이 갈 곳

| 지금 | 갈 곳 | 옮기기 위한 준비 (지금 지켜 둔다) |
|---|---|---|
| `src/db/` 전체 (index, env, types, migrations, seeds, migrate) | `packages/db` | **`src/db/` 는 바깥을 import 하지 않는다** — Biome 로 강제됨. 그래서 디렉토리째 옮기면 된다 |
| `src/api-contracts/` 전체 (요청·응답 모양, `ERROR_CODE`, 봉투) | `packages/api-contracts` | **`typebox` 와 `src/api-contracts` 만 import 한다** — Biome 로 강제됨. 앱은 `@/api-contracts` 진입점에서만 import 하므로, 옮긴 뒤 경로만 `@<scope>/api-contracts` 로 바꾼다. 라우트 스키마 묶음(`modules/*/x.schema.ts`)은 앱에 남는다 |
| `lib/jwt.ts` | `packages/auth` | 환경변수를 읽지 않으므로 그대로 옮긴다 |
| repository, service, controller, route | `apps/<서버>` | 앱마다 쿼리·로직이 다르다 |
| `plugins/`, `hooks/`, `guards/`, `lib/handler.ts`, `lib/errors.ts`, `lib/guard.ts`, `configs/` | `apps/<서버>` | Fastify 에 묶인 것, 앱마다 다른 것 |

## 원칙

### 마이그레이션은 한 곳에서만
같은 DB 를 여러 앱이 쓰므로 마이그레이션은 `packages/db` 한 곳에만 둔다.
앱마다 두면 같은 DB 에 서로 다른 마이그레이션 이력이 쌓인다.

### 패키지는 환경변수를 읽지 않는다
`createDatabase(options)`, `signJwt(claims, { secret })` 처럼 **값을 인자로 받는다.** 환경변수를 읽는 것은 앱(진입점)이다.
앱마다 다른 설정으로 같은 패키지를 쓸 수 있어야 하기 때문이다.

예외: `packages/db` 의 단독 스크립트(마이그레이션·시드)는 그 자체가 진입점이므로 `db/env.ts` 로 환경변수를 읽는다.

### api-contracts 에는 API 계약만
HTTP 로 오가는 요청·응답 모양, `ERROR_CODE`, 봉투만 둔다. 도메인 타입은 `packages/domain`, DB 타입은 `packages/db`.
"FE 도 쓰니까" 로 넣기 시작하면 모든 시스템의 타입이 api-contracts 에 모여 관리할 수 없게 된다.

### repository 는 앱에 둔다
앱마다 필요한 쿼리가 다르다. 둘 이상의 앱이 **같은 쿼리**를 써야 할 때만 공용 패키지로 올린다.

### 계약(api-contracts)은 Fastify 를 모른다
TypeBox 스키마와 타입, 상수만 둔다. Fastify 라우트 스키마 묶음·`Handler` 타입·`reply.ok` 는 앱에 남는다.
그래야 프론트가 서버 의존성 없이 import 할 수 있다.

## 참고

실제 예: `bidstudy` 모노레포 (`packages/domain`, `packages/db`, `packages/api-contracts`, `packages/auth`, `apps/bo-be` …).
