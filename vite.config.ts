import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';

export default defineConfig({
  plugins: [react()],
  server: {
    // Geolocation API は localhost か HTTPS でのみ動作する。
    // 実機スマホから検証する場合は `npm run dev -- --host` + HTTPS トンネルを使う。
    host: true,
    port: 5173,
  },
});
