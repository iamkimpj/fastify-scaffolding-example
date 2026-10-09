// src/plugins/swagger.ts — API 문서 플러그인

import swagger from "@fastify/swagger";
import swaggerUi from "@fastify/swagger-ui";
import type { FastifyInstance } from "fastify";
import fp from "fastify-plugin";
import { env } from "@/configs/env.config";

async function swaggerPlugin(app: FastifyInstance) {
  if (!env.SWAGGER_ENABLED) return;

  await app.register(swagger, {
    openapi: {
      info: {
        title: "Fastify Scaffolding Example API",
        version: "1.0.0",
      },
    },
  });

  await app.register(swaggerUi, {
    routePrefix: "/docs",
  });
}

export default fp(swaggerPlugin, { name: "swagger" });
