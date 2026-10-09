// src/db/transaction.test.ts — 트랜잭션 문맥 테스트

import { afterEach, describe, expect, it, vi } from "vitest";
import type { Database } from "@/db";
import { db } from "@/db/client";
import { executor, transaction } from "@/db/transaction";

/**
 * DB 에 접속하지 않고 문맥 전달만 확인한다.
 * db.transaction() 을 가짜 trx 로 콜백을 실행하게 바꿔 끼운다.
 */

const fakeTrx = { fake: "trx" } as unknown as Database;

const mockTransaction = () =>
  vi.spyOn(db, "transaction").mockReturnValue({
    execute: (fn: (trx: Database) => Promise<unknown>) => fn(fakeTrx),
  } as unknown as ReturnType<Database["transaction"]>);

afterEach(() => {
  vi.restoreAllMocks();
});

describe("executor()", () => {
  it("transaction() 밖에서는 기본 db", () => {
    expect(executor()).toBe(db);
  });

  it("transaction() 안에서는 await 너머까지 그 trx", async () => {
    mockTransaction();

    await transaction(async () => {
      expect(executor()).toBe(fakeTrx);
      await new Promise((resolve) => setTimeout(resolve, 5));
      expect(executor()).toBe(fakeTrx);
    });

    expect(executor()).toBe(db);
  });
});

describe("transaction()", () => {
  it("이미 트랜잭션 안이면 새로 열지 않고 합류한다 (service 가 service 를 부르는 경우)", async () => {
    const spy = mockTransaction();

    const inner = () => transaction(async () => executor());
    const outer = () => transaction(async () => [executor(), await inner()]);

    expect(await outer()).toEqual([fakeTrx, fakeTrx]);
    expect(spy).toHaveBeenCalledTimes(1);
  });

  it("단독으로 불리면 자기 트랜잭션을 연다", async () => {
    const spy = mockTransaction();

    await transaction(async () => undefined);
    await transaction(async () => undefined);

    expect(spy).toHaveBeenCalledTimes(2);
  });

  it("동시에 진행되는 흐름은 서로의 trx 를 보지 않는다", async () => {
    const trxA = { name: "A" } as unknown as Database;
    const trxB = { name: "B" } as unknown as Database;
    vi.spyOn(db, "transaction")
      .mockReturnValueOnce({
        execute: (fn: (trx: Database) => Promise<unknown>) => fn(trxA),
      } as unknown as ReturnType<Database["transaction"]>)
      .mockReturnValueOnce({
        execute: (fn: (trx: Database) => Promise<unknown>) => fn(trxB),
      } as unknown as ReturnType<Database["transaction"]>);

    const read = () =>
      transaction(async () => {
        await new Promise((resolve) => setTimeout(resolve, Math.random() * 10));
        return executor();
      });

    expect(await Promise.all([read(), read()])).toEqual([trxA, trxB]);
  });

  it("fn 이 throw 하면 에러가 그대로 올라간다 (롤백은 Kysely 가 한다)", async () => {
    mockTransaction();

    await expect(
      transaction(async () => {
        throw new Error("boom");
      }),
    ).rejects.toThrow("boom");
  });
});
