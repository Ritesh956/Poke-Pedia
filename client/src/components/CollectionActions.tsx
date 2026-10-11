import { Star, Check } from 'lucide-react';
import { collectionStore, useCollection } from '@/lib/collection';
export function CollectionActions({ id, name }: { id: number; name: string }) {
  const { collection } = useCollection();
  const favorite = collection.favorites.includes(id),
    caught = collection.caught.includes(id);
  return (
    <div className="collection-actions">
      <button
        className="collection-button"
        aria-label={`Favorite ${name}`}
        aria-pressed={favorite}
        onClick={() => collectionStore.toggle('favorites', id)}
      >
        <Star
          size={17}
          fill={favorite ? 'currentColor' : 'none'}
          aria-hidden="true"
        />
        Favorite
      </button>
      <button
        className="collection-button"
        aria-label={`Caught ${name}`}
        aria-pressed={caught}
        onClick={() => collectionStore.toggle('caught', id)}
      >
        <Check size={17} aria-hidden="true" />
        Caught
      </button>
    </div>
  );
}
