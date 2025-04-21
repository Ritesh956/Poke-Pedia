import type { Express } from "express";
import { createServer, type Server } from "http";
import { storage } from "./storage";
import axios from "axios";
import { typeColors, pokemonTypes, type PokemonType } from "@shared/schema";

// Collection of 250 most popular Pokemon IDs
const popularPokemonIds = [
  1, 2, 3, 4, 5, 6, 7, 8, 9, 25, 26, 39, 40, 54, 55, 133, 134, 135, 136, 143, 144, 145, 146, 150, 151, 
  157, 172, 175, 196, 197, 202, 214, 243, 244, 245, 249, 250, 251, 252, 253, 254, 255, 256, 257, 258, 259, 
  260, 280, 281, 282, 315, 320, 334, 359, 380, 381, 382, 383, 384, 385, 386, 387, 388, 389, 390, 391, 392, 
  393, 394, 395, 396, 397, 398, 399, 400, 401, 402, 403, 404, 405, 445, 446, 447, 448, 470, 471, 473, 474, 
  475, 478, 479, 480, 481, 482, 483, 484, 485, 486, 487, 488, 489, 490, 491, 492, 493, 494, 495, 496, 497, 
  498, 499, 500, 501, 502, 503, 531, 570, 571, 595, 596, 609, 612, 621, 635, 636, 637, 638, 639, 640, 641, 
  642, 643, 644, 645, 646, 647, 648, 649, 650, 651, 652, 653, 654, 655, 656, 657, 658, 700, 701, 702, 706, 
  707, 710, 711, 712, 713, 719, 720, 721, 722, 723, 724, 725, 726, 727, 728, 729, 730, 778, 785, 786, 787, 
  788, 789, 790, 791, 792, 800, 801, 802, 803, 804, 805, 806, 807, 808, 809, 810, 811, 812, 813, 814, 815, 
  816, 817, 818, 819, 820, 821, 822, 823, 824, 825, 826, 888, 889, 890, 891, 892, 893, 894, 895, 896, 897, 
  898, 906, 907, 908, 909, 910, 911, 912, 913, 914, 915, 916, 917, 918, 919, 920, 921, 922, 923, 924, 925
];

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
      
      res.json(pokemonList);
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
  for (const id of popularPokemonIds) {
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
        soundUrl: `https://play.pokemonshowdown.com/audio/cries/${pokemonData.name.toLowerCase()}.mp3`,
        category,
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
