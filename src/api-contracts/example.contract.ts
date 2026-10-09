// src/api-contracts/example.contract.ts — 예시 API 계약

import Type, { type Static } from "typebox";

/**
 * 예시 API 의 요청·응답 모양. BE 와 FE 가 함께 쓴다.
 *
 * 스키마를 먼저 쓰고 타입을 거기서 뽑는다. FE 는 타입으로도, 폼 입력 검증(Value.Check)으로도 쓸 수 있다.
 */

/**
 * API 로 내보내는 예시. DB 행(ExampleRow)과 모양이 다를 수 있다.
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

export const ExampleParams = Type.Object({
  id: Type.Integer({ minimum: 1 }),
});

export type ExampleParams = Static<typeof ExampleParams>;

/** 길이 제한은 컬럼에 맞춘다 (title: varchar(100)) */
export const CreateExampleBody = Type.Object({
  title: Type.String({ minLength: 1, maxLength: 100 }),
  description: Type.Optional(Type.String({ maxLength: 1000 })),
});

export type CreateExampleBody = Static<typeof CreateExampleBody>;
