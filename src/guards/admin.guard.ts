// src/guards/admin.guard.ts — 관리자 가드

import Type, { type Static } from "typebox";
import { env } from "@/configs/env.config";
import { bearerToken, type Guard } from "@/lib/guard";
import { verifyJwt } from "@/lib/jwt";

/** 관리자 토큰에 담는 값. 발급하는 쪽(auth 모듈)도 이 스키마를 따른다. */
export const AdminClaims = Type.Object({
  sub: Type.String(),
  role: Type.Union([Type.Literal("super"), Type.Literal("staff")]),
});

export type AdminClaims = Static<typeof AdminClaims>;

/** request.auth("admin") 가 돌려주는 신원 */
export type AdminIdentity = {
  id: string;
  role: AdminClaims["role"];
};

/**
 * 관리자 가드. ADMIN_JWT_SECRET 으로 서명된 토큰만 받는다.
 *
 * 비밀키를 user 가드와 나눠, 일반 사용자 토큰으로는 관리자 경로를 지나갈 수 없게 한다.
 * DB 에서 계정 상태·세션을 확인해야 한다면 여기서 repository 를 부른다.
 */
const adminGuard: Guard<AdminIdentity> = async (request) => {
  const token = bearerToken(request);
  if (!token) return null;

  const claims = await verifyJwt(token, { secret: env.ADMIN_JWT_SECRET, claims: AdminClaims });
  if (!claims) return null;

  return { id: claims.sub, role: claims.role };
};

export default adminGuard;
