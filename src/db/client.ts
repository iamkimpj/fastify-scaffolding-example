// src/db/client.ts — DB 인스턴스 (앱 전체 공용)

import { createDatabase } from "@/db";
import { databaseOptionsFromEnv } from "@/db/env";

/**
 * 앱 전체가 쓰는 DB 인스턴스 하나. **repository 는 이것을 직접 쓰지 않고 `executor()` 로 받는다**
 * (db/transaction.ts). 그래야 트랜잭션 안에서 불렸을 때 같은 트랜잭션을 쓴다.
 *
 * - 연결 풀은 첫 쿼리 때 접속한다. import 만으로는 접속하지 않는다
 * - 앱이 닫힐 때 plugins/db.ts 가 `db.destroy()` 로 정리한다
 * - 단독 스크립트(migrate.ts, seeds)도 이것을 쓰고 끝나면 `destroy()` 한다
 */
export const db = createDatabase(databaseOptionsFromEnv());
