import { useState, useEffect } from 'react';
import { useQuery } from '@tanstack/react-query';
import { Pokemon, PokemonType } from '@shared/schema';
import { SearchBar } from '@/components/SearchBar';
import { FilterBar } from '@/components/FilterBar';
import { PokemonGrid } from '@/components/PokemonGrid';
import { LoadMoreButton } from '@/components/LoadMoreButton';
import { Footer } from '@/components/Footer';

export default function Home() {
  // State for filtering and display
  const [activeType, setActiveType] = useState<PokemonType | 'all'>('all');
  const [searchQuery, setSearchQuery] = useState('');
  const [layout, setLayout] = useState<'grid' | 'box' | 'list'>('grid');
  const [displayLimit, setDisplayLimit] = useState(20);
  
  // Fetch all Pokemon data
  const { data: allPokemon = [], isLoading } = useQuery<Pokemon[]>({
    queryKey: ['/api/pokemon'],
  });
  
  // Filter Pokemon based on type and search query
  const filteredPokemon = allPokemon.filter(pokemon => {
    // Type filter
    const matchesType = activeType === 'all' || pokemon.types.includes(activeType);
    
    // Search filter (case insensitive)
    const matchesSearch = pokemon.name.toLowerCase().includes(searchQuery.toLowerCase());
    
    return matchesType && matchesSearch;
  });
  
  // Get Pokemon to display based on limit
  const displayedPokemon = filteredPokemon.slice(0, displayLimit);
  
  // Reset display limit when filters change
  useEffect(() => {
    setDisplayLimit(20);
  }, [activeType, searchQuery]);
  
  // Handle load more
  const handleLoadMore = async () => {
    // Simulate loading delay
    await new Promise(resolve => setTimeout(resolve, 500));
    setDisplayLimit(prevLimit => prevLimit + 20);
  };
  
  // Determine if there are more Pokemon to load
  const hasMore = displayedPokemon.length < filteredPokemon.length;
  
  return (
    <div className="min-h-screen bg-background font-roboto">
      {/* Header */}
      <header className="bg-[#1E1E1E] shadow-md py-4 px-4 sm:px-6 md:px-8 sticky top-0 z-10">
        <div className="container mx-auto flex flex-col sm:flex-row justify-between items-center">
          <div className="flex items-center mb-4 sm:mb-0">
            <svg 
              className="text-[#FFD700] w-7 h-7 mr-3"
              viewBox="0 0 20 20" 
              fill="currentColor"
            >
              <path d="M10 2a8 8 0 100 16 8 8 0 000-16zm0 14a6 6 0 110-12 6 6 0 010 12z" />
              <path d="M10 12a2 2 0 100-4 2 2 0 000 4z" />
              <path fillRule="evenodd" d="M10 7.5a2.5 2.5 0 100 5 2.5 2.5 0 000-5zM10 11a1 1 0 100-2 1 1 0 000 2z" />
              <path d="M2 10a8 8 0 1116 0 8 8 0 01-16 0zm8-6a6 6 0 100 12 6 6 0 000-12z" fillRule="evenodd" clipRule="evenodd" />
            </svg>
            <h1 className="text-2xl font-bold font-[Poppins] text-[#E0E0E0]">PokéDex</h1>
          </div>
          
          {/* Search Box */}
          <SearchBar onSearch={setSearchQuery} />
        </div>
      </header>

      {/* Main Content */}
      <main className="container mx-auto px-4 sm:px-6 md:px-8 py-6">
        {/* Filter Bar */}
        <FilterBar 
          activeType={activeType} 
          setActiveType={setActiveType}
          pokemonCount={filteredPokemon.length}
          layout={layout}
          setLayout={setLayout}
        />
        
        {/* Pokemon Grid */}
        <PokemonGrid 
          pokemons={displayedPokemon} 
          isLoading={isLoading} 
          layout={layout} 
        />
        
        {/* Load More Button */}
        {!isLoading && (
          <LoadMoreButton 
            onClick={handleLoadMore} 
            isLoading={false}
            hasMore={hasMore}
          />
        )}
      </main>
      
      {/* Footer */}
      <Footer />
    </div>
  );
}
