import { defineConfig } from "vite";
import react from "@vitejs/plugin-react";

export default defineConfig({
  plugins: [react()],
  server: {
    port: 4176,
  },
  test: {
    environment: "jsdom",
    setupFiles: "./src/setupTests.js",
    globals: true,
    fileParallelism: false,
    poolOptions: {
      threads: {
        singleThread: true,
      },
    },
  },
});
