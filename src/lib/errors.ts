// src/lib/errors.ts — 애플리케이션 에러

import type { ErrorCode } from "@/api-contracts";

/**
 * 애플리케이션 에러. service 에서 throw 하면
 * plugins/error-handler.ts 가 실패 봉투로 바꿔 응답한다.
 *
 * service 는 Fastify 를 모른다. reply 를 받지 않고 이 에러만 던진다.
 *
 * @example
 * throw new AppError(404, ERROR_CODE.USER_NOT_FOUND, "유저가 없습니다");
 */
export class AppError extends Error {
  constructor(
    public readonly statusCode: number,
    public readonly errorCode: ErrorCode,
    errorMessage: string,
    /** 무엇이 잘못됐는지 덧붙일 것이 있을 때만 */
    public readonly data?: unknown,
  ) {
    super(errorMessage);
    this.name = "AppError";
  }
}
