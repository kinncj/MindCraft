import { defineConfig } from '@playwright/test';

// Chromium falls back to SwiftShader (software Vulkan on the CPU) in headless
// mode unless told otherwise. Rendering the three.js world that way pins every
// core, and on this hardware a sustained all-core burst has hard-powered the
// machine off. These flags route WebGL through ANGLE -> Vulkan on the real GPU
// (RADV locally, the T4 on a GPU runner). No xvfb is required: the headless
// shell picks up the Vulkan device directly.
export const GPU_ARGS = [
  '--ignore-gpu-blocklist',
  '--use-angle=vulkan',
  '--enable-features=Vulkan',
  '--use-gl=angle',
  '--enable-gpu-rasterization',
  '--enable-zero-copy',
];

export default defineConfig({
  testDir: 'tests/e2e',
  // Kept generous for CI runners that still end up on SwiftShader; on a real
  // GPU pages load in well under a second.
  timeout: 60_000,
  retries: process.env.CI ? 1 : 0,
  // CI runners have two cores. Locally, cap the fan-out too: every worker is
  // a Chromium instance compiling shaders and meshing chunks, and letting
  // Playwright default to half the machine's 32 threads is exactly the
  // all-core burst we are trying to avoid. Override with PW_WORKERS.
  workers: process.env.CI ? 2 : Number(process.env.PW_WORKERS ?? 4),
  use: {
    baseURL: 'http://localhost:4173',
    trace: 'retain-on-failure',
    launchOptions: { args: GPU_ARGS },
  },
  webServer: {
    command: 'npm run preview -- --port 4173 --strictPort',
    url: 'http://localhost:4173',
    reuseExistingServer: !process.env.CI,
    timeout: 60_000,
  },
});
