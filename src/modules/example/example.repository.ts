// src/modules/example/example.repository.ts — 예시 리포지토리

import type { Database } from "@/db";
import type { NewExampleRow } from "@/db/types/example.type";

/**
 * examples 테이블 쿼리.
 *
 * repository 는 **쿼리만** 한다. 없으면 undefined 를 돌려줄 뿐, 그것이 오류인지는 service 가 판단한다.
 * DB 는 인자로 받는다. service 가 트랜잭션(trx)을 넘기면 그 트랜잭션 안에서 실행된다.
 */

const findById = (db: Database, id: number) =>
  db.selectFrom("examples").selectAll().where("id", "=", id).executeTakeFirst();

/** MySQL 은 RETURNING 이 없어 만든 행 대신 insertId 를 돌려준다. */
const insert = async (db: Database, values: NewExampleRow): Promise<number> => {
  const result = await db.insertInto("examples").values(values).executeTakeFirstOrThrow();
  return Number(result.insertId);
};

export default {
  findById,
  insert,
};
