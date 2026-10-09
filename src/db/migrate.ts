// src/db/migrate.ts — 마이그레이션 실행

import { promises as fs } from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";
import { FileMigrationProvider, Migrator } from "kysely/migration";
import { db } from "@/db/client";

/**
 * 마이그레이션을 실행한다. 앱과 별개로 단독 실행한다.
 *
 *   npm run db:migrate        → 최신까지 up
 *   npm run db:migrate:down   → 한 단계 down
 *
 * 실행 기록은 DB 의 kysely_migration 테이블에 남는다. 이미 실행된 파일은 다시 실행하지 않는다.
 */

const direction = process.argv[2];
if (direction !== "up" && direction !== "down") {
  console.error("사용법: tsx src/db/migrate.ts <up|down>");
  process.exit(1);
}

const migrator = new Migrator({
  db,
  provider: new FileMigrationProvider({
    fs,
    path,
    migrationFolder: fileURLToPath(new URL("./migrations", import.meta.url)),
  }),
});

const { error, results } =
  direction === "up" ? await migrator.migrateToLatest() : await migrator.migrateDown();

for (const result of results ?? []) {
  const mark = result.status === "Success" ? "✓" : "✗";
  console.log(`${mark} ${result.direction} ${result.migrationName} (${result.status})`);
}

await db.destroy();

if (error) {
  console.error("마이그레이션 실패:", error);
  process.exit(1);
}
