// src/db/env.ts — DB 접속 환경변수

import Type from "typebox";
import { Value } from "typebox/value";
import type { DatabaseOptions } from "@/db";

/**
 * DB 접속 환경변수(DB_*)를 읽어 createDatabase 에 넘길 값으로 바꾼다.
 *
 * DB_* 는 src/db 가 관리한다 (configs/env.config.ts 에 두지 않는다).
 * src/db 가 바깥을 import 하지 않아야 모노레포에서 packages/db 로 그대로 옮길 수 있기 때문이다.
 *
 * createDatabase 자체는 환경변수를 읽지 않는다. 환경변수를 읽는 것은 진입점(plugins/db.ts,
 * migrate.ts, seeds/index.ts)이 이 함수를 부를 때뿐이다.
 */

const DbEnv = Type.Object({
  DB_HOST: Type.String({ default: "localhost" }),
  DB_PORT: Type.Integer({ default: 3306 }),
  // 접속 대상은 기본값을 두지 않는다 — 엉뚱한 DB 에 붙지 않게.
  DB_NAME: Type.String({ minLength: 1 }),
  DB_USER: Type.String({ minLength: 1 }),
  DB_PASSWORD: Type.String(),
});

export const databaseOptionsFromEnv = (
  source: NodeJS.ProcessEnv = process.env,
): DatabaseOptions => {
  // 기본값 채움 → 타입 변환 → 미정의 키 제거 → 검증 (configs/env.config.ts 와 같은 순서)
  const parsed = Value.Clean(DbEnv, Value.Convert(DbEnv, Value.Default(DbEnv, { ...source })));

  if (!Value.Check(DbEnv, parsed)) {
    const details = [...Value.Errors(DbEnv, parsed)]
      .map((e) => `  - ${e.instancePath || "/"} ${e.message}`)
      .join("\n");
    throw new Error(`DB 환경변수 검증 실패:\n${details}`);
  }

  return {
    host: parsed.DB_HOST,
    port: parsed.DB_PORT,
    database: parsed.DB_NAME,
    user: parsed.DB_USER,
    password: parsed.DB_PASSWORD,
  };
};
