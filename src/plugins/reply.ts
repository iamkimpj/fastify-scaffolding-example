// src/plugins/reply.ts — 성공 응답 플러그인

import type { FastifyInstance, FastifyReply } from "fastify";
import fp from "fastify-plugin";

/**
 * 응답 스키마에서 성공 봉투의 data 타입을 꺼낸다.
 *
 * 실패 응답(`404: ErrorResponse` 등)도 함께 선언된 경로에서는 ReplyType 이 성공·실패의 합집합이다.
 * 그대로 꺼내면 실패 쪽이 unknown 을 섞어 타입 체크가 사라지므로, 성공 봉투만 골라낸 뒤 꺼낸다.
 * 응답 스키마가 없으면 unknown.
 */
type OkData<TReply> = [Extract<TReply, { isOk: true }>] extends [never]
  ? unknown
  : Extract<TReply, { isOk: true }> extends { data: infer D }
    ? D
    : unknown;

declare module "fastify" {
  interface FastifyReply<
    RouteGeneric,
    RawServer,
    RawRequest,
    RawReply,
    ContextConfig,
    SchemaCompiler,
    TypeProvider,
    ReplyType,
  > {
    /**
     * 성공 봉투 `{ isOk: true, data }` 를 200 으로 보낸다.
     * 라우트에 `response: { 200: Ok(X) }` 가 있으면 data 가 X 로 타입 체크된다.
     *
     * 실패는 reply 로 보내지 않는다. service 에서 AppError 를 throw 한다.
     */
    ok(
      data: OkData<ReplyType>,
    ): FastifyReply<
      RouteGeneric,
      RawServer,
      RawRequest,
      RawReply,
      ContextConfig,
      SchemaCompiler,
      TypeProvider
    >;
  }
}

async function replyPlugin(app: FastifyInstance) {
  // Fastify 는 reply 를 this 로 넘긴다. 화살표 함수를 쓰면 this 가 바뀌므로 function 으로 쓴다.
  app.decorateReply("ok", function (this: FastifyReply, data: unknown) {
    return this.code(200).send({ isOk: true, data });
  });
}

export default fp(replyPlugin, { name: "reply" });
