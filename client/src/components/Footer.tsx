import { Github, Twitter } from 'lucide-react';

export function Footer() {
  return (
    <footer className="bg-[#1E1E1E] py-6 px-4 mt-12">
      <div className="container mx-auto text-center text-[#A0A0A0]">
        <p>This PokéDex is a fan-made application. Pokémon and all related properties belong to Nintendo, Game Freak, and The Pokémon Company.</p>
        <p className="mt-2">Pokémon images sourced from the official PokeAPI. Audio files from Pokémon Showdown.</p>
        <div className="mt-4 flex justify-center space-x-4">
          <a href="https://github.com" className="hover:text-[#FFD700]" target="_blank" rel="noopener noreferrer">
            <Github size={20} />
          </a>
          <a href="https://twitter.com" className="hover:text-[#FFD700]" target="_blank" rel="noopener noreferrer">
            <Twitter size={20} />
          </a>
        </div>
      </div>
    </footer>
  );
}
