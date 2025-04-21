import { Grid, LayoutGrid, List } from 'lucide-react';

interface ViewToggleProps {
  layout: 'grid' | 'box' | 'list';
  setLayout: (layout: 'grid' | 'box' | 'list') => void;
}

export function ViewToggle({ layout, setLayout }: ViewToggleProps) {
  const buttonClass = "px-3 py-1 rounded hover:bg-gray-800";
  const activeButtonClass = "px-3 py-1 rounded bg-background text-[#E0E0E0]";
  
  return (
    <div className="flex items-center space-x-2">
      <span className="text-[#A0A0A0]">View:</span>
      <div className="bg-[#1E1E1E] rounded-lg p-1 flex space-x-1">
        <button 
          className={layout === 'grid' ? activeButtonClass : buttonClass}
          onClick={() => setLayout('grid')}
          aria-label="Grid View"
        >
          <Grid size={18} />
        </button>
        <button 
          className={layout === 'box' ? activeButtonClass : buttonClass}
          onClick={() => setLayout('box')}
          aria-label="Box View"
        >
          <LayoutGrid size={18} />
        </button>
        <button 
          className={layout === 'list' ? activeButtonClass : buttonClass}
          onClick={() => setLayout('list')}
          aria-label="List View"
        >
          <List size={18} />
        </button>
      </div>
    </div>
  );
}
