import { useState } from 'react';
import { PokemonCard } from './PokemonCard';
import { Skeleton } from '@/components/ui/skeleton';
import { Pokemon, PokemonType } from '@shared/schema';

interface PokemonGridProps {
  pokemons: Pokemon[];
  isLoading: boolean;
  layout: 'grid' | 'box' | 'list';
}

export function PokemonGrid({ pokemons, isLoading, layout }: PokemonGridProps) {
  // Layout classes
  const containerClasses = {
    grid: "grid gap-4 grid-cols-1 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4 xl:grid-cols-5",
    box: "grid gap-4 grid-cols-1 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4",
    list: "flex flex-col gap-3"
  };
  
  if (isLoading) {
    return (
      <div className={containerClasses[layout]}>
        {Array.from({ length: 12 }).map((_, index) => (
          <div key={index} className="bg-[#1E1E1E] rounded-lg p-4">
            <Skeleton className="h-36 w-full mb-4" />
            <Skeleton className="h-6 w-3/4 mb-2" />
            <Skeleton className="h-4 w-1/2" />
          </div>
        ))}
      </div>
    );
  }
  
  if (pokemons.length === 0) {
    return (
      <div className="flex justify-center items-center h-64">
        <p className="text-lg text-[#A0A0A0]">No Pokémon found. Try adjusting your filters.</p>
      </div>
    );
  }
  
  return (
    <div className={containerClasses[layout]}>
      {pokemons.map((pokemon) => (
        <PokemonCard key={pokemon.id} pokemon={pokemon} layout={layout} />
      ))}
    </div>
  );
}
