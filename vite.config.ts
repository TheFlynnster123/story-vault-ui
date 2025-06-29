import { defineConfig } from "vite";
import react from "@vitejs/plugin-react-swc";

// https://vite.dev/config/
export default defineConfig(({ mode }) => {
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
  };
});
