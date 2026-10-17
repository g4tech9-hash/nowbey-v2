import { fileURLToPath } from "node:url";
import { defineConfig } from "vite";
import react from "@vitejs/plugin-react";

/**
 * The landing page's build.
 *
 * The application itself is a Next.js app and is built by `next build`; this Vite project
 * builds the standalone landing page that sits in front of it. Both share `src/`, but the
 * landing page only imports the files it owns: `src/index.css`, `src/App.tsx`,
 * `src/components/{landing files}`, `src/content/` and `src/lib/landing-*.ts`.
 *
 * Tailwind runs through the repository's existing PostCSS config, so the landing page and
 * the app compile their stylesheets with the same Tailwind version.
 */
export default defineConfig({
  plugins: [react()],
  resolve: {
    alias: {
      "@": fileURLToPath(new URL("./src", import.meta.url)),
    },
  },
  server: {
    // 0.0.0.0 so the page can be reached from outside the sandbox.
    host: true,
    port: 5173,
    strictPort: true,
    // The preview is served under a generated host name, so the Host header is not localhost.
    allowedHosts: true,
    proxy: {
      // The product's own routes are served by the Next.js dev server. With it running on
      // port 3000, the links on the landing page land on the real application.
      "^/(map|wire|life|gas|alerts|report|open-now|you|support|privacy|terms|login|admin|credits|broadcast)(/|$)":
        {
          target: "http://127.0.0.1:3000",
          changeOrigin: true,
        },
    },
  },
  build: {
    outDir: "dist",
    emptyOutDir: true,
    target: "es2020",
  },
});
