// src/modules/example/example.service.ts — 예시 서비스

import {
  ERROR_CODE,
  type Example,
  type GetExampleRequest,
  type GetExampleResponse,
  type PostExampleRequest,
  type PostExampleResponse,
} from "@/api-contracts";
import { transaction } from "@/db/transaction";
import type { ExampleRow } from "@/db/types/example.type";
import { AppError } from "@/lib/errors";
import exampleRepository from "@/modules/example/example.repository";

/**
 * 예시 비즈니스 로직.
 *
 * service 는 Fastify 도 DB 도 모른다. 필요한 값만 인자로 받아 혼자 돈다 (route·스크립트·스케줄러 어디서든).
 * DB 는 repository 가 직접 가져오고, 실패는 AppError 를 throw 한다.
 * **트랜잭션 경계는 service 가 정한다** — 원자적이어야 하는 단위를 transaction() 으로 감싼다.
 */

/** DB 행 → API 모양. 내보낼 필드만 고르고, Date 는 문자열로 바꾼다. */
const toExample = (row: ExampleRow): Example => ({
  id: row.id,
  title: row.title,
  description: row.description,
  createdBy: row.createdBy,
  createdAt: row.createdAt.toISOString(),
});

const getExample = async (
  id: number,
  { descriptionLength }: GetExampleRequest,
): Promise<GetExampleResponse> => {
  const row = await exampleRepository.findById(id);
  if (!row) {
    throw new AppError(404, ERROR_CODE.EXAMPLE_NOT_FOUND, "예시가 없습니다");
  }

  const example = toExample(row);
  if (descriptionLength !== undefined && example.description !== null) {
    example.description = example.description.slice(0, descriptionLength);
  }
  return example;
};

/**
 * 예시를 만들고 만든 행을 돌려준다.
 *
 * 트랜잭션 예시: insert 와 조회를 한 트랜잭션에서 한다.
 * transaction() 안의 repository 호출은 인자 없이도 같은 트랜잭션을 쓴다.
 * 다른 service 의 transaction() 안에서 불리면 새로 열지 않고 그 트랜잭션에 합류한다.
 */
const createExample = async (
  input: PostExampleRequest,
  createdBy: string,
): Promise<PostExampleResponse> =>
  transaction(async () => {
    const id = await exampleRepository.insert({
      title: input.title,
      description: input.description ?? null,
      createdBy,
    });

    const row = await exampleRepository.findById(id);
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
