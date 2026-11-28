import { defineConfig } from 'vite';
import { resolve } from 'node:path';

// The demo site (GitHub Pages). Shared code lives in core/; run `npm run sync`
// (done automatically by dev/build) to copy the SDK, toys and guide into demo/public.
export default defineConfig({
  server: { fs: { allow: [__dirname] } },
  root: resolve(__dirname, 'demo'),
  base: './',
  build: {
    target: 'es2022',
    outDir: resolve(__dirname, 'dist'),
    emptyOutDir: true,
    rollupOptions: {
      input: {
        main: resolve(__dirname, 'demo/index.html'),
        playground: resolve(__dirname, 'demo/playground.html'),
        toy: resolve(__dirname, 'demo/toy.html'),
        officeContent: resolve(__dirname, 'demo/office/content.html'),
        officeEditor: resolve(__dirname, 'demo/office/editor.html'),
      },
    },
  },
});
