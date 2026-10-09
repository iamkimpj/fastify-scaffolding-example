// src/api-contracts/example.contract.ts — 예시 API 계약

import Type, { type Static } from "typebox";

/**
 * 예시 API 의 요청·응답 모양. BE 와 FE 가 함께 쓴다.
 *
 * 이름은 **API(동작) 단위**로 묶는다. 동작 이름은 controller 함수 이름의 PascalCase 다.
 *   <동작>Params    경로 파라미터
 *   <동작>Request   요청 — GET 이면 querystring, 그 밖이면 body
 *   <동작>Response  응답 봉투 안의 data
 *
 * 스키마를 먼저 쓰고 타입을 거기서 뽑는다. FE 는 타입으로도, 폼 입력 검증(Value.Check)으로도 쓸 수 있다.
 */

// ------------------------------------------------------------------
// 공용 리소스: 여러 응답에서 재사용하는 부품
// ------------------------------------------------------------------

/**
 * API 로 내보내는 예시 한 건. DB 행(ExampleRow)과 모양이 다를 수 있다.
 * DB 행 → 이 모양으로 바꾸는 일은 BE 의 service 가 한다.
 */
export const Example = Type.Object({
  id: Type.Integer(),
  title: Type.String(),
  description: Type.Union([Type.String(), Type.Null()]),
  createdBy: Type.String(),
  createdAt: Type.String({ format: "date-time" }),
});

export type Example = Static<typeof Example>;

// ------------------------------------------------------------------
// GET /examples/:id — 예시 조회
// ------------------------------------------------------------------

export const GetExampleParams = Type.Object({
  id: Type.Integer({ minimum: 1 }),
});

export type GetExampleParams = Static<typeof GetExampleParams>;

/**
 * GET 이므로 querystring 으로 받는다. `?descriptionLength=10`
 *
 * querystring 값은 모두 문자열로 오지만 스키마가 Integer 라 서버가 숫자로 바꿔 받는다.
 */
export const GetExampleRequest = Type.Object({
  /** description 을 앞에서부터 이 글자 수만큼 잘라서 돌려준다. 없으면 자르지 않는다 */
  descriptionLength: Type.Optional(Type.Integer({ minimum: 1, maximum: 1000 })),
});

export type GetExampleRequest = Static<typeof GetExampleRequest>;

/** 공용 리소스와 같다. 이 API 의 응답만 달라지면 여기만 바꾼다. */
export const GetExampleResponse = Example;

export type GetExampleResponse = Example;

// ------------------------------------------------------------------
// POST /examples — 예시 생성
// ------------------------------------------------------------------

/** 길이 제한은 컬럼에 맞춘다 (title: varchar(100)) */
export const PostExampleRequest = Type.Object({
  title: Type.String({ minLength: 1, maxLength: 100 }),
  description: Type.Optional(Type.String({ maxLength: 1000 })),
});

export type PostExampleRequest = Static<typeof PostExampleRequest>;

export const PostExampleResponse = Example;

export type PostExampleResponse = Example;
