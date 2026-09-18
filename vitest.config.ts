import { defineConfig } from "vitest/config";
import react from "@vitejs/plugin-react";
import { fileURLToPath } from "url";

export default defineConfig({
  plugins: [react()],
  resolve: {
    alias: {
      "@": fileURLToPath(new URL("./", import.meta.url)),
      // Server modules guard themselves with `server-only`, which throws outside
      // a Server Component. Stubbing it is what lets those modules be tested at
      // all — the guard is a build-time contract, not behaviour worth asserting.
      "server-only": fileURLToPath(new URL("./lib/test/serverOnlyStub.ts", import.meta.url)),
    },
  },
  test: {
    environment: "jsdom",
    globals: true,
    include: ["**/*.test.{ts,tsx}"],
  },
});
