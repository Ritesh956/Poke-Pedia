export function Footer() {
  return (
    <footer className="app-footer">
      <div className="page-width">
        <p>
          PokemonPedia is a fan-made application. Pokémon and all related
          properties belong to Nintendo, Game Freak, and The Pokémon Company.
        </p>
        <p>
          Data, artwork, and cry references provided by{' '}
          <a
            href="https://pokeapi.co"
            target="_blank"
            rel="noopener noreferrer"
          >
            PokéAPI
          </a>
          .
        </p>
      </div>
    </footer>
  );
}
