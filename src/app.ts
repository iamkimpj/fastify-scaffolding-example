// src/app.ts — 앱 조립

import type { TypeBoxTypeProvider } from "@fastify/type-provider-typebox";
import Fastify, { type FastifyServerOptions } from "fastify";
import { env, isProduction, isTest } from "@/configs/env.config";
import modules from "@/modules";
import auth from "@/plugins/auth";
import db from "@/plugins/db";
import errorHandler from "@/plugins/error-handler";
import reply from "@/plugins/reply";
import security from "@/plugins/security";
import swagger from "@/plugins/swagger";

function loggerOptions(): FastifyServerOptions["logger"] {
  if (isTest) return false;
  if (isProduction) return { level: env.LOG_LEVEL };
  return {
    level: env.LOG_LEVEL,
    transport: {
      target: "pino-pretty",
      options: { translateTime: "HH:MM:ss", ignore: "pid,hostname" },
    },
  };
}

/**
 * 앱 인스턴스를 생성한다. listen 은 하지 않는다 (server.ts 담당).
 * 테스트에서는 buildApp() 후 app.inject() 로 요청한다.
 */
export async function buildApp(opts: FastifyServerOptions = {}) {
  const app = Fastify({
    logger: loggerOptions(),
    ...opts,
  }).withTypeProvider<TypeBoxTypeProvider>();

  // 등록 순서: 봉투·에러 처리 → 보안 → 문서 → 인프라(db, auth) → 기능 모듈
  await app.register(reply);
  await app.register(errorHandler);
  await app.register(security);
  await app.register(swagger);
  await app.register(db);
  await app.register(auth);

  await app.register(modules, { prefix: "/api" });

  return app;
}

export type App = Awaited<ReturnType<typeof buildApp>>;
