import { useRef, useState } from 'react';
import { collectionStore, useCollection } from '@/lib/collection';
export function CollectionTools() {
  const { collection } = useCollection(),
    fileInput = useRef<HTMLInputElement>(null);
  const [mode, setMode] = useState<'merge' | 'replace'>('merge'),
    [message, setMessage] = useState(''),
    [error, setError] = useState('');
  const exportCollection = () => {
    const blob = new Blob([collectionStore.export()], {
        type: 'application/json',
      }),
      url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.download = 'pokemonpedia-collection.json';
    link.click();
    setTimeout(() => URL.revokeObjectURL(url), 1000);
  };
  const importCollection = async (file: File | undefined) => {
    if (!file) return;
    setError('');
    setMessage('');
    try {
      if (file.size > 1024 * 1024)
        throw new Error('Collection files must be smaller than 1 MB.');
      collectionStore.import(await file.text(), mode);
      setMessage(
        mode === 'merge'
          ? 'Imported choices were added to your collection.'
          : 'Your collection was replaced with the imported choices.',
      );
    } catch (err) {
      setError(
        err instanceof Error
          ? err.message
          : 'This collection could not be imported.',
      );
    } finally {
      if (fileInput.current) fileInput.current.value = '';
    }
  };
  return (
    <details className="collection-tools">
      <summary>
        Collection backup · {collection.favorites.length} favorites ·{' '}
        {collection.caught.length} caught
      </summary>
      <p className="muted">
        Saved in this browser on this device. Choices do not sync between
        devices. Export a backup to move or keep them.
      </p>
      <div className="summary-actions">
        <button className="action secondary" onClick={exportCollection}>
          Export collection
        </button>
        <label className="sort-label">
          Import behavior
          <select
            value={mode}
            onChange={(event) =>
              setMode(event.target.value as 'merge' | 'replace')
            }
          >
            <option value="merge">Add to existing choices</option>
            <option value="replace">Replace existing choices</option>
          </select>
        </label>
        <button
          className="action secondary"
          onClick={() => fileInput.current?.click()}
        >
          Import collection
        </button>
        <input
          ref={fileInput}
          type="file"
          accept="application/json,.json"
          aria-label="Collection JSON file"
          className="sr-only"
          tabIndex={-1}
          onChange={(event) => void importCollection(event.target.files?.[0])}
        />
      </div>
      {mode === 'replace' && (
        <p className="muted">
          Replace overwrites both lists when you choose a valid file. Export
          first to keep a backup.
        </p>
      )}
      {message && <p role="status">{message}</p>}
      {error && <p role="alert">{error}</p>}
    </details>
  );
}
