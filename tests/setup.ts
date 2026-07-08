// fake-indexeddb has to load before anything imports Dexie, so the
// database code sees a working IndexedDB inside jsdom.
import 'fake-indexeddb/auto';
import '@testing-library/jest-dom/vitest';
