// src/plugins/error-handler.ts — 에러 처리 플러그인

import type { FastifyError, FastifyInstance } from "fastify";
import fp from "fastify-plugin";
import { ERROR_CODE, type ErrorCode, type ErrorResponse } from "@/api-contracts";
import { isProduction } from "@/configs/env.config";
import { AppError } from "@/lib/errors";

// ------------------------------------------------------------------
// 실패 봉투
// ------------------------------------------------------------------

/** 실패 봉투를 만든다. data 가 없으면 키 자체를 만들지 않는다. */
const errorBody = (errorCode: ErrorCode, errorMessage: string, data?: unknown): ErrorResponse => {
  const body: ErrorResponse = { isOk: false, errorCode, errorMessage };
  if (data !== undefined) body.data = data;
  return body;
};

// ------------------------------------------------------------------
// 검증 실패 문구 정리
// ------------------------------------------------------------------

type ValidationEntry = NonNullable<FastifyError["validation"]>[number];

/** 허용값은 나열하지 않는다. 무엇이 허용되는지는 스키마(Swagger)에 있다. */
const ONE_OF_ALLOWED = "must be one of the allowed values";

/** 오류가 있는데 문구를 만들지 못했을 때. 빈 문자열을 내보내지 않기 위한 값이다. */
const FALLBACK = "request is invalid";

/** `/pageSize` → `pageSize`, `/items/0` → `items/0` */
const toFieldName = (instancePath: string) => instancePath.replace(/^\//, "");

/**
 * 합집합 분기 **안에서** 난 오류인지. 이런 오류는 버린다.
 * 값이 멀쩡한 숫자여도 Literal 분기와 견주다 `must be number` 같은 엉뚱한 문구가 섞이기 때문이다.
 */
const isInsideUnion = (entry: ValidationEntry) => entry.schemaPath.includes("/anyOf/");

/**
 * 스키마 검증 실패를 **필드당 한 줄**로 줄여 실패 봉투의 errorMessage 로 쓴다.
 *
 * **왜 줄이나.** 검증기는 합집합(Type.Union) 분기마다 오류를 하나씩 낸다.
 * 값 하나가 틀렸을 뿐인데 같은 말이 여러 번 반복되어 어느 필드가 틀렸는지가 묻힌다.
 *
 * **문구는 영어다.** 검증기가 만든 것을 그대로 쓴다. 이 값은 사용자에게 보일 것이 아니라
 * 보낸 쪽(개발자)이 무엇을 잘못 보냈는지 알아보는 값이다.
 *
 * 검증기는 첫 오류에서 멈춘다(ajv allErrors: false, Fastify 기본값). 큰 본문 검증 비용을 막기 위해 유지한다.
 *
 * @example
 * // ?pageSize=7 (Union 위반) → "pageSize must be one of the allowed values"
 */
const toValidationMessage = (validation: ValidationEntry[]): string => {
  // 필드가 처음 나온 순서를 지킨다.
  const messageByField = new Map<string, string>();

  for (const entry of validation) {
    const field = toFieldName(entry.instancePath);

    // 합집합에 맞지 않는다는 뜻. 분기 안의 반복 오류들을 이 한 줄이 대신한다.
    if (entry.keyword === "anyOf" || entry.keyword === "const" || entry.keyword === "enum") {
      messageByField.set(field, ONE_OF_ALLOWED);
      continue;
    }

    if (isInsideUnion(entry)) continue;

    // 한 필드에 여러 건이 와도 첫 번째만 쓴다.
    if (!messageByField.has(field)) {
      messageByField.set(field, entry.message ?? FALLBACK);
    }
  }

  const lines = [...messageByField].map(([field, message]) =>
    // 필수 값 누락은 instancePath 가 비어 있고 문구에 필드 이름이 들어 있다.
    field === "" ? message : `${field} ${message}`,
  );

  return lines.length > 0 ? lines.join(", ") : FALLBACK;
};

// ------------------------------------------------------------------
// 500 문구
// ------------------------------------------------------------------

const INTERNAL_ERROR_MESSAGE = "요청을 처리하지 못했습니다";

/**
 * 개발 환경에서 500 의 errorMessage. 원래 메시지를 보여 준다.
 *
 * **메시지가 빈 에러가 있다.** 예: DB 에 접속하지 못하면 Node 가 IPv6·IPv4 시도 실패를
 * AggregateError 로 묶어 던지는데, 그 message 는 빈 문자열이고 code 에만 `ECONNREFUSED` 가 있다.
 * 빈 문구로는 원인을 알 수 없으므로 code 로, 그것도 없으면 고정 문구로 채운다. 자세한 내용은 로그에 있다.
 */
const developmentMessage = (error: { message?: string; code?: unknown }): string =>
  error.message || (typeof error.code === "string" && error.code) || INTERNAL_ERROR_MESSAGE;

// ------------------------------------------------------------------
// 플러그인
// ------------------------------------------------------------------

/**
 * 모든 오류를 실패 봉투 `{ isOk: false, errorCode, errorMessage, data? }` 로 바꾼다.
 *
 * **상태 코드는 오류가 들고 온 것을 살려 쓴다.** 무조건 500 으로 덮으면
 * "보낸 쪽 잘못(4xx)" 과 "서버 고장(5xx)" 을 구분할 수 없다.
 */
async function errorHandler(app: FastifyInstance) {
  app.setErrorHandler<FastifyError | AppError>((error, request, reply) => {
    // 1) service 가 의도해서 던진 에러
    if (error instanceof AppError) {
      return reply
        .status(error.statusCode)
        .send(errorBody(error.errorCode, error.message, error.data));
    }

    // 2) 스키마 검증 실패 (body/querystring/params/headers)
    if (error.validation) {
      return reply
        .status(400)
        .send(errorBody(ERROR_CODE.INVALID_REQUEST, toValidationMessage(error.validation)));
    }

    // 3) Fastify 가 4xx 로 판단한 것 (깨진 JSON, content-type 불일치, payload 초과 등)
    const statusCode = error.statusCode ?? 500;
    if (statusCode < 500) {
      return reply.status(statusCode).send(errorBody(ERROR_CODE.INVALID_REQUEST, error.message));
    }

    // 4) 진짜 서버 오류. 로그는 이때만 남기고, 운영에서는 내부 메시지를 숨긴다.
    request.log.error({ err: error }, "Unhandled error");
    return reply
      .status(500)
      .send(
        errorBody(
          ERROR_CODE.INTERNAL_ERROR,
          isProduction ? INTERNAL_ERROR_MESSAGE : developmentMessage(error),
        ),
      );
  });

  /**
   * 등록되지 않은 경로. 위 setErrorHandler 와 짝이다.
   * 라우터가 경로를 못 찾으면 핸들러에 들어가지 않으므로 여기서 따로 봉투로 만든다.
   * 받은 주소를 그대로 되비추지 않도록 문구에 URL 을 넣지 않는다.
   */
  app.setNotFoundHandler((_request, reply) =>
    reply.status(404).send(errorBody(ERROR_CODE.ROUTE_NOT_FOUND, "요청한 경로가 없습니다")),
  );
}

export default fp(errorHandler, { name: "error-handler" });
