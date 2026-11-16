import { defineConfig } from 'vitest/config';
import path from 'path';

// Tests del frontend (lógica pura y componentes con Testing Library). Se ejecutan en el CI: `pnpm test`.
export default defineConfig({
  resolve: { alias: { '@': path.resolve(__dirname, './src') } },
  test: {
    environment: 'jsdom',
    include: ['src/**/*.test.{ts,tsx}'],
    restoreMocks: true,
  },
});
