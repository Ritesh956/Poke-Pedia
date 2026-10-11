import { Grid, LayoutGrid, List } from 'lucide-react';

interface ViewToggleProps {
  layout: 'grid' | 'box' | 'list';
  setLayout: (layout: 'grid' | 'box' | 'list') => void;
}

export function ViewToggle({ layout, setLayout }: ViewToggleProps) {
  const buttonClass = 'view-button';
  const activeButtonClass = 'view-button active';

  return (
    <div className="flex items-center space-x-2">
      <span className="text-[#A0A0A0]">View:</span>
      <div className="bg-[#1E1E1E] rounded-lg p-1 flex space-x-1">
        <button
          className={layout === 'grid' ? activeButtonClass : buttonClass}
          onClick={() => setLayout('grid')}
          aria-label="Grid View"
          aria-pressed={layout === 'grid'}
        >
          <Grid size={18} />
        </button>
        <button
          className={layout === 'box' ? activeButtonClass : buttonClass}
          onClick={() => setLayout('box')}
          aria-label="Box View"
          aria-pressed={layout === 'box'}
        >
          <LayoutGrid size={18} />
        </button>
        <button
          className={layout === 'list' ? activeButtonClass : buttonClass}
          onClick={() => setLayout('list')}
          aria-label="List View"
          aria-pressed={layout === 'list'}
        >
          <List size={18} />
        </button>
      </div>
    </div>
  );
}
