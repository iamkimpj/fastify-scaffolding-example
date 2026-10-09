// src/modules/index.ts — 모듈 등록부

import type { FastifyPluginAsyncTypebox } from "@fastify/type-provider-typebox";
import exampleRoute from "@/modules/example/example.route";

/**
 * 모든 기능 모듈을 등록한다. app.ts 에서 /api prefix 로 등록된다.
 * 새 모듈은 여기에 한 줄씩 추가한다.
 */
const modules: FastifyPluginAsyncTypebox = async (app) => {
  await app.register(exampleRoute);
};

export default modules;
