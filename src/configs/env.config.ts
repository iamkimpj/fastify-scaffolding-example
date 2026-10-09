// src/configs/env.config.ts — 환경변수

import Type, { type Static } from "typebox";
import { Value } from "typebox/value";

const Env = Type.Object({
  NODE_ENV: Type.Union(
    [Type.Literal("development"), Type.Literal("production"), Type.Literal("test")],
    { default: "development" },
  ),
  HOST: Type.String({ default: "0.0.0.0" }),
  PORT: Type.Integer({ default: 3000 }),
  LOG_LEVEL: Type.Union(
    [
      Type.Literal("fatal"),
      Type.Literal("error"),
      Type.Literal("warn"),
      Type.Literal("info"),
      Type.Literal("debug"),
      Type.Literal("trace"),
      Type.Literal("silent"),
    ],
    { default: "info" },
  ),
  // 쉼표로 구분된 origin 목록. 빈 문자열이면 전체 허용.
  CORS_ORIGINS: Type.String({ default: "" }),
  SWAGGER_ENABLED: Type.Boolean({ default: true }),

  // 가드별 JWT 비밀키. 기본값을 두지 않는다 — 없으면 서버가 뜨지 않는다.
  // 가드마다 다른 값을 써야 한 가드의 토큰으로 다른 가드를 지나갈 수 없다.
  USER_JWT_SECRET: Type.String({ minLength: 32 }),
  ADMIN_JWT_SECRET: Type.String({ minLength: 32 }),

  // DB 접속 정보(DB_*)는 여기 두지 않는다. src/db/env.ts 가 관리한다.
});

export type Env = Static<typeof Env>;

/**
 * process.env 를 스키마 기준으로 기본값 채움 → 타입 변환 → 미정의 키 제거 → 검증.
 * typebox 1.x 의 Value.Parse 는 기본적으로 값을 보정하지 않으므로 단계를 명시적으로 수행한다.
 */
function loadEnv(source: NodeJS.ProcessEnv): Env {
  // process.env 는 런타임에 따라 Proxy 일 수 있어(vitest 등) 일반 객체로 복사한 뒤 처리한다.
  const withDefaults = Value.Default(Env, { ...source });
  const converted = Value.Convert(Env, withDefaults);
  const cleaned = Value.Clean(Env, converted);

  if (!Value.Check(Env, cleaned)) {
    const details = [...Value.Errors(Env, cleaned)]
      .map((e) => `  - ${e.instancePath || "/"} ${e.message}`)
      .join("\n");
    throw new Error(`환경변수 검증 실패:\n${details}`);
  }
  return cleaned;
}

export const env = loadEnv(process.env);

export const isProduction = env.NODE_ENV === "production";
export const isTest = env.NODE_ENV === "test";
