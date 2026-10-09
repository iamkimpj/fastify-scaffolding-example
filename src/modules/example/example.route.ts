// src/modules/example/example.route.ts — 예시 라우트

import type { FastifyPluginAsyncTypebox } from "@fastify/type-provider-typebox";
import onRequestHook from "@/hooks/on-request.hook";
import exampleController from "@/modules/example/example.controller";
import { getExampleSchema, postExampleSchema } from "@/modules/example/example.schema";

/**
 * 예시 경로.
 *
 * route 는 URL·메서드·스키마·훅을 컨트롤러에 연결만 한다. 로직을 두지 않는다.
 * 로그인이 필요한 경로는 onRequest 에 onlyLogin(가드) 를 붙인다.
 */
const exampleRoute: FastifyPluginAsyncTypebox = async (app) => {
  app.get("/examples/:id", { schema: getExampleSchema }, exampleController.getExample);

  app.post(
    "/examples",
    { onRequest: onRequestHook.onlyLogin("user"), schema: postExampleSchema },
    exampleController.postExample,
  );
};

export default exampleRoute;
