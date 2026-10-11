import { useEffect, useState } from 'react';
import { Search } from 'lucide-react';
export function SearchBar({
  value,
  onSearch,
}: {
  value: string;
  onSearch: (query: string) => void;
}) {
  const [query, setQuery] = useState(value);
  useEffect(() => {
    setQuery(value);
  }, [value]);
  useEffect(() => {
    if (query === value) return;
    const timer = setTimeout(() => onSearch(query), 300);
    return () => clearTimeout(timer);
  }, [query, value, onSearch]);
  return (
    <form
      className="search-form"
      role="search"
      onSubmit={(e) => {
        e.preventDefault();
        onSearch(query.trim());
      }}
    >
      <label htmlFor="catalogue-search" className="sr-only">
        Search Pokémon by name or Pokédex number
      </label>
      <input
        id="catalogue-search"
        type="search"
        value={query}
        onChange={(e) => setQuery(e.target.value)}
        placeholder="Search by name or number…"
        autoComplete="off"
      />
      <button type="submit" aria-label="Search Pokémon">
        <Search size={20} aria-hidden="true" />
      </button>
    </form>
  );
}
