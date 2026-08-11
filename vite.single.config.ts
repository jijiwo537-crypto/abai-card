import tailwindcss from '@tailwindcss/vite';
import react from '@vitejs/plugin-react';
import { defineConfig } from 'vite';
import { viteSingleFile } from 'vite-plugin-singlefile';

/**
 * The build that ships.
 *
 * Everything — the JavaScript, the stylesheet, the fonts, the card art, the three.js scene —
 * ends up inside one `.html` file that makes no network request of any kind. That constraint is
 * the product: the game has to open from a downloads folder, on a plane, twice renamed, and
 * still be the whole game. `assetsInlineLimit` is set past any asset in the tree so nothing is
 * ever emitted beside the HTML, and dynamic imports are inlined for the same reason.
 */
export default defineConfig({
  plugins: [react(), tailwindcss(), viteSingleFile({ removeViteModuleLoader: true })],
  build: {
    outDir: 'dist-single',
    target: 'esnext',
    assetsInlineLimit: 100000000,
    cssCodeSplit: false,
    reportCompressedSize: false,
    rollupOptions: {
      output: { inlineDynamicImports: true },
    },
  },
});
