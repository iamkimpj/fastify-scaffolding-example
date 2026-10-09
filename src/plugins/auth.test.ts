// src/plugins/auth.test.ts — 인증 플러그인 테스트

import { afterAll, beforeAll, describe, expect, it, vi } from "vitest";
import { type App, buildApp } from "@/app";
import { env } from "@/configs/env.config";
import { guards } from "@/guards";
import { signJwt } from "@/lib/jwt";

const userToken = (claims: Record<string, unknown> = { sub: "u1" }, expiresInSeconds = 60) =>
  signJwt(claims, { secret: env.USER_JWT_SECRET, expiresInSeconds });

const adminToken = (claims: Record<string, unknown> = { sub: "a1", role: "super" }) =>
  signJwt(claims, { secret: env.ADMIN_JWT_SECRET, expiresInSeconds: 60 });

describe("request.auth(guard)", () => {
  let app: App;

  beforeAll(async () => {
    app = await buildApp();

    // 가드별 신원을 그대로 돌려주는 테스트 경로
    app.get("/test/whoami", async (request) => ({
      user: await request.auth("user"),
      admin: await request.auth("admin"),
    }));

    // 같은 요청에서 여러 번 부른다
    app.get("/test/twice", async (request) => {
      const [a, b] = await Promise.all([request.auth("user"), request.auth("user")]);
      const c = await request.auth("user");
      return { same: a === b && b === c };
    });

    app.get("/test/or-fail", async (request) => {
      const admin = await request.authOrFail("admin");
      return { role: admin.role }; // null 검사 없이 접근
    });

    await app.ready();
  });

  afterAll(async () => {
    await app.close();
  });

  const whoami = (token?: string) =>
    app.inject({
      method: "GET",
      url: "/test/whoami",
      headers: token ? { authorization: `Bearer ${token}` } : {},
    });

  it("토큰이 없으면 모든 가드가 null 이고 막지 않는다", async () => {
    const res = await whoami();

    expect(res.statusCode).toBe(200);
    expect(res.json()).toEqual({ user: null, admin: null });
  });

  it("user 토큰은 user 가드만 통과한다", async () => {
    const res = await whoami(await userToken());

    expect(res.json()).toEqual({ user: { id: "u1" }, admin: null });
  });

  it("admin 토큰은 admin 가드만 통과한다", async () => {
    const res = await whoami(await adminToken());

    expect(res.json()).toEqual({ user: null, admin: { id: "a1", role: "super" } });
  });

  it("만료된 토큰은 null", async () => {
    const res = await whoami(await userToken({ sub: "u1" }, -10));

    expect(res.json().user).toBeNull();
  });

  it("서명은 맞아도 claim 모양이 스키마와 다르면 null", async () => {
    const res = await whoami(await adminToken({ sub: "a1", role: "hacker" }));

    expect(res.json().admin).toBeNull();
  });

  it("깨진 토큰은 null", async () => {
    const res = await whoami("not-a-jwt");

    expect(res.json()).toEqual({ user: null, admin: null });
  });

  it("한 요청 안에서는 가드를 한 번만 실행하고 같은 결과를 돌려준다", async () => {
    const spy = vi.spyOn(guards, "user");

    const res = await app.inject({
      method: "GET",
      url: "/test/twice",
      headers: { authorization: `Bearer ${await userToken()}` },
    });

    expect(res.json()).toEqual({ same: true });
    expect(spy).toHaveBeenCalledTimes(1);
    spy.mockRestore();
  });

  it("캐시는 요청마다 따로다", async () => {
    const spy = vi.spyOn(guards, "user");

    await whoami(await userToken());
    await whoami(await userToken());

    expect(spy).toHaveBeenCalledTimes(2);
    spy.mockRestore();
  });

  describe("request.authOrFail(guard)", () => {
    it("인증되면 신원을 돌려준다", async () => {
      const res = await app.inject({
        method: "GET",
        url: "/test/or-fail",
        headers: { authorization: `Bearer ${await adminToken()}` },
      });

      expect(res.statusCode).toBe(200);
      expect(res.json()).toEqual({ role: "super" });
    });

    it("인증되지 않으면 401 UNAUTHORIZED 실패 봉투", async () => {
      const res = await app.inject({ method: "GET", url: "/test/or-fail" });

      expect(res.statusCode).toBe(401);
      expect(res.json()).toMatchObject({ isOk: false, errorCode: "UNAUTHORIZED" });
    });
  });
});
