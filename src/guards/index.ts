// src/guards/index.ts — 가드 등록부

import adminGuard from "@/guards/admin.guard";
import userGuard from "@/guards/user.guard";
import type { Guard } from "@/lib/guard";

/**
 * 가드 등록부. Laravel 의 config/auth.php 의 guards 에 해당한다.
 *
 * 새 가드는 guards/<name>.guard.ts 를 만들고 여기에 한 줄 추가한다.
 * 키가 곧 가드 이름이다. request.auth("<이름>") / onlyLogin("<이름>") 에 쓰인다.
 */
export const guards = {
  user: userGuard,
  admin: adminGuard,
} satisfies Record<string, Guard<unknown>>;

export type GuardName = keyof typeof guards;

/** 가드 이름으로 그 가드가 돌려주는 신원 타입을 꺼낸다. */
export type IdentityOf<G extends GuardName> = (typeof guards)[G] extends Guard<infer I> ? I : never;
