// src/plugins/db.ts — DB 플러그인

import type { FastifyInstance } from "fastify";
import fp from "fastify-plugin";
import { createDatabase, type Database } from "@/db";
import { databaseOptionsFromEnv } from "@/db/env";

declare module "fastify" {
  interface FastifyInstance {
    /**
     * DB. controller 가 `request.server.db` 로 꺼내 service 에 넘긴다.
     * service·repository 는 인자로 받는다 (Fastify 를 import 하지 않는다).
     */
    db: Database;
  }
}

async function dbPlugin(app: FastifyInstance) {
  const db = createDatabase(databaseOptionsFromEnv());
  app.decorate("db", db);

  // 앱이 닫힐 때 연결 풀을 정리한다. 없으면 프로세스가 끝나지 않는다.
  app.addHook("onClose", async () => {
    await db.destroy();
  });
}

export default fp(dbPlugin, { name: "db" });
