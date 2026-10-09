// src/plugins/error-handler.test.ts — 에러 처리 플러그인 테스트

import Type from "typebox";
import { afterAll, beforeAll, describe, expect, it } from "vitest";
import { ERROR_CODE } from "@/api-contracts";
import { type App, buildApp } from "@/app";
import { AppError } from "@/lib/errors";

describe("error-handler", () => {
  let app: App;

  beforeAll(async () => {
    app = await buildApp();

    // 이 테스트에서만 쓰는 경로들
    app.get(
      "/test/query",
      {
        schema: {
          querystring: Type.Object({
            pageSize: Type.Union([Type.Literal(10), Type.Literal(20), Type.Literal(50)]),
          }),
        },
      },
      async () => "ok",
    );
    app.post(
      "/test/body",
      {
        schema: {
          body: Type.Object({
            email: Type.String(),
            name: Type.String({ minLength: 1 }),
          }),
        },
      },
      async () => "ok",
    );
    app.get("/test/app-error", async () => {
      throw new AppError(409, ERROR_CODE.INVALID_REQUEST, "이미 존재합니다", { field: "email" });
    });
    app.get("/test/crash", async () => {
      throw new Error("db down");
    });
    app.get("/test/crash-empty-message", async () => {
      // DB 접속 실패 때 Node 가 던지는 모양: message 는 비고 code 에만 원인이 있다
      throw Object.assign(new AggregateError([new Error("connect ECONNREFUSED ::1:3306")], ""), {
        code: "ECONNREFUSED",
      });
    });
    app.get("/test/crash-nothing", async () => {
      throw new Error("");
    });

    await app.ready();
  });

  afterAll(async () => {
    await app.close();
  });

  describe("스키마 검증 실패 → 400 INVALID_REQUEST", () => {
    it("Union 위반은 분기별 반복 오류 대신 한 줄로 줄인다", async () => {
      const res = await app.inject({ method: "GET", url: "/test/query?pageSize=7" });

      expect(res.statusCode).toBe(400);
      expect(res.json()).toEqual({
        isOk: false,
        errorCode: "INVALID_REQUEST",
        errorMessage: "pageSize must be one of the allowed values",
      });
    });

    it("필수 값 누락은 검증기 문구를 그대로 쓴다", async () => {
      const res = await app.inject({ method: "POST", url: "/test/body", payload: { name: "a" } });

      expect(res.statusCode).toBe(400);
      expect(res.json().errorMessage).toBe("must have required property 'email'");
    });

    it("필드 오류는 필드 이름을 앞에 붙인다", async () => {
      const res = await app.inject({
        method: "POST",
        url: "/test/body",
        payload: { email: "a@b.c", name: "" },
      });

      expect(res.statusCode).toBe(400);
      expect(res.json().errorMessage).toBe("name must NOT have fewer than 1 characters");
    });
  });

  it("AppError 는 들고 온 상태 코드·errorCode·data 로 응답한다", async () => {
    const res = await app.inject({ method: "GET", url: "/test/app-error" });

    expect(res.statusCode).toBe(409);
    expect(res.json()).toEqual({
      isOk: false,
      errorCode: "INVALID_REQUEST",
      errorMessage: "이미 존재합니다",
      data: { field: "email" },
    });
  });

  it("Fastify 가 판단한 4xx (깨진 JSON) 는 상태 코드를 살려 INVALID_REQUEST 로 응답한다", async () => {
    const res = await app.inject({
      method: "POST",
      url: "/test/body",
      payload: "{bad",
      headers: { "content-type": "application/json" },
    });

    expect(res.statusCode).toBe(400);
    expect(res.json()).toMatchObject({ isOk: false, errorCode: "INVALID_REQUEST" });
  });

  it("예상하지 못한 오류는 500 INTERNAL_ERROR 로 응답한다 (개발 환경: 원래 메시지)", async () => {
    const res = await app.inject({ method: "GET", url: "/test/crash" });

    expect(res.statusCode).toBe(500);
    expect(res.json()).toEqual({
      isOk: false,
      errorCode: "INTERNAL_ERROR",
      errorMessage: "db down",
    });
  });

  it("메시지가 빈 500 은 error.code 로 채운다 (DB 접속 실패 AggregateError)", async () => {
    const res = await app.inject({ method: "GET", url: "/test/crash-empty-message" });

    expect(res.statusCode).toBe(500);
    expect(res.json().errorMessage).toBe("ECONNREFUSED");
  });

  it("메시지도 code 도 없는 500 은 고정 문구로 채운다", async () => {
    const res = await app.inject({ method: "GET", url: "/test/crash-nothing" });

    expect(res.statusCode).toBe(500);
    expect(res.json().errorMessage).toBe("요청을 처리하지 못했습니다");
  });

  it("없는 경로는 404 ROUTE_NOT_FOUND 로 응답하고 주소를 되비추지 않는다", async () => {
    const res = await app.inject({ method: "GET", url: "/api/nope" });

    expect(res.statusCode).toBe(404);
    expect(res.json()).toEqual({
      isOk: false,
      errorCode: "ROUTE_NOT_FOUND",
      errorMessage: "요청한 경로가 없습니다",
    });
  });
});
