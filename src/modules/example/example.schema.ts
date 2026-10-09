// src/modules/example/example.schema.ts — 예시 라우트 스키마

import {
  ErrorResponse,
  GetExampleParams,
  GetExampleRequest,
  GetExampleResponse,
  Ok,
  PostExampleRequest,
  PostExampleResponse,
} from "@/api-contracts";

/**
 * 라우트 스키마 묶음. route 는 등록에, controller 는 Handler<typeof X> 타입에 쓴다.
 *
 * 요청·응답의 **모양**(GetExampleParams, PostExampleRequest …)은 여기 두지 않는다. FE 와 공유하는 계약이므로
 * src/api-contracts/example.contract.ts 에 두고 가져다 쓴다. 여기는 그것을 경로에 묶는 일만 한다.
 *
 * `<동작>Request` 는 메서드에 따라 넣는 자리가 다르다: GET 이면 querystring, 그 밖이면 body.
 */

export const getExampleSchema = {
  tags: ["example"],
  summary: "예시 조회",
  params: GetExampleParams,
  querystring: GetExampleRequest, // GET 의 <동작>Request 는 querystring 자리에
  response: {
    200: Ok(GetExampleResponse),
    404: ErrorResponse, // EXAMPLE_NOT_FOUND
  },
};

export const postExampleSchema = {
  tags: ["example"],
  summary: "예시 생성 (user 로그인 필요)",
  body: PostExampleRequest,
  response: {
    200: Ok(PostExampleResponse),
    401: ErrorResponse, // UNAUTHORIZED
  },
};
