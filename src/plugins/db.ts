// src/plugins/db.ts — DB 플러그인

import type { FastifyInstance } from "fastify";
import fp from "fastify-plugin";
import { db } from "@/db/client";

/**
 * 앱이 닫힐 때 DB 연결 풀을 정리한다. 없으면 프로세스가 끝나지 않는다.
 *
 * DB 인스턴스는 db/client.ts 에 하나 있고, repository 가 executor() 로 직접 쓴다.
 * controller·service 는 DB 를 모른다 (fastify.db 같은 데코레이터를 두지 않는다).
 */
async function dbPlugin(app: FastifyInstance) {
  app.addHook("onClose", async () => {
    await db.destroy();
  });
}

export default fp(dbPlugin, { name: "db" });
