import { WebLlmProvider } from './WebLlmProvider';

/**
 * One helper model for the whole page. Engines come and go as worlds are
 * opened; the model (hundreds of MB in GPU memory) must not.
 */
let shared: WebLlmProvider | null = null;

export function sharedHelper(): WebLlmProvider {
  if (!shared) shared = new WebLlmProvider();
  return shared;
}
