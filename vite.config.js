import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';

// https://vite.dev/config/
// 本番ビルド時のみ GitHub Pages 用のベースパスを設定（ローカル開発は "/"）
export default defineConfig(({ command }) => ({
  base: command === 'build' ? '/board-game/' : '/',
  plugins: [react()],
  server: {
    host: true,
    port: 5173,
  },
}));
