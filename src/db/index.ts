// src/db/index.ts — DB 인스턴스

import { CamelCasePlugin, Kysely, MysqlDialect } from "kysely";
import { createPool } from "mysql2";
import type { Db } from "@/db/types";

/**
 * src/db 는 src/db 바깥을 import 하지 않는다 (Biome 로 막혀 있다).
 * 모노레포가 되면 이 디렉토리를 그대로 packages/db 로 옮긴다. → docs/monorepo.md
 */

/** 앱 전체가 쓰는 DB 타입. 트랜잭션(`Transaction<Db>`)도 이 타입으로 받을 수 있다. */
export type Database = Kysely<Db>;

/** 접속 정보. 환경변수에서 읽는 일은 부르는 쪽이 한다 (db/env.ts 의 databaseOptionsFromEnv) */
export type DatabaseOptions = {
  host: string;
  port: number;
  database: string;
  user: string;
  password: string;
  connectionLimit?: number;
};

/**
 * 앱이 보내고 받는 Date 의 해석 기준. **UTC 로 못박는다.**
 * 비워 두면 mysql2 는 앱이 도는 기계의 시간대로 적어, 환경마다 다른 값이 저장된다.
 */
const JS_DATE_TIME_ZONE = "Z";

/**
 * MySQL 세션의 시간대. **이것도 UTC 로 못박는다.** 위 값과 다른 것이다.
 * 이쪽은 MySQL 이 스스로 넣는 값(`DEFAULT CURRENT_TIMESTAMP` 인 created_at)의 기준이다.
 * 둘이 어긋나면 같은 행에서 앱이 넣은 값과 MySQL 이 넣은 값이 다른 시간대로 적힌다
 * (DB 서버가 KST 면 9시간 차이). DB 서버 설정에 기대지 않고 연결마다 건다.
 */
const MYSQL_SESSION_TIME_ZONE = "+00:00";

/**
 * Kysely 인스턴스를 만든다. **환경변수를 읽지 않는다.** 접속 정보는 인자로 받는다.
 *
 * - 연결 풀은 **첫 쿼리 때 접속한다.** DB 가 없어도 서버는 뜨고, 쿼리하는 순간에만 실패한다.
 * - CamelCasePlugin: 코드의 camelCase ↔ DB 의 snake_case 를 자동 변환한다 (`createdAt` ↔ `created_at`).
 *
 * 앱 전체가 쓰는 인스턴스는 db/client.ts 가 한 번 만든다.
 * 모노레포에서 다른 설정으로 인스턴스가 필요하면 이 함수를 직접 부른다.
 */
export const createDatabase = (options: DatabaseOptions): Database => {
  // 시간대는 받은 옵션보다 뒤에 둔다. 부르는 쪽이 덮어쓰면 환경마다 달라진다.
  const pool = createPool({
    connectionLimit: 10,
    ...options,
    dateStrings: false,
    timezone: JS_DATE_TIME_ZONE,
  });

  // 연결이 새로 열릴 때마다 건다. 풀은 연결을 여럿 만들고, 끊겼다가 다시 열기도 한다.
  pool.on("connection", (connection) => {
    connection.query(`SET time_zone = '${MYSQL_SESSION_TIME_ZONE}'`);
  });

  return new Kysely<Db>({
    dialect: new MysqlDialect({ pool }),
    plugins: [new CamelCasePlugin()],
  });
};
