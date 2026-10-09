// src/db/migrations/2026-10-08-001-create-examples.ts — examples 테이블 생성

import { type Kysely, sql } from "kysely";

/**
 * 마이그레이션 파일 예시.
 *
 * - 파일 이름: `<날짜>-<순번>-<내용 kebab-case>.ts`. 이름 순서대로 실행되므로 날짜·순번을 앞에 둔다.
 * - **한 번 실행된 파일은 고치지 않는다.** 바꿀 게 있으면 새 마이그레이션을 추가한다.
 * - `up` 과 `down` 을 함께 쓴다. `down` 은 `up` 을 정확히 되돌린다.
 * - DB 타입(`Kysely<Db>`)을 쓰지 않는다. 마이그레이션은 **그 시점의** 스키마를 다루므로,
 *   나중에 바뀐 `db/types/` 에 묶이면 안 된다.
 * - 컬럼 이름은 snake_case 로 직접 쓴다.
 */

export async function up(db: Kysely<unknown>): Promise<void> {
  await db.schema
    .createTable("examples")
    .addColumn("id", "integer", (col) => col.primaryKey().autoIncrement())
    .addColumn("title", "varchar(100)", (col) => col.notNull())
    .addColumn("description", "text")
    .addColumn("created_by", "varchar(64)", (col) => col.notNull())
    .addColumn("created_at", "datetime", (col) => col.notNull().defaultTo(sql`CURRENT_TIMESTAMP`))
    .execute();

  await db.schema
    .createIndex("examples_created_by_idx")
    .on("examples")
    .column("created_by")
    .execute();
}

export async function down(db: Kysely<unknown>): Promise<void> {
  await db.schema.dropTable("examples").execute();
}
