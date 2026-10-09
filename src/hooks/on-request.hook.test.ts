// src/hooks/on-request.hook.test.ts — onRequest 훅 테스트

import { afterAll, beforeAll, describe, expect, it, vi } from "vitest";
import { type App, buildApp } from "@/app";
import { env } from "@/configs/env.config";
import { guards } from "@/guards";
import onRequestHook from "@/hooks/on-request.hook";
import { signJwt } from "@/lib/jwt";

const bearer = async (secret: string, claims: Record<string, unknown>) => ({
  authorization: `Bearer ${await signJwt(claims, { secret, expiresInSeconds: 60 })}`,
});

describe("onRequestHook.onlyLogin(guard)", () => {
  let app: App;

  beforeAll(async () => {
    app = await buildApp();

    app.get("/test/admin", { onRequest: onRequestHook.onlyLogin("admin") }, async (request) => ({
      admin: await request.authOrFail("admin"),
    }));
    app.get("/test/user", { onRequest: onRequestHook.onlyLogin("user") }, async () => "ok");

    await app.ready();
  });

  afterAll(async () => {
    await app.close();
  });

  it("토큰이 없으면 401 UNAUTHORIZED 실패 봉투", async () => {
    const res = await app.inject({ method: "GET", url: "/test/admin" });

    expect(res.statusCode).toBe(401);
    expect(res.json()).toEqual({
      isOk: false,
      errorCode: "UNAUTHORIZED",
      errorMessage: "로그인이 필요합니다",
    });
  });

  it("다른 가드의 토큰으로는 지나갈 수 없다", async () => {
    const res = await app.inject({
      method: "GET",
      url: "/test/admin",
      headers: await bearer(env.USER_JWT_SECRET, { sub: "u1" }),
    });

    expect(res.statusCode).toBe(401);
  });

  it("맞는 가드의 토큰이면 지나가고, 핸들러는 캐시된 신원을 받는다", async () => {
    const spy = vi.spyOn(guards, "admin");

    const res = await app.inject({
      method: "GET",
      url: "/test/admin",
      headers: await bearer(env.ADMIN_JWT_SECRET, { sub: "a1", role: "staff" }),
    });

    expect(res.statusCode).toBe(200);
    expect(res.json()).toEqual({ admin: { id: "a1", role: "staff" } });
    // onlyLogin 에서 한 번, 핸들러에서는 캐시
    expect(spy).toHaveBeenCalledTimes(1);
    spy.mockRestore();
  });

  it("user 가드 경로는 user 토큰으로 지나간다", async () => {
    const res = await app.inject({
      method: "GET",
      url: "/test/user",
      headers: await bearer(env.USER_JWT_SECRET, { sub: "u1" }),
    });

    expect(res.statusCode).toBe(200);
  });
});
