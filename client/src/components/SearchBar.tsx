import { useState, useEffect, useRef } from 'react';
import { Search } from 'lucide-react';

interface SearchBarProps {
  onSearch: (query: string) => void;
}

export function SearchBar({ onSearch }: SearchBarProps) {
  const [query, setQuery] = useState('');
  const searchTimeout = useRef<NodeJS.Timeout | null>(null);
  
  // Handle search with debounce
  useEffect(() => {
    if (searchTimeout.current) {
      clearTimeout(searchTimeout.current);
    }
    
    searchTimeout.current = setTimeout(() => {
      onSearch(query);
    }, 300);
    
    return () => {
      if (searchTimeout.current) {
        clearTimeout(searchTimeout.current);
      }
    };
  }, [query, onSearch]);
  
  return (
    <div className="relative w-full sm:w-96">
      <input 
        type="text" 
        value={query}
        onChange={(e) => setQuery(e.target.value)}
        placeholder="Search Pokémon..." 
        className="w-full py-2 px-4 bg-background text-[#E0E0E0] rounded-full border border-gray-700 focus:outline-none focus:border-[#FFD700]"
      />
      <button className="absolute right-3 top-1/2 transform -translate-y-1/2 text-gray-400 hover:text-[#FFD700]">
        <Search size={18} />
      </button>
    </div>
  );
}
