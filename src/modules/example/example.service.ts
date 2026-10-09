// src/modules/example/example.service.ts — 예시 서비스

import { type CreateExampleBody, ERROR_CODE, type Example } from "@/api-contracts";
import type { Database } from "@/db";
import type { ExampleRow } from "@/db/types/example.type";
import { AppError } from "@/lib/errors";
import exampleRepository from "@/modules/example/example.repository";

/**
 * 예시 비즈니스 로직.
 *
 * service 는 Fastify 를 모른다. DB 와 필요한 값은 인자로 받고, 실패는 AppError 를 throw 한다.
 */

/** DB 행 → API 모양. 내보낼 필드만 고르고, Date 는 문자열로 바꾼다. */
const toExample = (row: ExampleRow): Example => ({
  id: row.id,
  title: row.title,
  description: row.description,
  createdBy: row.createdBy,
  createdAt: row.createdAt.toISOString(),
});

const getExample = async (db: Database, id: number): Promise<Example> => {
  const row = await exampleRepository.findById(db, id);
  if (!row) {
    throw new AppError(404, ERROR_CODE.EXAMPLE_NOT_FOUND, "예시가 없습니다");
  }
  return toExample(row);
};

/**
 * 예시를 만들고 만든 행을 돌려준다.
 *
 * 트랜잭션 예시: insert 와 조회를 한 트랜잭션에서 한다.
 * 트랜잭션 안에서는 db 대신 trx 를 repository 에 넘긴다.
 */
const createExample = async (
  db: Database,
  input: CreateExampleBody,
  createdBy: string,
): Promise<Example> =>
  db.transaction().execute(async (trx) => {
    const id = await exampleRepository.insert(trx, {
      title: input.title,
      description: input.description ?? null,
      createdBy,
    });

    const row = await exampleRepository.findById(trx, id);
    if (!row) {
      // 방금 넣은 행이 없다면 서버 문제다 → 500
      throw new Error(`examples(${id}) insert 직후 조회 실패`);
    }
    return toExample(row);
  });

export default {
  getExample,
  createExample,
};
