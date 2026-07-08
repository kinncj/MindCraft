import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';

// GitHub Pages serves the site from /<repo-name>/, so the base path has to
// match. Local dev and tests use '/'. Override with VITE_BASE if the repo
// name is different.
const base = process.env.VITE_BASE ?? (process.env.GITHUB_PAGES ? '/mindcraft/' : '/');

export default defineConfig({
  base,
  plugins: [react()],
  build: {
    target: 'es2020',
    sourcemap: false,
  },
});
