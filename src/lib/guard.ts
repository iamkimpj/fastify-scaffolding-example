// src/lib/guard.ts — 가드 타입·도구

import type { FastifyRequest } from "fastify";

/**
 * 가드. 요청을 받아 신원을 돌려주고, 인증되지 않았으면 null 을 돌려준다.
 *
 * Laravel 의 guard 와 같은 개념이다. 어떻게 인증할지(JWT, 세션, API Key …)는
 * 가드 안에 숨긴다. driver 를 바꿔도 이 모양만 지키면 쓰는 쪽은 바뀌지 않는다.
 *
 * **막지 않는다.** 차단은 hooks/on-request.hook.ts 의 onlyLogin 이 한다.
 * 인증 실패는 null 로 돌려주고, 그 밖의 오류(DB 장애 등)는 그대로 던진다.
 */
export type Guard<TIdentity> = (request: FastifyRequest) => Promise<TIdentity | null>;

/** `Authorization: Bearer <token>` 에서 토큰을 꺼낸다. 없으면 null. */
export const bearerToken = (request: FastifyRequest): string | null => {
  const header = request.headers.authorization;
  if (!header?.startsWith("Bearer ")) return null;
  return header.slice("Bearer ".length) || null;
};
