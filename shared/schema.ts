import { pgTable, text, serial, integer, boolean, json } from "drizzle-orm/pg-core";
import { createInsertSchema } from "drizzle-zod";
import { z } from "zod";

// Base user schema (kept from original)
export const users = pgTable("users", {
  id: serial("id").primaryKey(),
  username: text("username").notNull().unique(),
  password: text("password").notNull(),
});

export const insertUserSchema = createInsertSchema(users).pick({
  username: true,
  password: true,
});

export type InsertUser = z.infer<typeof insertUserSchema>;
export type User = typeof users.$inferSelect;

// Pokemon types
export const pokemonTypes = [
  "normal", "fire", "water", "electric", "grass", "ice", 
  "fighting", "poison", "ground", "flying", "psychic", 
  "bug", "rock", "ghost", "dragon", "dark", "steel", "fairy"
] as const;

export type PokemonType = typeof pokemonTypes[number];

// Type Colors
export const typeColors: Record<PokemonType, string> = {
  normal: '#A8A878',
  fire: '#F08030',
  water: '#6890F0',
  electric: '#F8D030',
  grass: '#78C850',
  ice: '#98D8D8',
  fighting: '#C03028',
  poison: '#A040A0',
  ground: '#E0C068',
  flying: '#A890F0',
  psychic: '#F85888',
  bug: '#A8B820',
  rock: '#B8A038',
  ghost: '#705898',
  dragon: '#7038F8',
  dark: '#705848',
  steel: '#B8B8D0',
  fairy: '#EE99AC'
};

// Pokemon schema
export const pokemon = pgTable("pokemon", {
  id: integer("id").primaryKey(),
  name: text("name").notNull(),
  types: text("types").array().notNull(),
  height: integer("height").notNull(),
  weight: integer("weight").notNull(),
  abilities: text("abilities").array().notNull(),
  description: text("description").notNull(),
  imageUrl: text("image_url").notNull(),
  soundUrl: text("sound_url").notNull(),
  category: text("category").notNull(),
});

export const pokemonSchema = createInsertSchema(pokemon);

export type Pokemon = typeof pokemon.$inferSelect;
export type InsertPokemon = typeof pokemon.$inferInsert;
