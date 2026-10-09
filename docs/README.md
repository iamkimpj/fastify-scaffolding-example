<!-- docs/README.md — 문서 목차 -->

# 문서 목차

이 저장소는 Fastify 서버의 **구조를 통일하기 위한 참조 예시**다.
새 프로젝트는 여기 정해진 구조와 규칙을 그대로 따른다. 임의로 바꾸지 않는다.

코드 한 파일만 봐서는 알기 어려운 것들, 즉 여러 파일에 걸친 흐름과 **왜 그렇게 정했는지**를 여기 적는다.

## 읽는 순서

| 순서 | 문서 | 내용 |
|---|---|---|
| 1 | [architecture.md](architecture.md) | 폴더 구조, 계층(route → controller → service → repository), 요청 흐름, 이름·import·export 규칙 |
| 2 | [naming.md](naming.md) | 파일·디렉토리·변수·함수·타입·상수 이름 규칙 |
| 3 | [schema.md](schema.md) | TypeBox 스키마 작성법, 라우트 스키마, controller 타입(`Handler<S>`) |
| 4 | [response-envelope.md](response-envelope.md) | 응답 봉투 `{ isOk, data }` / `{ isOk, errorCode, errorMessage }` |
| 5 | [error-handling.md](error-handling.md) | `AppError`, `ERROR_CODE`, 전역 에러 핸들러, 검증 실패 문구 |
| 6 | [guards.md](guards.md) | 가드(인증), `request.auth` / `authOrFail`, `onlyLogin` |
| 7 | [database.md](database.md) | Kysely, 테이블 타입, 마이그레이션, DB 를 넘기는 방식, 트랜잭션 |
| 8 | [config.md](config.md) | 환경변수, 실행 스크립트, 도구 선택 이유 |
| 9 | [testing.md](testing.md) | 테스트 작성 방식 |
| 10 | [monorepo.md](monorepo.md) | 모노레포로 옮길 때 무엇을 어느 패키지로 보내는가 |

## 한 장 요약

- **스택**: Fastify 5 · TypeScript (ESM) · TypeBox · Kysely (MySQL) · jose · Biome · Vitest · tsup · npm
- **구조**: 기능 단위 모듈 `src/modules/<기능>/<기능>.<역할>.ts`
- **계층**: route(연결만) → controller(요청 ↔ service) → service(로직, Fastify 모름) → repository(DB 쿼리)
- **계약**: BE·FE 가 공유하는 요청·응답 모양, `ERROR_CODE`, 봉투는 `src/api-contracts/` (`@/api-contracts` 로 import)
- **응답**: 성공은 `reply.ok(data)`, 실패는 service 에서 `throw new AppError(...)`. 모양은 전역에서 봉투로 통일
- **DB**: repository 가 `executor()` 로 DB 를 스스로 가져온다. 트랜잭션 경계는 service 가 `transaction()` 으로 정한다 (AsyncLocalStorage, 바깥 트랜잭션에 합류). controller·service 는 DB 를 모른다
- **인증**: 이름 붙은 가드(`user`, `admin`). 경로 보호는 `onRequestHook.onlyLogin("admin")`, 신원은 `request.authOrFail("admin")`
- **import**: `@/` alias 만. 상대경로는 lint 에러

## 아직 없는 것

- 실제 DB 접속 환경 (docker-compose 등). DB 관련은 예시 파일만 있다
- 로그인(토큰 발급) 예시
- PM2 배포 설정
