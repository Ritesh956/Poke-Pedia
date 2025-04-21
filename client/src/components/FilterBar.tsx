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

export function FilterBar({ 
  activeType, 
  setActiveType, 
  pokemonCount, 
  layout, 
  setLayout,
  showLegendary,
  setShowLegendary,
  showMythical,
  setShowMythical,
  showBaby,
  setShowBaby
}: FilterBarProps) {
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
      
      {/* Special Pokemon Filters - Enhanced Version */}
      <div className="flex flex-wrap gap-6 items-center mb-4">
        <h2 className="text-xl font-[Poppins] font-semibold text-[#E0E0E0]">Special Pokémon:</h2>
        
        <div className="flex flex-wrap gap-4">
          {/* Legendary Button */}
          <div className={`flex items-center space-x-2 p-2 rounded-lg ${showLegendary ? 'bg-gradient-to-r from-yellow-900/40 to-yellow-800/30' : 'hover:bg-gray-800'} transition-colors cursor-pointer`}
            onClick={() => setShowLegendary(!showLegendary)}
          >
            <Switch 
              id="legendary-filter" 
              checked={showLegendary}
              onCheckedChange={setShowLegendary}
              className={`${showLegendary ? 'data-[state=checked]:bg-yellow-600' : ''}`}
            />
            <Label 
              htmlFor="legendary-filter" 
              className={`${showLegendary ? 'text-yellow-300' : 'text-[#E0E0E0]'} cursor-pointer font-medium`}
            >
              Legendary
            </Label>
            {showLegendary && (
              <div className="h-6 w-6 text-yellow-400">
                <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" d="M11.48 3.499a.562.562 0 011.04 0l2.125 5.111a.563.563 0 00.475.345l5.518.442c.499.04.701.663.321.988l-4.204 3.602a.563.563 0 00-.182.557l1.285 5.385a.562.562 0 01-.84.61l-4.725-2.885a.563.563 0 00-.586 0L6.982 20.54a.562.562 0 01-.84-.61l1.285-5.386a.562.562 0 00-.182-.557l-4.204-3.602a.563.563 0 01.321-.988l5.518-.442a.563.563 0 00.475-.345L11.48 3.5z" />
                </svg>
              </div>
            )}
          </div>
          
          {/* Mythical Button */}
          <div className={`flex items-center space-x-2 p-2 rounded-lg ${showMythical ? 'bg-gradient-to-r from-pink-900/40 to-pink-800/30' : 'hover:bg-gray-800'} transition-colors cursor-pointer`}
            onClick={() => setShowMythical(!showMythical)}
          >
            <Switch 
              id="mythical-filter" 
              checked={showMythical}
              onCheckedChange={setShowMythical}
              className={`${showMythical ? 'data-[state=checked]:bg-pink-600' : ''}`}
            />
            <Label 
              htmlFor="mythical-filter" 
              className={`${showMythical ? 'text-pink-300' : 'text-[#E0E0E0]'} cursor-pointer font-medium`}
            >
              Mythical
            </Label>
            {showMythical && (
              <div className="h-6 w-6 text-pink-400">
                <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" d="M9.813 15.904L9 18.75l-.813-2.846a4.5 4.5 0 00-3.09-3.09L2.25 12l2.846-.813a4.5 4.5 0 003.09-3.09L9 5.25l.813 2.846a4.5 4.5 0 003.09 3.09L15.75 12l-2.846.813a4.5 4.5 0 00-3.09 3.09zM18.259 8.715L18 9.75l-.259-1.035a3.375 3.375 0 00-2.455-2.456L14.25 6l1.036-.259a3.375 3.375 0 002.455-2.456L18 2.25l.259 1.035a3.375 3.375 0 002.456 2.456L21.75 6l-1.035.259a3.375 3.375 0 00-2.456 2.456zM16.894 20.567L16.5 21.75l-.394-1.183a2.25 2.25 0 00-1.423-1.423L13.5 18.75l1.183-.394a2.25 2.25 0 001.423-1.423l.394-1.183.394 1.183a2.25 2.25 0 001.423 1.423l1.183.394-1.183.394a2.25 2.25 0 00-1.423 1.423z" />
                </svg>
              </div>
            )}
          </div>
          
          {/* Baby Button */}
          <div className={`flex items-center space-x-2 p-2 rounded-lg ${showBaby ? 'bg-gradient-to-r from-blue-900/40 to-blue-800/30' : 'hover:bg-gray-800'} transition-colors cursor-pointer`}
            onClick={() => setShowBaby(!showBaby)}
          >
            <Switch 
              id="baby-filter" 
              checked={showBaby}
              onCheckedChange={setShowBaby}
              className={`${showBaby ? 'data-[state=checked]:bg-blue-500' : ''}`}
            />
            <Label 
              htmlFor="baby-filter" 
              className={`${showBaby ? 'text-blue-300' : 'text-[#E0E0E0]'} cursor-pointer font-medium`}
            >
              Baby
            </Label>
            {showBaby && (
              <div className="h-6 w-6 text-blue-400">
                <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" d="M15.182 15.182a4.5 4.5 0 01-6.364 0M21 12a9 9 0 11-18 0 9 9 0 0118 0zM9.75 9.75c0 .414-.168.75-.375.75S9 10.164 9 9.75 9.168 9 9.375 9s.375.336.375.75zm-.375 0h.008v.015h-.008V9.75zm5.625 0c0 .414-.168.75-.375.75s-.375-.336-.375-.75.168-.75.375-.75.375.336.375.75zm-.375 0h.008v.015h-.008V9.75z" />
                </svg>
              </div>
            )}
          </div>
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
