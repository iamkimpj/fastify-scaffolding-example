// src/modules/example/example.test.ts — 예시 테스트

import { afterAll, afterEach, beforeAll, describe, expect, it, vi } from "vitest";
import { type App, buildApp } from "@/app";
import { env } from "@/configs/env.config";
import type { Database } from "@/db";
import type { ExampleRow } from "@/db/types/example.type";
import { signJwt } from "@/lib/jwt";
import exampleRepository from "@/modules/example/example.repository";

/**
 * 실제 DB 없이 route → controller → service 흐름을 확인한다.
 * repository 를 mock 으로 바꿔 끼우고, 트랜잭션은 같은 db 로 콜백을 바로 실행하게 흉내 낸다.
 * 실제 쿼리가 맞는지는 DB 가 있는 프로젝트에서 repository 테스트로 따로 확인한다.
 */

const row: ExampleRow = {
  id: 1,
  title: "예시",
  description: null,
  createdBy: "u1",
  createdAt: new Date("2026-10-08T00:00:00.000Z"),
};

describe("example 모듈", () => {
  let app: App;

  beforeAll(async () => {
    app = await buildApp();
    await app.ready();
  });

  afterAll(async () => {
    await app.close();
  });

  afterEach(() => {
    vi.restoreAllMocks();
  });

  describe("GET /api/examples/:id", () => {
    it("있으면 성공 봉투로 API 모양(createdAt 은 ISO 문자열)을 돌려준다", async () => {
      vi.spyOn(exampleRepository, "findById").mockResolvedValue(row);

      const res = await app.inject({ method: "GET", url: "/api/examples/1" });

      expect(res.statusCode).toBe(200);
      expect(res.json()).toEqual({
        isOk: true,
        data: {
          id: 1,
          title: "예시",
          description: null,
          createdBy: "u1",
          createdAt: "2026-10-08T00:00:00.000Z",
        },
      });
    });

    it("없으면 404 EXAMPLE_NOT_FOUND", async () => {
      vi.spyOn(exampleRepository, "findById").mockResolvedValue(undefined);

      const res = await app.inject({ method: "GET", url: "/api/examples/999" });

      expect(res.statusCode).toBe(404);
      expect(res.json()).toMatchObject({ isOk: false, errorCode: "EXAMPLE_NOT_FOUND" });
    });

    it("id 가 정수가 아니면 400 INVALID_REQUEST (repository 까지 가지 않는다)", async () => {
      const spy = vi.spyOn(exampleRepository, "findById");

      const res = await app.inject({ method: "GET", url: "/api/examples/abc" });

      expect(res.statusCode).toBe(400);
      expect(res.json()).toMatchObject({ isOk: false, errorCode: "INVALID_REQUEST" });
      expect(spy).not.toHaveBeenCalled();
    });
  });

  describe("POST /api/examples", () => {
    const userAuth = async () => ({
      authorization: `Bearer ${await signJwt({ sub: "u1" }, { secret: env.USER_JWT_SECRET, expiresInSeconds: 60 })}`,
    });

    /** 트랜잭션을 흉내 낸다: 같은 db 로 콜백을 바로 실행한다 */
    const mockTransaction = () =>
      vi.spyOn(app.db, "transaction").mockReturnValue({
        execute: (fn: (trx: Database) => Promise<unknown>) => fn(app.db),
      } as unknown as ReturnType<Database["transaction"]>);

    it("로그인하지 않으면 401 UNAUTHORIZED (본문 검증보다 먼저)", async () => {
      const res = await app.inject({ method: "POST", url: "/api/examples", payload: {} });

      expect(res.statusCode).toBe(401);
      expect(res.json()).toMatchObject({ isOk: false, errorCode: "UNAUTHORIZED" });
    });

    it("본문이 스키마에 맞지 않으면 400 INVALID_REQUEST", async () => {
      const res = await app.inject({
        method: "POST",
        url: "/api/examples",
        headers: await userAuth(),
        payload: { title: "" },
      });

      expect(res.statusCode).toBe(400);
      expect(res.json()).toMatchObject({ isOk: false, errorCode: "INVALID_REQUEST" });
    });

    it("로그인한 사용자 id 를 createdBy 로 넣고, 트랜잭션 안에서 만든 행을 돌려준다", async () => {
      mockTransaction();
      const insert = vi.spyOn(exampleRepository, "insert").mockResolvedValue(1);
      vi.spyOn(exampleRepository, "findById").mockResolvedValue(row);

      const res = await app.inject({
        method: "POST",
        url: "/api/examples",
        headers: await userAuth(),
        payload: { title: "예시" },
      });

      expect(res.statusCode).toBe(200);
      expect(res.json()).toMatchObject({ isOk: true, data: { id: 1, createdBy: "u1" } });
      expect(insert).toHaveBeenCalledWith(app.db, {
        title: "예시",
        description: null,
        createdBy: "u1",
      });
    });
  });
});
