// fake-indexeddb has to load before anything imports Dexie, so the
// database code sees a working IndexedDB inside jsdom.
import 'fake-indexeddb/auto';
import '@testing-library/jest-dom/vitest';

// jsdom has no PointerEvent, so fireEvent.pointerMove drops clientX/Y.
// A MouseEvent-backed stand-in keeps the coordinates.
if (typeof window !== 'undefined' && typeof window.PointerEvent === 'undefined') {
  class PointerEventPolyfill extends MouseEvent {
    pointerId: number;
    constructor(type: string, params: MouseEventInit & { pointerId?: number } = {}) {
      super(type, params);
      this.pointerId = params.pointerId ?? 0;
    }
  }
  window.PointerEvent = PointerEventPolyfill as unknown as typeof PointerEvent;
}
