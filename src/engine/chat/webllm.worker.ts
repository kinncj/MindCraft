import { WebWorkerMLCEngineHandler } from '@mlc-ai/web-llm';

/** Runs the on-device language model off the main thread. */
const handler = new WebWorkerMLCEngineHandler();
self.onmessage = (message: MessageEvent) => handler.onmessage(message);
