import path from "node:path";
import { defineConfig } from "vitest/config";

const root = import.meta.dirname;

export default defineConfig({
  resolve: {
    alias: {
      "@": path.resolve(root, "src"),
      "server-only": path.resolve(root, "src/tests/server-only-stub.ts"),
    },
  },
  test: {
    environment: "node",
    // Testes de integração (*.int.test.ts) precisam de banco: rode com `npm run test:int`.
    include: process.env.INTEGRATION ? ["src/**/*.int.test.ts"] : ["src/**/*.test.ts"],
    exclude: process.env.INTEGRATION ? [] : ["src/**/*.int.test.ts", "node_modules/**"],
    setupFiles: process.env.INTEGRATION ? ["dotenv/config"] : [],
    fileParallelism: false,
    testTimeout: 30_000,
  },
});
