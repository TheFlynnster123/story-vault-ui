import { defineConfig } from "vite";
import react from "@vitejs/plugin-react-swc";

// https://vite.dev/config/
export default defineConfig({
  plugins: [react()],
  server: {
    https: {
      key: "./ssl/key.pem",
      cert: "./ssl/cert.pem",
    },
  },
});
