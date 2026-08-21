import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';

// base: './' 讓 build 出來的靜態檔案可以直接放在
// Cloudflare Pages / Vercel 根目錄，或 GitHub Pages 的子路徑下。
export default defineConfig({
  base: './',
  plugins: [react()],
  build: {
    target: 'es2020',
    rollupOptions: {
      output: {
        // 檔名不加 hash，讓 Service Worker 可以用固定清單做 precache。
        entryFileNames: 'assets/[name].js',
        chunkFileNames: 'assets/[name].js',
        assetFileNames: 'assets/[name].[ext]',
      },
    },
  },
});
