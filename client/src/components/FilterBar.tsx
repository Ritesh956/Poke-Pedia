import { pokemonTypes, typeColors, PokemonType } from '@shared/schema';
import { Badge } from '@/components/ui/badge';
import { ViewToggle } from './ViewToggle';
import { Switch } from '@/components/ui/switch';
import { Label } from '@/components/ui/label';

interface FilterBarProps {
  activeType: PokemonType | 'all';
  setActiveType: (type: PokemonType | 'all') => void;
  pokemonCount: number;
  layout: 'grid' | 'box' | 'list';
  setLayout: (layout: 'grid' | 'box' | 'list') => void;
  showLegendary: boolean;
  setShowLegendary: (show: boolean) => void;
  showMythical: boolean;
  setShowMythical: (show: boolean) => void;
  showBaby: boolean;
  setShowBaby: (show: boolean) => void;
}

export function FilterBar({ activeType, setActiveType, pokemonCount, layout, setLayout }: FilterBarProps) {
  return (
    <div className="mb-8">
      <div className="flex flex-wrap gap-3 items-center mb-4">
        <h2 className="text-xl font-[Poppins] font-semibold text-[#E0E0E0]">Filter by Type:</h2>
        
        {/* Type Filters */}
        <div className="flex flex-wrap gap-2">
          <Badge
            key="all"
            className={`cursor-pointer font-medium py-1 px-3 ${
              activeType === 'all' ? 'ring-2 ring-white' : ''
            }`}
            style={{ backgroundColor: '#718096' }}
            onClick={() => setActiveType('all')}
          >
            All
          </Badge>
          
          {pokemonTypes.map((type) => (
            <Badge
              key={type}
              className={`cursor-pointer font-medium py-1 px-3 ${
                activeType === type ? 'ring-2 ring-white' : ''
              }`}
              style={{ backgroundColor: typeColors[type] }}
              onClick={() => setActiveType(type)}
            >
              {type.charAt(0).toUpperCase() + type.slice(1)}
            </Badge>
          ))}
        </div>
      </div>
      
      {/* View Options and Active Filters */}
      <div className="flex flex-wrap justify-between items-center">
        <ViewToggle layout={layout} setLayout={setLayout} />
        
        <div className="flex items-center mt-3 sm:mt-0">
          <span className="text-[#A0A0A0]">
            Showing <span className="text-[#FFD700]">{pokemonCount}</span> Pokémon
          </span>
        </div>
      </div>
    </div>
  );
}
