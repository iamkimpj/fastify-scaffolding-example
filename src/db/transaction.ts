// src/db/transaction.ts — 트랜잭션 문맥

import { AsyncLocalStorage } from "node:async_hooks";
import type { Transaction } from "kysely";
import type { Database } from "@/db";
import { db } from "@/db/client";
import type { Db } from "@/db/types";

/**
 * 트랜잭션을 인자로 넘기지 않고 **비동기 흐름을 따라** 전달한다 (Node 내장 AsyncLocalStorage).
 *
 *   service     transaction(async () => { ... })   경계를 정한다
 *   repository  executor().selectFrom(...)         흐름 안이면 그 trx, 밖이면 기본 db
 *
 * 동시에 들어온 요청은 각자 자기 트랜잭션만 본다 (흐름마다 값이 따로다).
 */
const storage = new AsyncLocalStorage<Transaction<Db>>();

/**
 * 지금 쿼리에 쓸 대상. **repository 는 db 대신 항상 이것을 쓴다.**
 * transaction() 흐름 안이면 그 트랜잭션, 아니면 기본 db.
 */
export const executor = (): Database => storage.getStore() ?? db;

/**
 * fn 안의 모든 repository 호출을 한 트랜잭션으로 묶는다. **service 가 쓴다.**
 *
 * - fn 이 정상 종료하면 커밋, throw 하면 롤백 (에러는 그대로 위로 올라간다)
 * - **이미 트랜잭션 안이면 새로 열지 않고 합류한다.** service 가 다른 service 를 불러도
 *   전체가 한 트랜잭션이 된다. 단독으로 불리면 자기 트랜잭션을 연다
 *
 * 규칙:
 * - fn 안의 호출은 반드시 await 한다. 던져 두면 커밋 뒤에 실행되거나 트랜잭션 밖에서 실행된다
 * - fn 안에서 다른 service 의 에러를 삼키지 않는다. 합류한 쪽만 따로 롤백되지 않으므로,
 *   삼키고 계속하면 반쯤 쓴 데이터가 함께 커밋된다
 */
export const transaction = <T>(fn: () => Promise<T>): Promise<T> =>
  storage.getStore() ? fn() : db.transaction().execute((trx) => storage.run(trx, fn));
