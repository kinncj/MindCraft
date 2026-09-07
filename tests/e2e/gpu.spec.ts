import { expect, test } from '@playwright/test';

// Guards the launch flags in playwright.config.ts: locally the suite must run
// on the real GPU. SwiftShader (software Vulkan) renders the world on every
// CPU core, which is both slow and, on the dev laptop, has caused hard
// power-offs. CI runners without a GPU are allowed to fall back.
test('Chromium renders WebGL on the GPU', async ({ page }) => {
  await page.setContent('<canvas id="c"></canvas>');
  const renderer = await page.evaluate(() => {
    const gl = (document.getElementById('c') as HTMLCanvasElement).getContext('webgl2');
    if (!gl) return 'NO WEBGL2';
    const ext = gl.getExtension('WEBGL_debug_renderer_info');
    return ext ? String(gl.getParameter(ext.UNMASKED_RENDERER_WEBGL)) : 'UNKNOWN';
  });
  console.log(`WebGL renderer: ${renderer}`);
  expect(renderer).not.toBe('NO WEBGL2');
  if (!process.env.CI) expect(renderer).not.toMatch(/swiftshader|llvmpipe|software/i);
});
