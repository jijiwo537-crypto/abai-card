import tailwindcss from '@tailwindcss/vite';
import react from '@vitejs/plugin-react';
import { defineConfig } from 'vite';

/**
 * The dev server, and nothing else.
 *
 * What ships is built by `vite.single.config.ts` — one self-contained HTML file. This config
 * exists so `npm run dev` gives you the game with hot reload while you work on it.
 */
export default defineConfig({
  plugins: [react(), tailwindcss()],
});
