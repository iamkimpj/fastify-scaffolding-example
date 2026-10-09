// src/api-contracts/envelope.contract.ts — 응답 봉투 스키마 (계약)

import Type, { type Static, type TSchema } from "typebox";
import { ERROR_CODE } from "@/api-contracts/error-code.contract";

/**
 * 응답 봉투 스키마. 모든 경로가 같은 모양으로 답한다.
 *
 * - 성공: `{ isOk: true, data }` (항상 200) — plugins/reply.ts 의 `reply.ok()` 가 보낸다
 * - 실패: `{ isOk: false, errorCode, errorMessage, data? }` — plugins/error-handler.ts 가 보낸다
 *
 * 여기는 라우트 `schema.response` 에 쓸 스키마만 둔다. FE 도 이 모양으로 응답을 해석한다.
 */

/**
 * 성공 봉투. `response: { 200: Ok(UserSchema) }` 로 쓴다.
 *
 * 이렇게 선언해야 Swagger 에 봉투 모양이 그대로 나오고,
 * `reply.ok(data)` 의 `data` 가 UserSchema 기준으로 타입 체크된다.
 */
export const Ok = <T extends TSchema>(data: T) =>
  Type.Object({
    isOk: Type.Literal(true),
    data,
  });

/**
 * 성공 봉투 타입. 스키마 함수 `Ok(X)` 와 같은 이름이다 (TypeBox 스키마는 타입으로 취급).
 * FE 가 응답 본문 전체의 타입을 적을 때 쓴다: `Ok<GetExampleResponse>`
 */
export type Ok<TData> = {
  isOk: true;
  data: TData;
};

/**
 * 실패 봉투. 그 경로가 낼 수 있는 실패를 문서에 밝힐 때 쓴다.
 *
 * 선언하지 않아도 실패 응답은 error-handler 가 똑같이 보낸다. 차이는 Swagger 에 보이느냐뿐이다.
 * 클라이언트가 OpenAPI 로 타입을 생성한다면 실패 응답 타입도 함께 생긴다.
 *
 * @example
 * response: {
 *   200: Ok(UserSchema),
 *   404: ErrorResponse, // USER_NOT_FOUND
 * }
 */
export const ErrorResponse = Type.Object({
  isOk: Type.Literal(false),
  /** ERROR_CODE 에 선언된 값만 쓴다. 화면은 이 값으로 분기한다 */
  errorCode: Type.Enum(Object.values(ERROR_CODE)),
  /** 개발자가 읽을 문구. 사용자에게 보일 문구는 화면이 errorCode 로 정한다 */
  errorMessage: Type.String(),
  /** 덧붙일 것이 있을 때만. 없으면 키 자체를 만들지 않는다 */
  data: Type.Optional(Type.Unknown()),
});

export type ErrorResponse = Static<typeof ErrorResponse>;
