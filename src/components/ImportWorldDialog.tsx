import { useRef, useState } from 'react';
import { useGameStore } from '../game/gameStore';
import { parseWorldImportFile, MAX_IMPORT_FILE_BYTES } from '../importExport/validateWorldImport';
import { KidButton } from './KidButton';

// File.text() is missing in some environments (jsdom included), so fall
// back to the older FileReader API.
function readFileText(file: File): Promise<string> {
  if (typeof file.text === 'function') return file.text();
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = () => resolve(String(reader.result ?? ''));
    reader.onerror = () => reject(reader.error);
    reader.readAsText(file);
  });
}

/**
 * Import flow: pick a .json file, validate it locally, then ask before
 * replacing the saved world. Nothing in the file is ever executed.
 */
export function ImportWorldDialog() {
  const importWorldFromText = useGameStore((state) => state.importWorldFromText);
  const exportWorld = useGameStore((state) => state.exportWorld);
  const showToast = useGameStore((state) => state.showToast);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const [pendingText, setPendingText] = useState<string | null>(null);
  const [pendingName, setPendingName] = useState<string>('');

  async function onFileChosen(file: File | undefined) {
    if (!file) return;
    if (file.size > MAX_IMPORT_FILE_BYTES) {
      showToast('That file is too large to import safely.');
      return;
    }
    const text = await readFileText(file);
    const result = parseWorldImportFile(text);
    if (!result.ok) {
      showToast(result.error);
      return;
    }
    setPendingText(text);
    setPendingName(result.worldName);
  }

  async function confirmImport() {
    if (!pendingText) return;
    const result = await importWorldFromText(pendingText);
    if (!result.ok && result.error) {
      showToast(result.error);
    }
    setPendingText(null);
  }

  return (
    <>
      <KidButton
        onClick={() => fileInputRef.current?.click()}
        aria-label="Import a world from a file"
      >
        📂 Import World
      </KidButton>
      <input
        ref={fileInputRef}
        type="file"
        accept="application/json,.json"
        className="visually-hidden"
        aria-label="Choose a MindCraft world file"
        data-testid="import-file-input"
        onChange={(event) => {
          void onFileChosen(event.target.files?.[0]);
          event.target.value = '';
        }}
      />
      {pendingText !== null && (
        <div className="panel-backdrop" role="presentation">
          <section className="panel dialog" role="dialog" aria-label="Import this world?" aria-modal="true">
            <h2>Import this world?</h2>
            <p>
              <strong>{pendingName}</strong> is ready to move in.
            </p>
            <p>This will replace the world saved on this computer.</p>
            <p>You can export your current world first if you want to keep it.</p>
            <div className="dialog-buttons">
              <KidButton tone="primary" onClick={() => void confirmImport()}>
                Import World
              </KidButton>
              <KidButton onClick={() => setPendingText(null)}>Cancel</KidButton>
              <KidButton onClick={exportWorld}>Export Current World First</KidButton>
            </div>
          </section>
        </div>
      )}
    </>
  );
}
