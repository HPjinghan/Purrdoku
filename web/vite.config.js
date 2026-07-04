import { defineConfig } from "vite";
import react from "@vitejs/plugin-react";

// Static PWA-style build, single entry (mirrors Murdoku's Vite setup).
export default defineConfig({
  plugins: [react()],
  base: "./",
  build: { outDir: "dist", assetsDir: "assets" },
});
