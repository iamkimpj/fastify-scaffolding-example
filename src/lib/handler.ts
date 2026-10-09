// src/lib/handler.ts — 컨트롤러 핸들러 타입

import type { TypeBoxTypeProvider } from "@fastify/type-provider-typebox";
import type {
  ContextConfigDefault,
  FastifySchema,
  RawReplyDefaultExpression,
  RawRequestDefaultExpression,
  RawServerDefault,
  RouteGenericInterface,
  RouteHandlerMethod,
} from "fastify";

/**
 * controller 핸들러 타입. 라우트 스키마를 넘기면 그 스키마 기준으로 타입이 잡힌다.
 *
 * - request.params / querystring / body / headers → 스키마에서 추론
 * - reply.ok(data) 의 data → 스키마의 `response[200]` (Ok(X)) 에서 추론
 *
 * route 와 controller 를 다른 파일에 두면 route 쪽 추론이 controller 까지 오지 않으므로,
 * controller 는 반드시 이 타입으로 선언한다.
 *
 * @example
 * const getUser: Handler<typeof getUserSchema> = async (request, reply) => {
 *   const user = await userService.getUser(request.server.db, request.params.id);
 *   return reply.ok(user);
 * };
 */
export type Handler<TSchema extends FastifySchema> = RouteHandlerMethod<
  RawServerDefault,
  RawRequestDefaultExpression,
  RawReplyDefaultExpression,
  RouteGenericInterface,
  ContextConfigDefault,
  TSchema,
  TypeBoxTypeProvider
>;
