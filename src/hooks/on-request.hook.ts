// src/hooks/on-request.hook.ts — onRequest 훅

import type { FastifyRequest } from "fastify";
import type { GuardName } from "@/guards";

/**
 * onRequest 단계에 도는 훅들. 라우트 옵션 `{ onRequest: ... }` 로 경로마다 붙인다.
 *
 * 요청 주기에서 가장 이른 자리라 본문을 아직 읽지 않았다. 여기서 거절하면
 * 본문 파싱 비용조차 치르지 않는다. 토큰만 보고 판단하는 인증이 여기 맞는 이유다.
 *
 * 보호할 경로는 라우트 옵션으로 고른다. request.url 문자열로 고르지 않는다.
 * 라우터가 디코드한 경로와 날문자열이 달라 `/%61dmin` 같은 요청이 검사를 지나갈 수 있다.
 */

/**
 * 그 가드로 로그인해야 지나간다. 아니면 401. (판단은 request.authOrFail 이 한다)
 *
 * 여기서 확인한 신원은 캐시되므로, controller 에서 request.authOrFail(같은 가드) 를 부르면
 * 다시 확인하지 않고 null 없는 타입으로 꺼낼 수 있다.
 *
 * @example
 * app.get("/admin/users", { onRequest: onRequestHook.onlyLogin("admin"), schema }, handler);
 */
const onlyLogin = (guard: GuardName) => async (request: FastifyRequest) => {
  await request.authOrFail(guard);
};

export default {
  onlyLogin,
};
