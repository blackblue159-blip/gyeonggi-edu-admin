import { defineConfig } from "vite";
import react from "@vitejs/plugin-react";
import tailwindcss from "@tailwindcss/vite";

export default defineConfig({
  plugins: [react(), tailwindcss()],
  server: {
    proxy: {
      "/neis-hub": {
        target: "https://open.neis.go.kr",
        changeOrigin: true,
        rewrite: (path) => path.replace(/^\/neis-hub/, "/hub"),
      },
    },
  },
});
