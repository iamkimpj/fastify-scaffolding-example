// src/db/seeds/index.ts — 시드 실행

import { db } from "@/db/client";
import exampleSeed from "@/db/seeds/example.seed";
import { transaction } from "@/db/transaction";

/**
 * 개발용 초기 데이터를 넣는다. 마이그레이션 뒤에 실행한다. **운영 DB 에 실행하지 않는다.**
 *
 *   npm run db:seed              → 전부 (아래 순서대로)
 *   npm run db:seed -- example   → 하나만
 *
 * 시드는 파트(테이블·기능)별로 `seeds/<파트>.seed.ts` 에 나눠 두고 여기에 등록한다.
 * **순서가 곧 실행 순서다.** 다른 테이블을 참조(FK)하는 시드는 참조 대상보다 뒤에 둔다.
 */
const seeds: [name: string, run: () => Promise<number>][] = [["example", exampleSeed.run]];

const only = process.argv[2];
const targets = only ? seeds.filter(([name]) => name === only) : seeds;

if (targets.length === 0) {
  console.error(`없는 시드: ${only}. 가능한 값: ${seeds.map(([name]) => name).join(", ")}`);
  process.exit(1);
}

try {
  // 전부 한 트랜잭션으로 넣는다. 하나라도 실패하면 아무것도 남기지 않는다.
  // 시드는 executor() 로 쿼리하므로 인자 없이도 이 트랜잭션을 쓴다.
  await transaction(async () => {
    for (const [name, run] of targets) {
      const count = await run();
      console.log(`✓ ${name} ${count}건`);
    }
  });
} catch (error) {
  console.error("시드 실패:", error);
  process.exitCode = 1;
} finally {
  await db.destroy();
}
