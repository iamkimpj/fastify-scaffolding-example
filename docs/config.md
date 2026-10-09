<!-- docs/config.md — 설정과 실행 문서 -->

# 설정과 실행

## 환경변수 (`src/configs/env.config.ts`)

`process.env` 를 TypeBox 스키마로 검증해 **타입 있는 `env` 객체**로 내보낸다. 코드에서 `process.env` 를 직접 읽지 않는다 (예외: DB 접속 정보를 읽는 `src/db/env.ts`).

```ts
import { env, isProduction } from "@/configs/env.config";
env.PORT; // number
```

| 변수 | 기본값 | 설명 |
|---|---|---|
| `NODE_ENV` | `development` | `development` / `production` / `test` |
| `HOST` | `0.0.0.0` | |
| `PORT` | `3000` | |
| `LOG_LEVEL` | `info` | pino 레벨 |
| `CORS_ORIGINS` | `""` | 쉼표 구분. 비우면 전체 허용 (개발용) |
| `SWAGGER_ENABLED` | `true` | `false` 면 `/docs` 꺼짐 (운영 권장) |
| `USER_JWT_SECRET` | **없음** | 32자 이상. user 가드용 |
| `ADMIN_JWT_SECRET` | **없음** | 32자 이상. admin 가드용 |
| `DB_HOST` | `localhost` | **`src/db/env.ts` 가 검증** (아래) |
| `DB_PORT` | `3306` | |
| `DB_NAME` | **없음** | 엉뚱한 DB 에 붙지 않도록 기본값을 두지 않는다 |
| `DB_USER` | **없음** | |
| `DB_PASSWORD` | **없음** | 빈 문자열은 허용 |

`DB_*` 는 `configs/env.config.ts` 의 `env` 객체에 없다. `src/db` 가 바깥을 import 하지 않도록 `src/db/env.ts` 가 따로 검증한다 → [database.md](database.md)

- **기본값이 없는 값이 빠지면 서버가 뜨지 않는다.** 틀린 설정으로 떠서 나중에 터지는 것보다 낫다.
- 비밀키 생성: `openssl rand -base64 48`
- 처리 순서: 기본값 채움 → 타입 변환(`"3000"` → `3000`) → 스키마에 없는 키 제거 → 검증.
  typebox 1.x 의 `Value.Parse` 는 기본 설정에서 값을 보정하지 않아 단계를 직접 밟는다.
- vitest 에서는 `process.env` 가 Proxy 라 `{ ...process.env }` 로 복사한 뒤 처리한다.
- 앱(`buildApp`) 밖에서도 import 할 수 있다. 마이그레이션 스크립트 같은 단독 실행 파일에서도 같은 `env` 를 쓴다.

### 환경변수 파일

| 파일 | 쓰는 곳 | git |
|---|---|---|
| `.env.example` | 항목 목록 (값 없음) | 올림 |
| `.env.local` | `npm run dev` | 제외 |
| `.env` | `npm start` (서버) | 제외 |
| `vitest.config.ts` 의 `test.env` | 테스트 (테스트 전용 값) | 올림 |

## 스크립트

| 명령 | 하는 일 |
|---|---|
| `npm run dev` | `tsx watch` 로 개발 서버 (`.env.local`) |
| `npm run build` | `typecheck` + `check` 후 tsup 번들 → `dist/server.js` |
| `npm start` | `node dist/server.js` (`.env`) |
| `npm run typecheck` | `tsc --noEmit` |
| `npm run check` / `check:fix` | Biome lint + format |
| `npm test` / `test:run` / `coverage` | Vitest |
| `npm run db:migrate` / `db:migrate:down` | 마이그레이션 up(최신까지) / down(한 단계) (`.env.local`) |
| `npm run db:seed` / `db:seed -- <파트>` | 개발용 초기 데이터. 전부 / 한 파트만 (`.env.local`) |

## 도구 선택과 이유

| 도구 | 이유 / 주의 |
|---|---|
| **TypeScript 6.0.x** | 7.0 (Go 포트) 은 tsup·vitest 호환이 확인되지 않아 6 으로 고정 |
| **tsup** | 번들 시 `@/` alias 를 풀어준다. 런타임 alias 설정이 필요 없다 |
| **tsx** | 개발 실행. tsconfig `paths` 를 읽는다 |
| **Biome** | lint + format 하나로. 상대경로 import 를 `noRestrictedImports` 로 막는다. 설정 파일은 헤더 주석을 위해 `biome.jsonc` |
| **Vitest** | `resolve.tsconfigPaths` 로 alias 해석 |
| **jose** | JWT. `@fastify/jwt` 대신 — 가드가 driver 를 자유롭게 고르도록 Fastify 에 묶이지 않는 도구를 쓴다 |
| **npm** | npm 11 이 esbuild 의 설치 스크립트를 막는다는 경고가 뜨지만 동작에는 문제없다 |

## Swagger

- `/docs` (UI), `/docs/json` (OpenAPI)
- 라우트 스키마의 `tags`, `summary`, `response` 가 그대로 나온다
- helmet 의 CSP 는 꺼 두었다 (swagger-ui 가 인라인 스크립트를 쓴다)
