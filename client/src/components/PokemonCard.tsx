import { useState } from 'react';
import { useAudio } from '@/lib/useAudio';
import { Pokemon } from '@shared/schema';
import { typeColors } from '@shared/schema';

interface PokemonCardProps {
  pokemon: Pokemon;
  layout: 'grid' | 'box' | 'list';
}

export function PokemonCard({ pokemon, layout }: PokemonCardProps) {
  const [isHovering, setIsHovering] = useState(false);
  const { play } = useAudio({ 
    src: pokemon.soundUrl,
    preload: false
  });

  const handleMouseEnter = () => {
    setIsHovering(true);
    play();
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
                  style={{ backgroundColor: typeColors[type] }}
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
                  style={{ backgroundColor: typeColors[type] }}
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
