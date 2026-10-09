// src/db/types/index.ts — DB 타입 (전체 테이블)

import type { ExamplesTable } from "@/db/types/example.type";

/**
 * 모든 테이블. 키가 테이블 이름이다.
 *
 * 테이블 타입은 `types/<테이블 단수>.type.ts` 에 테이블별로 나눠 두고, 여기에 한 줄씩 등록한다.
 */
export interface Db {
  examples: ExamplesTable;
}
