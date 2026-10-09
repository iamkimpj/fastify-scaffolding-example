// src/plugins/auth.ts — 인증 플러그인

import type { FastifyInstance, FastifyRequest } from "fastify";
import fp from "fastify-plugin";
import { ERROR_CODE } from "@/api-contracts";
import { type GuardName, guards, type IdentityOf } from "@/guards";
import { AppError } from "@/lib/errors";

declare module "fastify" {
  interface FastifyRequest {
    /**
     * 가드로 신원을 확인해 돌려준다. 인증되지 않았으면 null. **막지 않는다.**
     *
     * 요청 하나 안에서 가드별로 한 번만 확인한다. 처음 부를 때 가드를 실행해 캐시에 담고,
     * 이후에는 캐시를 돌려준다. 인증 실패(null)도 캐시한다.
     *
     * 로그인하지 않았을 수도 있는 경로에서 쓴다. (예: 로그인했으면 추가 정보를 주는 공개 경로)
     *
     * @example
     * const admin = await request.auth("admin"); // AdminIdentity | null
     */
    auth<G extends GuardName>(guard: G): Promise<IdentityOf<G> | null>;

    /**
     * request.auth 와 같지만, 인증되지 않았으면 401 AppError 를 던진다. 반환 타입에 null 이 없다.
     *
     * 로그인이 반드시 필요한 경로의 controller 에서 쓴다. 그런 경로에는 보통
     * onRequestHook.onlyLogin 이 이미 붙어 있어, 여기서는 캐시를 꺼내기만 한다.
     *
     * @example
     * const admin = await request.authOrFail("admin"); // AdminIdentity
     */
    authOrFail<G extends GuardName>(guard: G): Promise<IdentityOf<G>>;
  }
}

/**
 * 요청별 신원 캐시. 요청 객체를 키로 쓰므로 요청이 끝나면 함께 사라진다.
 *
 * 결과가 아니라 Promise 를 담는다. 같은 요청에서 동시에 두 번 불려도 가드는 한 번만 돈다.
 */
const cache = new WeakMap<FastifyRequest, Map<GuardName, Promise<unknown>>>();

async function authPlugin(app: FastifyInstance) {
  app.decorateRequest("auth", function (this: FastifyRequest, guard: GuardName) {
    let byGuard = cache.get(this);
    if (!byGuard) {
      byGuard = new Map();
      cache.set(this, byGuard);
    }

    let identity = byGuard.get(guard);
    if (!identity) {
      identity = guards[guard](this);
      byGuard.set(guard, identity);
    }
    return identity;
  } as FastifyRequest["auth"]);

  // 401 판단은 여기 한 곳에만 둔다. onRequestHook.onlyLogin 도 이것을 부른다.
  app.decorateRequest("authOrFail", async function (this: FastifyRequest, guard: GuardName) {
    const identity = await this.auth(guard);
    if (!identity) {
      throw new AppError(401, ERROR_CODE.UNAUTHORIZED, "로그인이 필요합니다");
    }
    return identity;
  } as FastifyRequest["authOrFail"]);
}

export default fp(authPlugin, { name: "auth" });
