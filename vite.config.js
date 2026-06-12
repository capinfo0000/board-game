import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';
import { viteSingleFile } from 'vite-plugin-singlefile';

// https://vite.dev/config/
// 通常ビルド：GitHub Pages 用に base=/board-game/
// SINGLEFILE=1 のとき：全部を1つの index.html に内蔵（共有サーバー等にそのまま置ける）
const singleFile = !!process.env.SINGLEFILE;

export default defineConfig(({ command }) => ({
  base: command === 'build' && !singleFile ? '/board-game/' : './',
  plugins: [react(), ...(singleFile ? [viteSingleFile()] : [])],
  server: {
    host: true,
    port: 5173,
  },
}));
