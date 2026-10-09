// src/server.ts — 서버 진입점

import { buildApp } from "@/app";
import { env } from "@/configs/env.config";

const app = await buildApp();

const shutdown = async (signal: NodeJS.Signals) => {
  app.log.info(`${signal} 수신, 서버를 종료합니다.`);
  try {
    await app.close();
    process.exit(0);
  } catch (err) {
    app.log.error(err, "종료 중 오류");
    process.exit(1);
  }
};

process.once("SIGINT", shutdown);
process.once("SIGTERM", shutdown);

try {
  await app.listen({ host: env.HOST, port: env.PORT });
} catch (err) {
  app.log.error(err);
  process.exit(1);
}
