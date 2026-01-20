import { defineConfig } from "vite";
import react from "@vitejs/plugin-react";

export default defineConfig({
  plugins: [react()],
  server: {
    proxy: {
      "/apps-script": {
        target: "https://script.google.com",
        changeOrigin: true,
        rewrite: (path) =>
          path.replace(
            /^\/apps-script/,
            "/macros/s/AKfycbytT_24yu8rFsD2ugrFoBpK3szlCqU2FfC9XbMAsik08WEsUZztTje2YZU7gh1LeOWiVQ"
          ),
      },
    },
  },
});
