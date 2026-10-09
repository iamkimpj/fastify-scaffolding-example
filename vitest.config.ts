// vitest.config.ts — 테스트 설정

import { defineConfig } from "vitest/config";

export default defineConfig({
  resolve: {
    tsconfigPaths: true,
  },
  test: {
    include: ["src/**/*.test.ts"],
    env: {
      NODE_ENV: "test",
      // 테스트 전용 값. 실제 비밀키가 아니다.
      USER_JWT_SECRET: "test-user-jwt-secret-0123456789abcdef",
      ADMIN_JWT_SECRET: "test-admin-jwt-secret-0123456789abcdef",
      // 테스트는 repository 를 mock 으로 바꿔 끼우므로 실제로 접속하지 않는다.
      DB_NAME: "test",
      DB_USER: "test",
      DB_PASSWORD: "test",
    },
  },
});
