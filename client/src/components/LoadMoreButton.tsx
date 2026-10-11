import { Loader2 } from 'lucide-react';

interface LoadMoreButtonProps {
  onClick: () => Promise<void>;
  isLoading: boolean;
  hasMore: boolean;
}

export function LoadMoreButton({
  onClick,
  isLoading,
  hasMore,
}: LoadMoreButtonProps) {
  const handleClick = async () => {
    if (isLoading || !hasMore) return;

    await onClick();
  };

  if (!hasMore) return null;

  return (
    <div className="mt-8 text-center">
      <button
        className="bg-[#7038F8] text-white px-6 py-2 rounded-full hover:bg-opacity-80 transition duration-200 font-medium flex items-center justify-center"
        onClick={handleClick}
        disabled={isLoading}
      >
        {isLoading ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : null}
        {isLoading ? 'Loading...' : 'Load More Pokémon'}
      </button>
    </div>
  );
}
