// src/db/types/example.type.ts — examples 테이블 타입

import type { ColumnType, Generated, Insertable, Selectable } from "kysely";

/**
 * examples 테이블. **손으로 작성한다.** 마이그레이션을 추가·변경하면 여기도 함께 고친다.
 *
 * - DB 컬럼은 snake_case 지만 여기 키는 camelCase 다. CamelCasePlugin 이 쿼리할 때 변환한다.
 * - `Generated<T>` — DB 가 채우는 값 (insert 때 생략 가능)
 * - `ColumnType<읽을때, insert, update>` — 읽기/쓰기 타입이 다를 때. `never` 는 "쓸 수 없음"
 */
export interface ExamplesTable {
  id: Generated<number>;
  title: string;
  description: string | null;
  /** 만든 사용자 id (user 가드의 신원) */
  createdBy: string;
  createdAt: ColumnType<Date, never, never>;
}

/** 쿼리 결과 행 */
export type ExampleRow = Selectable<ExamplesTable>;
/** insert 할 값 */
export type NewExampleRow = Insertable<ExamplesTable>;
