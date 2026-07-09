import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';

// GitHub Pages serves the site from /<repo-name>/, so the base path has to
// match the repo at github.com/kinncj/MindCraft (capital M matters). Local
// dev and tests use '/'. Override with VITE_BASE for a different repo name.
const base = process.env.VITE_BASE ?? (process.env.GITHUB_PAGES ? '/MindCraft/' : '/');

export default defineConfig({
  base,
  plugins: [react()],
  build: {
    target: 'es2020',
    sourcemap: false,
  },
});
