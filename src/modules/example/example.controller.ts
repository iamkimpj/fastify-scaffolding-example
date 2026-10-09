// src/modules/example/example.controller.ts — 예시 컨트롤러

import type { Handler } from "@/lib/handler";
import type { getExampleSchema, postExampleSchema } from "@/modules/example/example.schema";
import exampleService from "@/modules/example/example.service";

/**
 * 예시 컨트롤러.
 *
 * controller 는 요청에서 값을 꺼내 service 에 넘기고, 결과를 reply.ok() 로 보낸다.
 * - DB 는 `request.server.db` 로 꺼내 넘긴다
 * - 신원은 `request.authOrFail(가드)` 로 꺼낸다 (route 의 onlyLogin 이 이미 확인해 캐시에 있다)
 * - 비즈니스 로직과 try/catch 는 두지 않는다. 실패는 service 가 던진 AppError 를 error-handler 가 처리한다
 */

const getExample: Handler<typeof getExampleSchema> = async (request, reply) => {
  const example = await exampleService.getExample(request.server.db, request.params.id);
  return reply.ok(example);
};

const postExample: Handler<typeof postExampleSchema> = async (request, reply) => {
  const user = await request.authOrFail("user");
  const example = await exampleService.createExample(request.server.db, request.body, user.id);
  return reply.ok(example);
};

export default {
  getExample,
  postExample,
};
