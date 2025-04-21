import { useState, useEffect } from 'react';
import { useAudio } from '@/lib/useAudio';
import { Pokemon, PokemonType, pokemonTypes, typeColors } from '@shared/schema';
import { useToast } from '@/hooks/use-toast';

interface PokemonCardProps {
  pokemon: Pokemon;
  layout: 'grid' | 'box' | 'list';
}

export function PokemonCard({ pokemon, layout }: PokemonCardProps) {
  const [isHovering, setIsHovering] = useState(false);
  const [hasSoundError, setHasSoundError] = useState(false);
  const { toast } = useToast();
  
  // Format sound URL with better compatibility
  const soundUrl = pokemon.soundUrl;
  
  // Try alternative URL if the original doesn't work
  const altSoundUrl = pokemon.id <= 151 
    ? `https://play.pokemonshowdown.com/audio/cries-old/${pokemon.name.toLowerCase().replace(/[^a-z0-9]/g, '')}.mp3` 
    : null;
  
  // Use the appropriate sound URL
  const { play, error } = useAudio({ 
    src: hasSoundError && altSoundUrl ? altSoundUrl : soundUrl,
    preload: false
  });
  
  // Check for sound errors and try alternate URL if available
  useEffect(() => {
    if (error && !hasSoundError && altSoundUrl) {
      setHasSoundError(true);
    }
  }, [error, hasSoundError, altSoundUrl]);

  const handleMouseEnter = () => {
    setIsHovering(true);
    
    // Play the sound with error handling
    try {
      play();
    } catch (err) {
      // Silent fallback, don't show errors to users
      console.log(`Sound playback issue for ${pokemon.name}`);
    }
  };

  const handleMouseLeave = () => {
    setIsHovering(false);
  };

  // Format ID to have leading zeros (e.g., 001, 025)
  const formattedId = `#${pokemon.id.toString().padStart(3, '0')}`;

  // Base classes for the card based on layout
  const cardClasses = {
    grid: "pokemon-card bg-[#1E1E1E] rounded-lg overflow-hidden shadow-lg transition-all duration-200 hover:transform hover:-translate-y-1 hover:shadow-xl",
    box: "pokemon-card bg-[#1E1E1E] rounded-lg overflow-hidden shadow-lg transition-all duration-200 hover:transform hover:-translate-y-1 hover:shadow-xl h-full",
    list: "pokemon-card bg-[#1E1E1E] rounded-lg overflow-hidden shadow-lg transition-all duration-200 hover:transform hover:-translate-y-1 hover:shadow-xl flex"
  };

  // Helper function to get color for a given type
  const getTypeColor = (type: string): string => {
    // Check if the type is in the valid PokemonType list
    if (pokemonTypes.includes(type as PokemonType)) {
      return typeColors[type as PokemonType];
    }
    // Fallback color for unknown types
    return '#718096';
  };

  return (
    <div 
      className={cardClasses[layout]}
      onMouseEnter={handleMouseEnter}
      onMouseLeave={handleMouseLeave}
    >
      {layout === 'list' ? (
        // List layout
        <>
          <div className="flex-shrink-0 p-4 flex justify-center items-center">
            <img 
              src={pokemon.imageUrl} 
              alt={pokemon.name}
              className="w-20 h-20 object-contain" 
            />
          </div>
          <div className="flex-grow p-4">
            <div className="flex justify-between items-start">
              <h3 className="text-lg font-medium text-[#E0E0E0] font-[Poppins]">{pokemon.name}</h3>
              <span className="text-[#A0A0A0]">{formattedId}</span>
            </div>
            <div className="mt-1 flex flex-wrap gap-1">
              {pokemon.types.map((type) => (
                <span 
                  key={type} 
                  className="px-2 py-0.5 rounded-md text-xs font-medium text-white text-shadow"
                  style={{ backgroundColor: getTypeColor(type) }}
                >
                  {type.charAt(0).toUpperCase() + type.slice(1)}
                </span>
              ))}
            </div>
            {isHovering && (
              <div className="mt-2 text-[#A0A0A0] text-sm">
                <p>{pokemon.description}</p>
                <div className="mt-2 grid grid-cols-2 gap-2">
                  <div>Height: {pokemon.height}m</div>
                  <div>Weight: {pokemon.weight}kg</div>
                  <div>Ability: {pokemon.abilities[0]}</div>
                  <div>Category: {pokemon.category}</div>
                </div>
              </div>
            )}
          </div>
        </>
      ) : (
        // Grid and Box layouts
        <div className="relative p-4">
          <span className="absolute top-2 right-2 text-[#A0A0A0]">{formattedId}</span>
          <img 
            src={pokemon.imageUrl} 
            alt={pokemon.name}
            className="w-full h-36 object-contain mx-auto" 
          />
          <div className="mt-2">
            <h3 className="text-lg font-medium text-[#E0E0E0] font-[Poppins]">{pokemon.name}</h3>
            <div className="mt-1 flex flex-wrap gap-1">
              {pokemon.types.map((type) => (
                <span 
                  key={type} 
                  className="px-2 py-0.5 rounded-md text-xs font-medium text-white text-shadow"
                  style={{ backgroundColor: getTypeColor(type) }}
                >
                  {type.charAt(0).toUpperCase() + type.slice(1)}
                </span>
              ))}
            </div>
          </div>
          <div className={`overflow-hidden transition-all duration-300 ${isHovering ? 'mt-3 max-h-48' : 'max-h-0'}`}>
            <div className="text-[#A0A0A0] text-sm">
              <p>{pokemon.description}</p>
              <div className="mt-2 grid grid-cols-2 gap-2">
                <div>Height: {pokemon.height}m</div>
                <div>Weight: {pokemon.weight}kg</div>
                <div>Ability: {pokemon.abilities[0]}</div>
                <div>Category: {pokemon.category}</div>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}