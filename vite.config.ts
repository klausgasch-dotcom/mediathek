// @lovable.dev/vite-tanstack-config already includes the following — do NOT add them manually
// or the app will break with duplicate plugins:
//   - tanstackStart, viteReact, tailwindcss, tsConfigPaths, nitro (build-only),
//     componentTagger (dev-only), VITE_* env injection, @ path alias, React/TanStack dedupe,
//     error logger plugins, and sandbox detection (port/host/strictPort).
// You can pass additional config via defineConfig({ vite: { ... } }) if needed.
import { defineConfig } from "@lovable.dev/vite-tanstack-config";

export default defineConfig({
  // Redirect TanStack Start's bundled server entry to src/server.ts (our SSR error wrapper).
  tanstackStart: {
    server: { entry: "server" },
  },
  // Build target: Vercel sets VERCEL=1 during its builds; everywhere else (Docker, `node
  // .output/server/index.mjs`) we build a plain Node server instead of the Cloudflare default.
  nitro: {
    preset: process.env.VERCEL ? "vercel" : "node-server",
  },
});
