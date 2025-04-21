import type { Express } from "express";
import { createServer, type Server } from "http";
import { storage } from "./storage";
import axios from "axios";
import { typeColors, pokemonTypes, type PokemonType } from "@shared/schema";

// Generate all Pokemon IDs from 1 to 1010 (all Pokemon up to Gen 9)
const popularPokemonIds: number[] = [];

// Generate IDs for all Pokemon (1-1010)
for (let i = 1; i <= 1010; i++) {
  popularPokemonIds.push(i);
}

// Skip some problematic form variants that might cause issues
const skipIds: number[] = [
  // Add any problematic IDs here if needed
];

// Filter out problematic IDs
const filteredPokemonIds = popularPokemonIds.filter(id => !skipIds.includes(id));

// Custom interface for PokeAPI response
interface PokeAPIResponse {
  id: number;
  name: string;
  height: number;
  weight: number;
  abilities: {
    ability: {
      name: string;
    };
  }[];
  types: {
    type: {
      name: string;
    };
  }[];
  sprites: {
    other: {
      'official-artwork': {
        front_default: string;
      };
    };
  };
  species: {
    url: string;
  };
}

interface SpeciesResponse {
  genera: {
    genus: string;
    language: {
      name: string;
    };
  }[];
  flavor_text_entries: {
    flavor_text: string;
    language: {
      name: string;
    };
  }[];
  is_legendary: boolean;
  is_mythical: boolean;
  is_baby: boolean;
  evolution_chain: {
    url: string;
  };
}

export async function registerRoutes(app: Express): Promise<Server> {
  // Create HTTP server
  const httpServer = createServer(app);

  // API endpoint to get all Pokemon
  app.get('/api/pokemon', async (req, res) => {
    try {
      // Get Pokemon from storage or fetch if not available
      let pokemonList = await storage.getAllPokemon();
      
      if (pokemonList.length === 0) {
        // Initialize data if empty
        await initializePokemonData();
        pokemonList = await storage.getAllPokemon();
      }
      
      // Check if we need to fetch all Pokemon
      const limit = req.query.limit ? parseInt(req.query.limit as string) : 0;
      const offset = req.query.offset ? parseInt(req.query.offset as string) : 0;
      
      // Sort by ID before returning
      pokemonList.sort((a, b) => a.id - b.id);
      
      // Apply limit and offset if provided
      const resultList = limit > 0 
        ? pokemonList.slice(offset, offset + limit)
        : pokemonList;
      
      res.json(resultList);
    } catch (error) {
      console.error('Error fetching Pokemon:', error);
      res.status(500).json({ message: 'Error fetching Pokemon data' });
    }
  });

  // API endpoint to get Pokemon by types
  app.get('/api/pokemon/types/:type', async (req, res) => {
    try {
      const type = req.params.type as PokemonType;
      if (!pokemonTypes.includes(type as any)) {
        return res.status(400).json({ message: 'Invalid Pokemon type' });
      }
      
      const pokemonList = await storage.getPokemonByType(type);
      
      // Sort by ID before returning
      pokemonList.sort((a, b) => a.id - b.id);
      
      res.json(pokemonList);
    } catch (error) {
      console.error('Error fetching Pokemon by type:', error);
      res.status(500).json({ message: 'Error fetching Pokemon data by type' });
    }
  });

  // API endpoint to get Pokemon types
  app.get('/api/types', (req, res) => {
    const types = pokemonTypes.map(type => ({
      name: type,
      color: typeColors[type]
    }));
    res.json(types);
  });

  return httpServer;
}

// Helper function to initialize Pokemon data
async function initializePokemonData() {
  console.log('Initializing Pokemon data...');
  
  const fetchedPokemon = [];
  
  // Fetch data from PokeAPI for each Pokemon
  for (const id of filteredPokemonIds) {
    try {
      // Fetch basic Pokemon data
      const pokemonResponse = await axios.get<PokeAPIResponse>(
        `https://pokeapi.co/api/v2/pokemon/${id}`
      );
      const pokemonData = pokemonResponse.data;
      
      // Fetch species data for description and category
      const speciesResponse = await axios.get<SpeciesResponse>(
        pokemonData.species.url
      );
      const speciesData = speciesResponse.data;
      
      // Extract English description
      const description = speciesData.flavor_text_entries
        .find(entry => entry.language.name === 'en')?.flavor_text
        .replace(/\f/g, ' ') || 'No description available.';
      
      // Extract category (genus)
      const category = speciesData.genera
        .find(genus => genus.language.name === 'en')?.genus
        .replace(' Pokémon', '') || 'Unknown';
        
      // Get Pokemon types
      const types = pokemonData.types.map(t => t.type.name as PokemonType);
      
      // Get abilities (just the first one for simplicity)
      const abilities = pokemonData.abilities.map(a => 
        a.ability.name.split('-')
          .map(word => word.charAt(0).toUpperCase() + word.slice(1))
          .join(' ')
      );
      
      // Format name for sound URL (handle special cases)
      let soundFileName = pokemonData.name.toLowerCase();
      
      // Handle special cases for Pokemon names with hyphens and special forms
      if (soundFileName.includes('-')) {
        // Special cases that have unique sounds
        const specialForms = ['alola', 'galar', 'hisui', 'mega', 'gmax', 'primal'];
        const isSpecialForm = specialForms.some(form => soundFileName.includes(form));
        
        if (!isSpecialForm) {
          // For most hyphenated Pokemon, we just need the base name
          soundFileName = soundFileName.split('-')[0];
        }
      }
      
      // Create the Pokemon object
      const pokemon = {
        id: pokemonData.id,
        name: pokemonData.name.charAt(0).toUpperCase() + pokemonData.name.slice(1),
        types,
        height: pokemonData.height / 10, // Convert to meters
        weight: pokemonData.weight / 10, // Convert to kg
        abilities,
        description,
        imageUrl: pokemonData.sprites.other['official-artwork'].front_default,
        soundUrl: `https://play.pokemonshowdown.com/audio/cries/${soundFileName}.mp3`,
        category,
        isLegendary: speciesData.is_legendary,
        isMythical: speciesData.is_mythical,
        isBaby: speciesData.is_baby,
        evolutionChainUrl: speciesData.evolution_chain?.url || null,
      };
      
      fetchedPokemon.push(pokemon);
      
      // Store the Pokemon in storage
      await storage.addPokemon(pokemon);
      
      console.log(`Added Pokemon: ${pokemon.name}`);
    } catch (error) {
      console.error(`Error fetching Pokemon with ID ${id}:`, error);
    }
  }
  
  console.log(`Initialized ${fetchedPokemon.length} Pokemon`);
}
