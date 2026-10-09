// src/lib/jwt.ts — JWT 서명·검증

import { errors, jwtVerify, SignJWT } from "jose";
import type { Static, TSchema } from "typebox";
import { Value } from "typebox/value";

/**
 * JWT 서명·검증 도구 (HS256). 가드가 가져다 쓰는 driver 도구다.
 *
 * 비밀키와 claim 모양은 부르는 쪽(가드)이 정한다. 이 파일은 환경변수를 읽지 않는다.
 */

const toKey = (secret: string) => new TextEncoder().encode(secret);

export const signJwt = async (
  claims: Record<string, unknown>,
  { secret, expiresInSeconds }: { secret: string; expiresInSeconds: number },
): Promise<string> => {
  const issuedAt = Math.floor(Date.now() / 1000);

  return new SignJWT(claims)
    .setProtectedHeader({ alg: "HS256" })
    .setIssuedAt(issuedAt)
    .setExpirationTime(issuedAt + expiresInSeconds)
    .sign(toKey(secret));
};

/**
 * 토큰을 검증하고 claim 을 스키마로 확인해 돌려준다. 유효하지 않으면 null.
 *
 * - 서명이 다르거나, 만료됐거나, 형식이 깨졌으면 null
 * - 서명은 맞지만 claim 모양이 스키마와 다르면 null (다른 가드용 토큰이 섞여 들어온 경우 등)
 *
 * **토큰 오류만 null 로 바꾼다.** 그 밖의 오류까지 삼키면 500 이어야 할 상황이 401 로 보인다.
 */
export const verifyJwt = async <T extends TSchema>(
  token: string,
  { secret, claims }: { secret: string; claims: T },
): Promise<Static<T> | null> => {
  try {
    const { payload } = await jwtVerify(token, toKey(secret), { algorithms: ["HS256"] });
    return Value.Check(claims, payload) ? payload : null;
  } catch (error) {
    if (error instanceof errors.JOSEError) return null;
    throw error;
  }
};
