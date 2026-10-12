import { useParams } from 'wouter';
import { useCatalogue, useForms, useReference } from '@/lib/pokemonData';
import { useUrlState } from '@/lib/urlState';
import { AppShell, RequestState } from '@/components/AppShell';
import { PokemonSummary } from '@/components/PokemonSummary';
import { GameReference } from '@/components/GameReference';
import {
  languages,
  localizedDescription,
  type ReferenceLanguage,
} from '@shared/reference';
import { displayName } from '@shared/pokemon';
export default function Detail() {
  const params = useParams<{ id: string }>(),
    query = useCatalogue();
  const pokemon = query.data?.pokemon.find(
    (p) => p.speciesId === Number(params.id),
  );
  const [url, setUrl] = useUrlState(`/pokemon/${params.id}`),
    forms = useForms(pokemon?.speciesId);
  const selected =
    forms.data?.forms.find((form) => form.id === Number(url.get('form'))) ??
    forms.data?.forms.find((form) => form.isDefault) ??
    pokemon;
  const shiny = url.get('shiny') === '1';
  const reference = useReference(pokemon?.speciesId);
  const language = Object.hasOwn(languages, url.get('lang') ?? '')
    ? (url.get('lang') as ReferenceLanguage)
    : 'en';
  const game =
    reference.data?.manifest.games.find(
      (item) => item.slug === url.get('game'),
    ) ??
    reference.data?.manifest.games.find(
      (item) => item.slug === 'scarlet-violet',
    ) ??
    reference.data?.manifest.games[0];
  const description =
    reference.data && game
      ? localizedDescription(reference.data.data, language, game)
      : null;
  const names = reference.data?.data.names;
  const localizedName =
    names?.[language] ?? (language === 'ja' ? names?.['ja-Hrkt'] : undefined);
  const translated = selected
    ? {
        ...selected,
        name:
          localizedName && language !== 'en'
            ? `${localizedName}${selected.isDefault ? '' : ` · ${selected.form}`}`
            : selected.name,
        description: description?.text ?? selected.description,
      }
    : undefined;
  return (
    <AppShell>
      <h1 className="page-title">Pokémon details</h1>
      <RequestState
        loading={query.isPending}
        error={query.isError}
        retry={() => void query.refetch()}
      />
      {pokemon ? (
        <div className="detail-layout">
          <div className="form-controls">
            <label className="sort-label">
              Pokémon variety
              <select
                aria-label="Pokémon variety"
                value={selected?.id ?? pokemon.id}
                disabled={!forms.data}
                onChange={(event) => setUrl({ form: event.target.value })}
              >
                {(forms.data?.forms ?? [pokemon]).map((form) => (
                  <option key={form.id} value={form.id}>
                    {form.isDefault ? `${form.name} (default)` : form.name}
                  </option>
                ))}
              </select>
            </label>
            <label className="shiny-control">
              <input
                type="checkbox"
                checked={shiny}
                onChange={(event) =>
                  setUrl({ shiny: event.target.checked ? '1' : null })
                }
              />
              Shiny artwork
            </label>
          </div>
          <div className="form-controls">
            <label className="sort-label">
              Names and descriptions
              <select
                aria-label="Names and descriptions language"
                value={language}
                onChange={(event) => setUrl({ lang: event.target.value })}
              >
                {Object.entries(languages).map(([value, label]) => (
                  <option key={value} value={value}>
                    {label}
                  </option>
                ))}
              </select>
            </label>
            <label className="sort-label">
              Game group
              <select
                aria-label="Game group"
                value={game?.slug ?? ''}
                disabled={!reference.data}
                onChange={(event) => setUrl({ game: event.target.value })}
              >
                {reference.data?.manifest.games.map((item) => (
                  <option key={item.id} value={item.slug}>
                    {displayName(item.slug)}
                  </option>
                ))}
              </select>
            </label>
          </div>
          {reference.isPending && (
            <p role="status">Loading saved language and game reference…</p>
          )}
          {url.get('lang') && !Object.hasOwn(languages, url.get('lang')!) && (
            <p role="status">
              The requested language is unsupported. Showing English names and
              descriptions.
            </p>
          )}
          {reference.isError && (
            <p role="status">
              Language and game reference could not be loaded. Saved default
              details are available.{' '}
              <button
                className="text-action"
                onClick={() => void reference.refetch()}
              >
                Retry reference
              </button>
            </p>
          )}
          {reference.data && game && (
            <p className="reference-context muted">
              Names:{' '}
              {localizedName
                ? languages[language]
                : 'English (requested name unavailable)'}
              . Description:{' '}
              {description
                ? `${description.language === 'ja-Hrkt' ? 'Japanese kana' : (languages[description.language as ReferenceLanguage] ?? description.language)}, ${displayName(description.version)}`
                : 'English default catalogue fallback'}
              . Game group: {displayName(game.slug)}. Current types and base
              stats are shown; historical changes by game are not applied.{' '}
              {description &&
                !description.gameMatches &&
                'No description is saved for this game group; showing text from another version.'}{' '}
              {description &&
                description.language !== language &&
                !(language === 'ja' && description.language === 'ja-Hrkt') &&
                'The requested description language is unavailable for this game; showing English.'}
            </p>
          )}
          {url.get('game') &&
            reference.data &&
            !reference.data.manifest.games.some(
              (item) => item.slug === url.get('game'),
            ) && (
              <p role="status">
                The requested game group is unavailable. Showing{' '}
                {displayName(game!.slug)}.
              </p>
            )}
          {forms.isPending && <p role="status">Loading saved varieties…</p>}
          {forms.isError && (
            <p role="status">
              Saved varieties could not be loaded. Default details are
              available.{' '}
              <button
                className="text-action"
                onClick={() => void forms.refetch()}
              >
                Retry varieties
              </button>
            </p>
          )}
          {url.get('form') &&
            forms.data &&
            !forms.data.forms.some(
              (form) => String(form.id) === url.get('form'),
            ) && (
              <p role="status">
                That variety is not available for this species. Showing its
                default variety.
              </p>
            )}
          <PokemonSummary
            pokemon={translated!}
            detail
            shiny={shiny}
            nameLanguage={localizedName ? language : 'en'}
            descriptionLanguage={
              description?.language === 'ja-Hrkt'
                ? 'ja'
                : (description?.language ?? 'en')
            }
            game={game?.slug}
          />
          {reference.data && game && selected && (
            <GameReference
              key={`${selected.id}-${game.slug}`}
              data={reference.data.data}
              varietyId={selected.id}
              game={game}
            />
          )}
        </div>
      ) : (
        query.isSuccess && (
          <p>This Pokémon is not included in the saved catalogue.</p>
        )
      )}
    </AppShell>
  );
}
