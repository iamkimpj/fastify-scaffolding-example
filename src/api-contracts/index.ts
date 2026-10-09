// src/api-contracts/index.ts — API 계약 진입점

/**
 * BE 와 FE 가 공유하는 API 계약. **앱은 이 진입점(`@/api-contracts`)에서만 import 한다.**
 *
 * **API 계약만 둔다.** HTTP 로 오가는 요청(params·querystring·body)·응답의 모양, ERROR_CODE, 봉투.
 * 그 밖의 타입 — 도메인 타입, DB 행 타입, 서버 내부 타입, 가드 신원 — 은 두지 않는다.
 * "FE 가 알아야 하나?" 가 아니라 **"HTTP 경계를 넘나?"** 로 판단한다.
 * 모노레포에서 여러 시스템의 타입이 여기로 모여 뒤섞이는 것을 막기 위함이다.
 *
 * - 여기 있는 파일은 typebox 와 src/api-contracts 만 import 한다 (Biome 로 막혀 있다).
 *   Fastify·DB 에 묶이지 않아야 FE 가 그대로 가져다 쓸 수 있다.
 * - 모노레포가 되면 이 디렉토리를 그대로 packages/api-contracts 로 옮기고,
 *   `@/api-contracts` 를 `@<scope>/api-contracts` 로 바꾸면 된다. → docs/monorepo.md
 *
 * 새 계약 파일은 `<기능>.contract.ts` 로 만들고 여기에 한 줄 추가한다.
 */

export * from "@/api-contracts/envelope.contract";
export * from "@/api-contracts/error-code.contract";
export * from "@/api-contracts/example.contract";
