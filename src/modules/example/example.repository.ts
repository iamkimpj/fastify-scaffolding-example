// src/modules/example/example.repository.ts — 예시 리포지토리

import { executor } from "@/db/transaction";
import type { NewExampleRow } from "@/db/types/example.type";

/**
 * examples 테이블 쿼리.
 *
 * repository 는 **쿼리만** 한다. 없으면 undefined 를 돌려줄 뿐, 그것이 오류인지는 service 가 판단한다.
 * DB 는 인자로 받지 않고 `executor()` 로 가져온다. service 의 transaction() 안에서 불리면
 * 그 트랜잭션을, 밖에서 불리면 기본 db 를 쓴다. repository 는 어느 쪽인지 몰라도 된다.
 */

const findById = (id: number) =>
  executor().selectFrom("examples").selectAll().where("id", "=", id).executeTakeFirst();

/** MySQL 은 RETURNING 이 없어 만든 행 대신 insertId 를 돌려준다. */
const insert = async (values: NewExampleRow): Promise<number> => {
  const result = await executor().insertInto("examples").values(values).executeTakeFirstOrThrow();
  return Number(result.insertId);
};

export default {
  findById,
  insert,
};
