import { Chunk } from '../Chunk';
import type { GeneratorConfig } from './Generator';
import { createGenerator } from './createGenerator';
import { toWorkerResponse, type GenerateResponse } from './workerChunk';

export type { GenerateResponse } from './workerChunk';

/**
 * Terrain generation off the main thread. One message in (config + chunk
 * coords), one message out (block and state buffers, transferred).
 */
export type GenerateRequest = { id: number; config: GeneratorConfig; cx: number; cz: number };

const generators = new Map<string, ReturnType<typeof createGenerator>>();

self.onmessage = (event: MessageEvent<GenerateRequest>) => {
  const { id, config, cx, cz } = event.data;
  const key = JSON.stringify(config);
  let generator = generators.get(key);
  if (!generator) {
    generator = createGenerator(config);
    generators.set(key, generator);
  }
  const chunk = new Chunk(cx, cz);
  generator.generate(chunk);
  const response: GenerateResponse = toWorkerResponse(id, chunk);
  (self as unknown as Worker).postMessage(response, [response.blocks, response.states]);
};
