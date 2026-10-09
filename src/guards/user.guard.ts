// src/guards/user.guard.ts — 사용자 가드

import Type, { type Static } from "typebox";
import { env } from "@/configs/env.config";
import { bearerToken, type Guard } from "@/lib/guard";
import { verifyJwt } from "@/lib/jwt";

/** 일반 사용자 토큰에 담는 값. 발급하는 쪽(auth 모듈)도 이 스키마를 따른다. */
export const UserClaims = Type.Object({
  sub: Type.String(),
});

export type UserClaims = Static<typeof UserClaims>;

/** request.auth("user") 가 돌려주는 신원 */
export type UserIdentity = {
  id: string;
};

/** 일반 사용자 가드. USER_JWT_SECRET 으로 서명된 토큰만 받는다. */
const userGuard: Guard<UserIdentity> = async (request) => {
  const token = bearerToken(request);
  if (!token) return null;

  const claims = await verifyJwt(token, { secret: env.USER_JWT_SECRET, claims: UserClaims });
  if (!claims) return null;

  return { id: claims.sub };
};

export default userGuard;
