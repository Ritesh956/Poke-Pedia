import { useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import { Pokemon as BasePokemon, PokemonType, typeColors } from '@shared/schema';
import { Link } from 'wouter';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Separator } from '@/components/ui/separator';
import { Footer } from '@/components/Footer';

// Extended Pokemon interface to handle optional special properties
interface Pokemon extends BasePokemon {
  isLegendary: boolean;
  isMythical: boolean;
  isBaby: boolean;
  evolutionChainUrl: string | null;
}

export default function Compare() {
  const [pokemon1Id, setPokemon1Id] = useState<string>('');
  const [pokemon2Id, setPokemon2Id] = useState<string>('');
  
  // Fetch all Pokemon data for selection
  const { data: allPokemon = [], isLoading } = useQuery<Pokemon[]>({
    queryKey: ['/api/pokemon'],
  });
  
  // Sort Pokemon by ID for dropdown
  const sortedPokemon = [...allPokemon].sort((a, b) => a.id - b.id);
  
  // Get selected Pokemon details
  const pokemon1 = sortedPokemon.find(p => p.id.toString() === pokemon1Id);
  const pokemon2 = sortedPokemon.find(p => p.id.toString() === pokemon2Id);
  
  return (
    <div className="min-h-screen bg-background font-roboto">
      {/* Header */}
      <header className="bg-[#1E1E1E] shadow-md py-4 px-4 sm:px-6 md:px-8 sticky top-0 z-10">
        <div className="container mx-auto flex flex-wrap items-center justify-between">
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
          
          <div>
            <Link href="/">
              <a className="bg-[#7038F8] text-white px-4 py-2 rounded-full hover:bg-opacity-80 transition duration-200 font-medium">
                Back to Pokédex
              </a>
            </Link>
          </div>
        </div>
      </header>

      {/* Main Content */}
      <main className="container mx-auto px-4 sm:px-6 md:px-8 py-6">
        <h2 className="text-2xl font-bold font-[Poppins] text-[#E0E0E0] mb-6">Compare Pokémon</h2>
        
        {/* Pokemon Selection Dropdowns */}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6 mb-8">
          <div>
            <label className="block mb-2 text-[#E0E0E0] font-medium">Select First Pokémon</label>
            <Select value={pokemon1Id} onValueChange={setPokemon1Id}>
              <SelectTrigger className="bg-[#2E2E2E] border-[#444444] text-[#E0E0E0]">
                <SelectValue placeholder="Select a Pokémon" />
              </SelectTrigger>
              <SelectContent className="bg-[#2E2E2E] border-[#444444] text-[#E0E0E0]">
                {sortedPokemon.map(pokemon => (
                  <SelectItem 
                    key={pokemon.id} 
                    value={pokemon.id.toString()}
                  >
                    {`#${pokemon.id.toString().padStart(3, '0')} - ${pokemon.name}`}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
          
          <div>
            <label className="block mb-2 text-[#E0E0E0] font-medium">Select Second Pokémon</label>
            <Select value={pokemon2Id} onValueChange={setPokemon2Id}>
              <SelectTrigger className="bg-[#2E2E2E] border-[#444444] text-[#E0E0E0]">
                <SelectValue placeholder="Select a Pokémon" />
              </SelectTrigger>
              <SelectContent className="bg-[#2E2E2E] border-[#444444] text-[#E0E0E0]">
                {sortedPokemon.map(pokemon => (
                  <SelectItem 
                    key={pokemon.id} 
                    value={pokemon.id.toString()}
                  >
                    {`#${pokemon.id.toString().padStart(3, '0')} - ${pokemon.name}`}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
        </div>
        
        {/* Comparison Display */}
        {pokemon1 && pokemon2 ? (
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            {/* Pokemon 1 */}
            <div className="bg-[#1E1E1E] rounded-lg overflow-hidden shadow-lg p-6">
              <div className="flex justify-between items-start mb-4">
                <h3 className="text-xl font-bold text-[#E0E0E0]">{pokemon1.name}</h3>
                <span className="text-[#A0A0A0]">#{pokemon1.id.toString().padStart(3, '0')}</span>
              </div>
              
              <img 
                src={pokemon1.imageUrl} 
                alt={pokemon1.name}
                className="w-full h-48 object-contain mb-4" 
                loading="lazy"
              />
              
              <div className="mb-4">
                <h4 className="text-[#E0E0E0] font-medium mb-2">Types</h4>
                <div className="flex flex-wrap gap-2">
                  {pokemon1.types.map(type => (
                    <span 
                      key={type} 
                      className="px-2 py-0.5 rounded-md text-xs font-medium text-white text-shadow inline-flex items-center justify-center h-6"
                      style={{ backgroundColor: typeColors[type as PokemonType] }}
                    >
                      {type.charAt(0).toUpperCase() + type.slice(1)}
                    </span>
                  ))}
                </div>
              </div>
              
              <div className="mb-4">
                <h4 className="text-[#E0E0E0] font-medium mb-2">Description</h4>
                <p className="text-[#A0A0A0] text-sm">{pokemon1.description}</p>
              </div>
              
              <div className="grid grid-cols-2 gap-4 text-[#A0A0A0]">
                <div>
                  <span className="block text-[#E0E0E0] font-medium">Height</span>
                  {pokemon1.height}m
                </div>
                <div>
                  <span className="block text-[#E0E0E0] font-medium">Weight</span>
                  {pokemon1.weight}kg
                </div>
                <div>
                  <span className="block text-[#E0E0E0] font-medium">Category</span>
                  {pokemon1.category}
                </div>
                <div>
                  <span className="block text-[#E0E0E0] font-medium">Abilities</span>
                  {pokemon1.abilities.join(', ')}
                </div>
              </div>
              
              {/* Special Status */}
              {(pokemon1.isLegendary || pokemon1.isMythical || pokemon1.isBaby) && (
                <div className="mt-4 flex gap-2">
                  {pokemon1.isLegendary && (
                    <span className="px-2 py-1 bg-yellow-600 text-white text-xs rounded-full">
                      Legendary
                    </span>
                  )}
                  {pokemon1.isMythical && (
                    <span className="px-2 py-1 bg-pink-600 text-white text-xs rounded-full">
                      Mythical
                    </span>
                  )}
                  {pokemon1.isBaby && (
                    <span className="px-2 py-1 bg-blue-400 text-white text-xs rounded-full">
                      Baby
                    </span>
                  )}
                </div>
              )}
            </div>
            
            {/* Pokemon 2 */}
            <div className="bg-[#1E1E1E] rounded-lg overflow-hidden shadow-lg p-6">
              <div className="flex justify-between items-start mb-4">
                <h3 className="text-xl font-bold text-[#E0E0E0]">{pokemon2.name}</h3>
                <span className="text-[#A0A0A0]">#{pokemon2.id.toString().padStart(3, '0')}</span>
              </div>
              
              <img 
                src={pokemon2.imageUrl} 
                alt={pokemon2.name}
                className="w-full h-48 object-contain mb-4" 
                loading="lazy"
              />
              
              <div className="mb-4">
                <h4 className="text-[#E0E0E0] font-medium mb-2">Types</h4>
                <div className="flex flex-wrap gap-2">
                  {pokemon2.types.map(type => (
                    <span 
                      key={type} 
                      className="px-2 py-0.5 rounded-md text-xs font-medium text-white text-shadow inline-flex items-center justify-center h-6"
                      style={{ backgroundColor: typeColors[type as PokemonType] }}
                    >
                      {type.charAt(0).toUpperCase() + type.slice(1)}
                    </span>
                  ))}
                </div>
              </div>
              
              <div className="mb-4">
                <h4 className="text-[#E0E0E0] font-medium mb-2">Description</h4>
                <p className="text-[#A0A0A0] text-sm">{pokemon2.description}</p>
              </div>
              
              <div className="grid grid-cols-2 gap-4 text-[#A0A0A0]">
                <div>
                  <span className="block text-[#E0E0E0] font-medium">Height</span>
                  {pokemon2.height}m
                </div>
                <div>
                  <span className="block text-[#E0E0E0] font-medium">Weight</span>
                  {pokemon2.weight}kg
                </div>
                <div>
                  <span className="block text-[#E0E0E0] font-medium">Category</span>
                  {pokemon2.category}
                </div>
                <div>
                  <span className="block text-[#E0E0E0] font-medium">Abilities</span>
                  {pokemon2.abilities.join(', ')}
                </div>
              </div>
              
              {/* Special Status */}
              {(pokemon2.isLegendary || pokemon2.isMythical || pokemon2.isBaby) && (
                <div className="mt-4 flex gap-2">
                  {pokemon2.isLegendary && (
                    <span className="px-2 py-1 bg-yellow-600 text-white text-xs rounded-full">
                      Legendary
                    </span>
                  )}
                  {pokemon2.isMythical && (
                    <span className="px-2 py-1 bg-pink-600 text-white text-xs rounded-full">
                      Mythical
                    </span>
                  )}
                  {pokemon2.isBaby && (
                    <span className="px-2 py-1 bg-blue-400 text-white text-xs rounded-full">
                      Baby
                    </span>
                  )}
                </div>
              )}
            </div>
          </div>
        ) : (
          <div className="bg-[#1E1E1E] rounded-lg p-6 text-center">
            <p className="text-[#E0E0E0]">Select two Pokémon to compare them side by side</p>
          </div>
        )}
      </main>
      
      {/* Footer */}
      <Footer />
    </div>
  );
}