<!-- docs/naming.md — 이름 규칙 문서 -->

# 이름 규칙

## 기본 규칙

| 대상 | 규칙 | 예 |
|---|---|---|
| 디렉토리 | kebab-case. 바로 아래가 같은 목적의 반복이면 복수형, 목적이 서로 다르면 단수형 | `plugins/`, `db/seeds/`, `modules/user-life/` |
| 파일 | kebab-case. 주요 역할이 있으면 `.` 으로 구분 | `error-handler.ts`, `user-life.controller.ts`, `on-request.hook.ts` |
| 변수·함수 | camelCase | `bearerToken`, `verifyJwt`, `getExample` |
| 타입·인터페이스 | PascalCase | `AdminIdentity`, `Handler`, `ErrorCode` |
| 클래스 | PascalCase | `AppError` |
| 상수·환경변수 | UPPER_SNAKE_CASE | `ERROR_CODE`, `FALLBACK`, `ADMIN_JWT_SECRET` |

### 약어

[Google TypeScript Style Guide](https://google.github.io/styleguide/tsguide.html#identifiers) 와 같다.
**약어도 한 단어처럼 쓴다.** 첫 글자만 대문자(PascalCase·camelCase 안에서)거나 전부 소문자다.

| ✅ | ❌ |
|---|---|
| `verifyJwt`, `signJwt` | `verifyJWT`, `signJWT` |
| `loadHttpUrl` | `loadHTTPURL` |
| `userId`, `apiKey` | `userID`, `APIKey` |
| `Db`, `JwtClaims` | `DB`, `JWTClaims` |

- 대문자가 이어지면 단어 경계가 안 보인다 (`HTTPURL` 은 어디서 끊기나?)
- **예외: 플랫폼·라이브러리가 정한 이름은 그대로 쓴다** — `toISOString`, `fileURLToPath`, `SignJWT`, `JOSEError`, `XMLHttpRequest`
- UPPER_SNAKE_CASE(상수·환경변수)는 원래 전부 대문자이므로 해당 없다 — `USER_JWT_SECRET`, `DB_HOST`
- 제네릭 타입 파라미터의 `T` 접두사는 약어가 아니다 — `TSchema`, `TReply`

### 디렉토리의 단수·복수

**바로 아래(한 단계)에 무엇이 들어 있는지**로 정한다.

- **같은 목적의 파일·디렉토리가 반복되면 복수형**
- **목적이 서로 다른 파일·디렉토리가 모여 있으면 단수형**
- **`index.ts` 는 세지 않는다.** 그 디렉토리 자체의 기능(등록부, 실행기)이지 하위 항목이 아니다

| 디렉토리 | 바로 아래 | 판단 |
|---|---|---|
| `src/plugins/` | `reply.ts`, `error-handler.ts`, `auth.ts` … | 모두 플러그인 → 복수 |
| `src/configs/` | `env.config.ts` (+ `<목적>.config.ts` …) | 모두 설정 → 복수 |
| `src/guards/` | `user.guard.ts`, `admin.guard.ts` (+ `index.ts` 등록부) | 모두 가드 → 복수 |
| `src/hooks/` | `on-request.hook.ts` … | 모두 훅 → 복수 |
| `src/modules/` | `example/`, `user/` … (+ `index.ts` 등록부) | 모두 기능 모듈 → 복수 |
| `src/db/types/` | `example.type.ts` … (+ `index.ts` Db 인터페이스) | 모두 테이블 타입 → 복수 |
| `src/db/seeds/` | `example.seed.ts` … (+ `index.ts` 실행기) | 모두 시드 → 복수 |
| `src/db/migrations/` | `2026-10-08-001-create-examples.ts` … | 모두 마이그레이션 → 복수 |
| `docs/` | `architecture.md`, `naming.md` … | 모두 문서 → 복수 |
| `src/modules/example/` | `.route.ts`, `.controller.ts`, `.service.ts` … | 역할이 다 다름 → 단수 |
| `src/db/` | `index.ts`, `migrate.ts`, `types/`, `migrations/`, `seeds/` | 다 다름 → 단수 |
| `src/lib/` | `errors.ts`, `handler.ts`, `jwt.ts` … | 다 다름 → 단수 |
| `src/api-contracts/` | `example.contract.ts`, `envelope.contract.ts` … (+ `index.ts` 진입점) | 모두 계약 → 복수 |

반복되는 파일은 보통 `<이름>.<목적>.ts` 모양이다 (`env.config.ts`, `admin.guard.ts`, `example.seed.ts`).
목적이 이름에 붙어 있으니 "같은 목적이 반복된다" 가 파일 이름으로 드러난다.

### 파일이 kebab-case 인 이유

macOS(기본 설정)·Windows 파일 시스템은 대소문자를 구분하지 않고, Linux(배포 서버, CI)는 구분한다.
`userService.ts` → `UserService.ts` 처럼 대소문자만 바꾸면 로컬에서는 멀쩡하다가 서버에서 import 가 깨진다.
전부 소문자로 두면 이런 사고가 생기지 않는다.

Fastify 훅 이름(`onRequest`)처럼 원래 camelCase 인 것도 파일 이름에서는 kebab-case 로 쓴다 → `on-request.hook.ts`.

## 예외: TypeBox 스키마는 타입으로 취급한다

TypeBox 스키마는 `const` 지만 **쓰임이 타입에 가까우므로 PascalCase** 로 쓰고, `Static` 으로 뽑은 타입과 **같은 이름**을 쓴다.

```ts
export const Example = Type.Object({ ... });  // 스키마 (값)
export type Example = Static<typeof Example>;  // 타입
```

- `Schema` 접미사를 붙이지 않는다 (`EnvSchema` ❌ → `Env` ✅)
- 스키마를 만드는 함수도 같다: `Ok(X)`
- 단, **라우트 스키마**(`{ params, body, response }` 묶음)는 TypeBox 스키마가 아니라 설정 객체이므로 camelCase: `getExampleSchema` (아래)

## 상수의 범위

UPPER_SNAKE_CASE 는 다음만 쓴다.

- 원시 값 리터럴: `const FALLBACK = "request is invalid"`
- `as const` 조회표: `ERROR_CODE`

그 밖의 모듈 최상위 `const` — 설정·등록부·인스턴스·함수 — 는 camelCase.

```ts
export const ERROR_CODE = { ... } as const;  // 조회표 → UPPER
const ONE_OF_ALLOWED = "must be one of ...";  // 리터럴 → UPPER
export const guards = { user, admin };        // 등록부 → camel
export const env = loadEnv(process.env);      // 설정 객체 → camel
const cache = new WeakMap();                  // 인스턴스 → camel
```

`ERROR_CODE` 의 키와 값도 UPPER_SNAKE_CASE 이고, 값은 키와 같다.
도메인 코드는 `<대상>_<상태>`: `EXAMPLE_NOT_FOUND`.

## 역할별 세부 규칙

### 모듈 (`src/modules/<기능>/`)

| 대상 | 규칙 | 예 |
|---|---|---|
| 디렉토리 | `<기능>` 단수형 | `example/`, `user-life/` |
| 파일 | `<기능>.<역할>.ts` | `user-life.route.ts`, `.controller.ts`, `.service.ts`, `.repository.ts`, `.schema.ts`, `.test.ts` |
| route 플러그인 | `<기능>Route` | `exampleRoute` |
| controller 함수 | `<HTTP 메서드><대상>` | `getExample`, `postExample` |
| 라우트 스키마 | `<controller 함수 이름>Schema` | `getExampleSchema` |
| 데이터 스키마·타입 (`api-contracts/`) | PascalCase 명사 | `Example` |
| params 스키마 | `<대상>Params` | `ExampleParams` |
| body 스키마 | `<동작><대상>Body` | `CreateExampleBody` |
| service 함수 | `<동작><대상>` | `getExample`, `createExample` |
| repository 함수 | 조회 `findBy<조건>`, 추가 `insert` | `findById`, `insert` |

### default export 객체를 받는 이름

controller·service·훅은 함수를 객체로 묶어 default export 하고, **받는 쪽에서 `<기능><역할>`** 로 이름 붙인다.
어느 파일에서 온 함수인지가 호출 지점에 드러난다.

```ts
import exampleController from "@/modules/example/example.controller";
import exampleService from "@/modules/example/example.service";
import onRequestHook from "@/hooks/on-request.hook";

exampleController.getExample
onRequestHook.onlyLogin("admin")
```

### 가드 (`src/guards/`)

| 대상 | 규칙 | 예 |
|---|---|---|
| 파일 | `<가드 이름>.guard.ts` | `admin.guard.ts` |
| 가드 함수 | `<가드 이름>Guard` | `adminGuard` |
| 토큰 claim 스키마·타입 | `<가드 이름>Claims` | `AdminClaims` |
| 신원 타입 | `<가드 이름>Identity` | `AdminIdentity` |
| 등록부 키 (= 가드 이름) | camelCase | `user`, `admin` |

### 계약 (`src/api-contracts/`)

| 대상 | 규칙 | 예 |
|---|---|---|
| 파일 | `<기능>.contract.ts`, 공통은 `<목적>.contract.ts` | `example.contract.ts`, `envelope.contract.ts`, `error-code.contract.ts` |
| import | 진입점 `@/api-contracts` 에서만 | `import { Example, Ok } from "@/api-contracts"` |

모듈의 `<기능>.schema.ts` 는 **라우트 스키마 묶음**만 둔다 (`getExampleSchema`). 요청·응답 모양은 계약 파일에.

### 설정 (`src/configs/`)

| 대상 | 규칙 | 예 |
|---|---|---|
| 파일 | `<목적>.config.ts` | `env.config.ts` |

### 훅 (`src/hooks/`)

| 대상 | 규칙 | 예 |
|---|---|---|
| 파일 | `<실행 단계 kebab-case>.hook.ts` | `on-request.hook.ts` |
| 받는 이름 | `<실행 단계>Hook` | `onRequestHook` |

### DB (`src/db/`)

| 대상 | 규칙 | 예 |
|---|---|---|
| 테이블·컬럼 (DB) | snake_case. 테이블은 복수형 | `examples`, `created_at` |
| 테이블 타입 키 (코드) | camelCase (CamelCasePlugin 이 변환) | `createdAt` |
| 테이블 인터페이스 | `<테이블 PascalCase>Table` | `ExamplesTable` |
| 행 타입 | `<단수>Row`, `New<단수>Row` | `ExampleRow`, `NewExampleRow` |
| 마이그레이션 파일 | `<YYYY-MM-DD>-<순번 3자리>-<내용>.ts` | `2026-10-08-001-create-examples.ts` |
| 인덱스 | `<테이블>_<컬럼>_idx` | `examples_created_by_idx` |
| 테이블 타입 파일 | `types/<테이블 단수>.type.ts` | `types/example.type.ts` |
| 시드 파일 | `seeds/<파트>.seed.ts` | `seeds/example.seed.ts` |

### 응답 필드

API 응답 JSON 의 키는 camelCase: `isOk`, `errorCode`, `errorMessage`.

## 파일 헤더

**모든 파일의 첫 줄**에 프로젝트 루트 기준 경로와 한글 별칭을 주석으로 단다. 그 아래 한 줄을 비운다.
경로를 그대로 복사해 Claude 에 넘기거나 IDE 에서 열기 위한 개발 편의용이다.

형식: `<루트 기준 경로> — <한글 별칭>`

```ts
// src/modules/example/example.service.ts — 예시 서비스

import ...
```

| 파일 종류 | 주석 형식 |
|---|---|
| `.ts`, `tsconfig.json`, `biome.jsonc` | `// src/lib/jwt.ts — JWT 서명·검증` |
| `.md` | `<!-- docs/guards.md — 가드 문서 -->` |
| `.gitignore`, `.env*` | `# .env.example — 환경변수 예시` |

- 경로는 **파일 이름만이 아니라 루트 기준 전체 경로**다. 같은 이름의 파일(`index.ts` 등)이 여러 개여도 구분된다.
- 별칭은 그 파일이 **무엇인지** 짧게. 테스트 파일은 `<대상 별칭> 테스트`.
- 헤더와 첫 import 사이를 비워야 Biome 의 import 정렬이 헤더를 끌고 가지 않는다.
- 파일을 옮기거나 이름을 바꾸면 헤더도 함께 고친다.
- Biome 설정은 주석을 쓰기 위해 `biome.json` 이 아니라 **`biome.jsonc`** 다.
- **예외**: `package.json`, `package-lock.json` 은 JSON 이 주석을 허용하지 않아 헤더를 달지 않는다.

## 아직 정하지 않은 것

- repository 의 수정·삭제 함수 동사 (`update` / `delete` …). 쓰는 예시가 생길 때 정한다
- querystring 스키마 이름 (`ListExamplesQuery`?). 쓰는 예시가 생길 때 정한다
- boolean 변수 접두사 (`is` / `has` …)
- 제네릭 타입 파라미터의 한 글자 이름(`T`, `G`) 허용 여부. 지금 코드는 `T`, `G`, `TReply`, `TIdentity` 를 섞어 쓴다
- `README.md` 같은 관례적 대문자 파일을 예외로 둘지
- 루트 디렉토리 이름 (`fastify_scaffolding_example` → `fastify-scaffolding-example`, GitHub 업로드 때 변경 예정)
