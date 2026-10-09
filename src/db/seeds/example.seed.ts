// src/db/seeds/example.seed.ts — examples 시드

import type { Database } from "@/db";
import type { NewExampleRow } from "@/db/types/example.type";

/**
 * examples 테이블 개발용 데이터.
 *
 * 몇 번을 실행해도 결과가 같도록, 넣기 전에 이 시드가 넣었던 행을 지운다.
 * 시드가 넣은 행은 createdBy = "seed" 로 구분한다.
 */

const rows: NewExampleRow[] = [
  { title: "첫 번째 예시", description: "seed 로 넣은 데이터", createdBy: "seed" },
  { title: "두 번째 예시", description: null, createdBy: "seed" },
];

const run = async (db: Database): Promise<number> => {
  await db.deleteFrom("examples").where("createdBy", "=", "seed").execute();
  await db.insertInto("examples").values(rows).execute();
  return rows.length;
};

export default {
  run,
};
