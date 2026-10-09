// src/modules/example/example.schema.ts — 예시 라우트 스키마

import { CreateExampleBody, ErrorResponse, Example, ExampleParams, Ok } from "@/api-contracts";

/**
 * 라우트 스키마 묶음. route 는 등록에, controller 는 Handler<typeof X> 타입에 쓴다.
 *
 * 요청·응답의 **모양**(Example, CreateExampleBody …)은 여기 두지 않는다. FE 와 공유하는 계약이므로
 * src/api-contracts/example.contract.ts 에 두고 가져다 쓴다. 여기는 그것을 경로에 묶는 일만 한다.
 */

export const getExampleSchema = {
  tags: ["example"],
  summary: "예시 조회",
  params: ExampleParams,
  response: {
    200: Ok(Example),
    404: ErrorResponse, // EXAMPLE_NOT_FOUND
  },
};

export const postExampleSchema = {
  tags: ["example"],
  summary: "예시 생성 (user 로그인 필요)",
  body: CreateExampleBody,
  response: {
    200: Ok(Example),
    401: ErrorResponse, // UNAUTHORIZED
  },
};
