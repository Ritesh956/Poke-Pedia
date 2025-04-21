import { type Pokemon, type InsertPokemon, type PokemonType } from "@shared/schema";
import { users, type User, type InsertUser } from "@shared/schema";

// Storage interface for our application
export interface IStorage {
  // User methods
  getUser(id: number): Promise<User | undefined>;
  getUserByUsername(username: string): Promise<User | undefined>;
  createUser(user: InsertUser): Promise<User>;
  
  // Pokemon methods
  getAllPokemon(): Promise<Pokemon[]>;
  getPokemonById(id: number): Promise<Pokemon | undefined>;
  getPokemonByName(name: string): Promise<Pokemon | undefined>;
  getPokemonByType(type: PokemonType): Promise<Pokemon[]>;
  addPokemon(pokemon: InsertPokemon): Promise<Pokemon>;
}

export class MemStorage implements IStorage {
  private users: Map<number, User>;
  private pokemon: Map<number, Pokemon>;
  currentId: number;

  constructor() {
    this.users = new Map();
    this.pokemon = new Map();
    this.currentId = 1;
  }

  // User methods
  async getUser(id: number): Promise<User | undefined> {
    return this.users.get(id);
  }

  async getUserByUsername(username: string): Promise<User | undefined> {
    return Array.from(this.users.values()).find(
      (user) => user.username === username,
    );
  }

  async createUser(insertUser: InsertUser): Promise<User> {
    const id = this.currentId++;
    const user: User = { ...insertUser, id };
    this.users.set(id, user);
    return user;
  }
  
  // Pokemon methods
  async getAllPokemon(): Promise<Pokemon[]> {
    return Array.from(this.pokemon.values());
  }
  
  async getPokemonById(id: number): Promise<Pokemon | undefined> {
    return this.pokemon.get(id);
  }
  
  async getPokemonByName(name: string): Promise<Pokemon | undefined> {
    name = name.toLowerCase();
    return Array.from(this.pokemon.values()).find(
      (pokemon) => pokemon.name.toLowerCase() === name
    );
  }
  
  async getPokemonByType(type: PokemonType): Promise<Pokemon[]> {
    return Array.from(this.pokemon.values()).filter(
      (pokemon) => pokemon.types.includes(type)
    );
  }
  
  async addPokemon(pokemon: InsertPokemon): Promise<Pokemon> {
    const id = pokemon.id;
    const newPokemon = pokemon as Pokemon;
    this.pokemon.set(id, newPokemon);
    return newPokemon;
  }
}

export const storage = new MemStorage();
