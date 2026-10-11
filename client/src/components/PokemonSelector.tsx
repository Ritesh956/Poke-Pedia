import { useId, useState } from 'react';
import type { Pokemon } from '@shared/schema';
import { filterPokemon } from '@shared/pokemon';
import { Input } from './ui/input';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from './ui/select';
export function PokemonSelector({
  label,
  records,
  value,
  onChange,
  disabled,
}: {
  label: string;
  records: Pokemon[];
  value: string;
  onChange: (value: string) => void;
  disabled?: boolean;
}) {
  const id = useId(),
    [search, setSearch] = useState('');
  const matches = filterPokemon(records, {
    query: search,
    type: 'all',
    legendary: false,
    mythical: false,
    baby: false,
    sort: 'id',
  });
  const selected = records.find((p) => String(p.speciesId) === value);
  const options =
    selected && !matches.includes(selected) ? [selected, ...matches] : matches;
  return (
    <div className="pokemon-selector">
      <label htmlFor={`${id}-search`}>{label}</label>
      <Input
        id={`${id}-search`}
        value={search}
        onChange={(e) => setSearch(e.target.value)}
        disabled={disabled}
        placeholder="Find by name or number…"
        type="search"
      />
      <label htmlFor={`${id}-select`} className="sr-only">
        Choose {label.toLowerCase()}
      </label>
      <Select
        value={value}
        onValueChange={onChange}
        disabled={disabled || !options.length}
      >
        <SelectTrigger id={`${id}-select`}>
          <SelectValue
            placeholder={
              options.length ? 'Choose a Pokémon' : 'No matching Pokémon'
            }
          />
        </SelectTrigger>
        <SelectContent>
          {options.map((p) => (
            <SelectItem key={p.speciesId} value={String(p.speciesId)}>
              #{String(p.speciesId).padStart(3, '0')} · {p.name}
            </SelectItem>
          ))}
        </SelectContent>
      </Select>
      {search.trim() && (
        <p className="muted selector-status" role="status">
          {matches.length} matches
        </p>
      )}
      {value && (
        <button
          className="text-action"
          onClick={() => {
            onChange('');
            setSearch('');
          }}
        >
          Clear selection
        </button>
      )}
    </div>
  );
}
