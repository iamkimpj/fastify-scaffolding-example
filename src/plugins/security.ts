// src/plugins/security.ts — 보안 플러그인 (CORS·Helmet)

import cors from "@fastify/cors";
import helmet from "@fastify/helmet";
import type { FastifyInstance } from "fastify";
import fp from "fastify-plugin";
import { env } from "@/configs/env.config";

async function security(app: FastifyInstance) {
  const origins = env.CORS_ORIGINS.split(",")
    .map((o) => o.trim())
    .filter(Boolean);

  await app.register(cors, {
    // 목록이 비어 있으면 전체 허용 (개발용). 운영에서는 반드시 지정한다.
    origin: origins.length > 0 ? origins : true,
    credentials: true,
  });

  await app.register(helmet, {
    // swagger-ui 가 인라인 스크립트/스타일을 사용하므로 CSP 는 끈다.
    contentSecurityPolicy: false,
  });
}

export default fp(security, { name: "security" });
