import { useState, useEffect } from 'react';
import { useQuery } from '@tanstack/react-query';
import { Pokemon as BasePokemon, PokemonType, typeColors } from '@shared/schema';
import { Link } from 'wouter';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Footer } from '@/components/Footer';
import axios from 'axios';

// Extended Pokemon interface to handle optional special properties
interface Pokemon extends BasePokemon {
  isLegendary: boolean;
  isMythical: boolean;
  isBaby: boolean;
  evolutionChainUrl: string | null;
}

interface EvolutionChain {
  species: {
    name: string;
    url: string;
  };
  evolves_to: EvolutionChain[];
}

export default function Evolution() {
  const [selectedPokemonId, setSelectedPokemonId] = useState<string>('');
  const [evolutionChain, setEvolutionChain] = useState<Pokemon[]>([]);
  const [isLoadingEvolution, setIsLoadingEvolution] = useState(false);
  
  // Fetch all Pokemon data for selection
  const { data: allPokemon = [], isLoading } = useQuery<Pokemon[]>({
    queryKey: ['/api/pokemon'],
  });
  
  // Sort Pokemon by ID for dropdown
  const sortedPokemon = [...allPokemon].sort((a, b) => a.id - b.id);
  
  // Get selected Pokemon
  const selectedPokemon = sortedPokemon.find(p => p.id.toString() === selectedPokemonId);
  
  // Fetch evolution chain when Pokemon is selected
  useEffect(() => {
    if (selectedPokemon?.evolutionChainUrl) {
      fetchEvolutionChain(selectedPokemon.evolutionChainUrl);
    } else {
      setEvolutionChain([]);
    }
  }, [selectedPokemonId, allPokemon]);
  
  // Function to fetch evolution chain data
  const fetchEvolutionChain = async (evolutionChainUrl: string) => {
    try {
      setIsLoadingEvolution(true);
      
      // Extract ID from URL
      const urlParts = evolutionChainUrl.split('/');
      const chainId = urlParts[urlParts.length - 2]; // Get ID from URL
      
      // Use our API endpoint to get the evolution chain
      const response = await axios.get(`/api/evolution-chain/${chainId}`);
      const chain = response.data.chain;
      
      // Process the evolution chain recursively - get species names
      const speciesNames = processEvolutionChain(chain);
      
      // Normalize names for better matching
      const normalizedNames = speciesNames.map(name => name.toLowerCase());
      
      // Use an object to track already matched IDs to avoid duplicates
      const matchedIds = new Set<number>();
      const evolutionPokemons: Pokemon[] = [];
      
      // First try exact name matches (better for special forms)
      normalizedNames.forEach(speciesName => {
        const match = allPokemon.find(p => 
          p.name.toLowerCase() === capitalizeFirstLetter(speciesName) && 
          !matchedIds.has(p.id)
        );
        
        if (match) {
          matchedIds.add(match.id);
          evolutionPokemons.push(match);
        }
      });
      
      // For any names that don't have matches, try a more flexible approach
      normalizedNames.forEach(speciesName => {
        // Skip if already matched
        if (evolutionPokemons.some(p => p.name.toLowerCase() === capitalizeFirstLetter(speciesName))) {
          return;
        }
        
        // Try various matching approaches
        const match = allPokemon.find(p => {
          // Skip already matched IDs
          if (matchedIds.has(p.id)) return false;
          
          const pokemonNameLower = p.name.toLowerCase();
          
          return (
            // Match name with hyphens removed
            pokemonNameLower.replace(/-/g, '') === speciesName.replace(/-/g, '') ||
            // Match base name (before any hyphens)
            pokemonNameLower.split('-')[0] === speciesName ||
            // Match basic forms
            speciesName.includes(pokemonNameLower.split('-')[0])
          );
        });
        
        if (match) {
          matchedIds.add(match.id);
          evolutionPokemons.push(match);
        }
      });
      
      // If we still have missing Pokémon, try a third approach with even more flexibility
      if (evolutionPokemons.length < normalizedNames.length) {
        // Log info for debugging
        console.log('Evolution species names:', normalizedNames);
        console.log('Matched Pokémon so far:', evolutionPokemons.map(p => p.name));
        
        // For each species name that doesn't have a match yet, find the best match
        normalizedNames.forEach(speciesName => {
          // Skip if already matched
          if (evolutionPokemons.some(p => 
            p.name.toLowerCase() === capitalizeFirstLetter(speciesName) ||
            p.name.toLowerCase().replace(/-/g, '') === speciesName.replace(/-/g, '')
          )) {
            return;
          }
          
          // Try to find a close match
          const availablePokemon = allPokemon.filter(p => !matchedIds.has(p.id));
          const baseName = speciesName.split('-')[0]; // Get base name before hyphens
          
          const bestMatch = availablePokemon.find(p => 
            p.name.toLowerCase().includes(baseName) || 
            baseName.includes(p.name.toLowerCase().split('-')[0])
          );
          
          if (bestMatch) {
            matchedIds.add(bestMatch.id);
            evolutionPokemons.push(bestMatch);
          }
        });
      }
      
      // Sort by ID to ensure correct evolution order if names have strange matching issues
      evolutionPokemons.sort((a, b) => a.id - b.id);
      
      setEvolutionChain(evolutionPokemons);
      setIsLoadingEvolution(false);
    } catch (error) {
      console.error('Error fetching evolution chain:', error);
      setIsLoadingEvolution(false);
    }
  };
  
  // Helper function to capitalize first letter
  const capitalizeFirstLetter = (string: string): string => {
    return string.charAt(0).toUpperCase() + string.slice(1);
  };
  
  // Function to extract Pokemon names from evolution chain recursively
  const processEvolutionChain = (chain: EvolutionChain): string[] => {
    let results: string[] = [chain.species.name];
    
    if (chain.evolves_to && chain.evolves_to.length > 0) {
      chain.evolves_to.forEach(evolution => {
        results = [...results, ...processEvolutionChain(evolution)];
      });
    }
    
    return results;
  };
  
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
              <span className="bg-[#7038F8] text-white px-4 py-2 rounded-full hover:bg-opacity-80 transition duration-200 font-medium cursor-pointer">
                Back to Pokédex
              </span>
            </Link>
          </div>
        </div>
      </header>

      {/* Main Content */}
      <main className="container mx-auto px-4 sm:px-6 md:px-8 py-6">
        <h2 className="text-2xl font-bold font-[Poppins] text-[#E0E0E0] mb-6">Evolution Lines</h2>
        
        {/* Pokemon Selection */}
        <div className="mb-8">
          <label className="block mb-2 text-[#E0E0E0] font-medium">Select a Pokémon</label>
          <Select value={selectedPokemonId} onValueChange={setSelectedPokemonId}>
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
        
        {/* Evolution Chain Display */}
        {isLoadingEvolution ? (
          <div className="bg-[#1E1E1E] rounded-lg p-6 text-center">
            <p className="text-[#E0E0E0]">Loading evolution chain...</p>
          </div>
        ) : evolutionChain.length > 0 ? (
          <div className="bg-[#1E1E1E] rounded-lg p-6">
            <h3 className="text-xl font-bold text-[#E0E0E0] mb-4">Evolution Line</h3>
            
            {/* Responsive evolution chain display */}
            <div className="flex flex-wrap items-center justify-center gap-4">
              {evolutionChain.map((pokemon, index) => (
                <div key={pokemon.id} className="flex flex-col sm:flex-row items-center mb-4">
                  {/* Pokemon Card */}
                  <div className="bg-[#2A2A2A] rounded-lg p-4 shadow-md w-64">
                    <div className="flex justify-between items-start mb-2">
                      <h4 className="text-lg font-medium text-[#E0E0E0]">{pokemon.name}</h4>
                      <span className="text-[#A0A0A0]">#{pokemon.id.toString().padStart(3, '0')}</span>
                    </div>
                    
                    <img 
                      src={pokemon.imageUrl} 
                      alt={pokemon.name}
                      className="w-full h-36 object-contain mb-3" 
                      loading="lazy"
                    />
                    
                    <div className="flex flex-wrap gap-1 mb-2">
                      {pokemon.types.map(type => (
                        <span 
                          key={`${pokemon.id}-${type}`} 
                          className="px-2 py-0.5 rounded-md text-xs font-medium text-white text-shadow inline-flex items-center justify-center h-6"
                          style={{ backgroundColor: typeColors[type as PokemonType] }}
                        >
                          {type.charAt(0).toUpperCase() + type.slice(1)}
                        </span>
                      ))}
                    </div>
                    
                    {/* Special tags if applicable */}
                    {(pokemon.isLegendary || pokemon.isMythical || pokemon.isBaby) && (
                      <div className="flex gap-1 flex-wrap">
                        {pokemon.isLegendary && (
                          <span className="px-1.5 py-0.5 bg-yellow-600 text-white text-xs rounded-full">
                            Legendary
                          </span>
                        )}
                        {pokemon.isMythical && (
                          <span className="px-1.5 py-0.5 bg-pink-600 text-white text-xs rounded-full">
                            Mythical
                          </span>
                        )}
                        {pokemon.isBaby && (
                          <span className="px-1.5 py-0.5 bg-blue-400 text-white text-xs rounded-full">
                            Baby
                          </span>
                        )}
                      </div>
                    )}
                  </div>
                  
                  {/* Arrow to next evolution - different directions based on screen size */}
                  {index < evolutionChain.length - 1 && (
                    <>
                      {/* Down arrow for mobile */}
                      <div className="block sm:hidden my-2 text-[#E0E0E0]">
                        <svg xmlns="http://www.w3.org/2000/svg" className="h-8 w-8" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 14l-7 7m0 0l-7-7m7 7V3" />
                        </svg>
                      </div>
                      
                      {/* Right arrow for desktop */}
                      <div className="hidden sm:block mx-4 text-[#E0E0E0]">
                        <svg xmlns="http://www.w3.org/2000/svg" className="h-8 w-8" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M14 5l7 7m0 0l-7 7m7-7H3" />
                        </svg>
                      </div>
                    </>
                  )}
                </div>
              ))}
            </div>
          </div>
        ) : selectedPokemonId ? (
          <div className="bg-[#1E1E1E] rounded-lg p-6 text-center">
            <p className="text-[#E0E0E0]">Evolution data not available for this Pokémon</p>
          </div>
        ) : (
          <div className="bg-[#1E1E1E] rounded-lg p-6 text-center">
            <p className="text-[#E0E0E0]">Select a Pokémon to see its evolution line</p>
          </div>
        )}
      </main>
      
      {/* Footer */}
      <Footer />
    </div>
  );
}