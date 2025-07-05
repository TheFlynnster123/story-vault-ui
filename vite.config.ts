/// <reference types="vitest" />
import { defineConfig } from "vite";
import react from "@vitejs/plugin-react-swc";

// https://vite.dev/config/
export default defineConfig(() => {
  const useHttps = process.env.VITE_USE_HTTPS === "true";

  return {
    plugins: [react()],
    server: {
      https: useHttps
        ? {
            key: "./ssl/key.pem",
            cert: "./ssl/cert.pem",
          }
        : undefined,
    },
    test: {
      globals: true,
      environment: "jsdom",
      setupFiles: ["./src/test-utils/setup.ts"],
      css: true,
    },
  };
});
