import { defineConfig } from 'vite';
import preact from '@preact/preset-vite';
import { resolve } from 'path';
import { cpSync, readFileSync, writeFileSync } from 'fs';

export default defineConfig({
  plugins: [
    preact(),
    {
      name: 'build-background-and-content',
      async closeBundle() {
        // Copy manifest.json and icons
        cpSync(resolve(__dirname, 'manifest.json'), resolve(__dirname, 'dist/manifest.json'));
        cpSync(resolve(__dirname, 'public/icons'), resolve(__dirname, 'dist/icons'), { recursive: true });

        // Build background.js and content.js as IIFE (no imports)
        const { build } = await import('vite');
        await build({
          configFile: false,
          build: {
            outDir: resolve(__dirname, 'dist'),
            emptyOutDir: false,
            lib: {
              entry: {
                background: resolve(__dirname, 'src/background/index.ts'),
                content: resolve(__dirname, 'src/content/extractor.ts'),
              },
              formats: ['es'],
            },
            rollupOptions: {
              output: {
                entryFileNames: '[name].js',
                inlineDynamicImports: false,
              },
            },
            minify: true,
          },
        });
      },
    },
  ],
  base: './',
  build: {
    outDir: 'dist',
    emptyOutDir: true,
    rollupOptions: {
      input: {
        popup: resolve(__dirname, 'src/popup/index.html'),
        sidepanel: resolve(__dirname, 'src/sidepanel/index.html'),
      },
      output: {
        entryFileNames: '[name].js',
        chunkFileNames: 'chunks/[name]-[hash].js',
        assetFileNames: 'assets/[name]-[hash][extname]',
      },
    },
  },
  resolve: {
    alias: {
      '@': resolve(__dirname, 'src'),
    },
  },
});
