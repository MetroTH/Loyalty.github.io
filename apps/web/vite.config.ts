import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';
import { fileURLToPath } from 'node:url';

const pkg = (p: string) => fileURLToPath(new URL(p, import.meta.url));

// GitHub Pages serves project sites from /<repo>/. Override with VITE_BASE if needed.
export default defineConfig({
  base: process.env.VITE_BASE ?? '/',
  plugins: [react()],
  resolve: {
    alias: {
      '@loyalink/sdk': pkg('../../packages/sdk/src/index.ts'),
      '@loyalink/theme': pkg('../../packages/theme/src/index.tsx'),
    },
  },
  server: {
    fs: { allow: [pkg('../../')] },
  },
});
