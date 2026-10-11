import type { Pokemon } from './schema';
export interface QuizQuestion {
  types: Pokemon['types'];
  options: Pokemon[];
  answerId: number;
}
export function randomPokemon(
  records: Pokemon[],
  random = Math.random,
): Pokemon | undefined {
  return records[
    Math.min(
      records.length - 1,
      Math.max(0, Math.floor(random() * records.length)),
    )
  ];
}
function shuffled<T>(values: T[], random: () => number) {
  const copy = [...values];
  for (let i = copy.length - 1; i > 0; i--) {
    const j = Math.min(i, Math.max(0, Math.floor(random() * (i + 1))));
    [copy[i], copy[j]] = [copy[j], copy[i]];
  }
  return copy;
}
export function makeQuestion(
  records: Pokemon[],
  random = Math.random,
): QuizQuestion | null {
  const target = randomPokemon(records, random);
  if (!target) return null;
  const key = (p: Pokemon) => [...p.types].sort().join(',');
  const distractors = shuffled(
    records.filter(
      (p) => p.speciesId !== target.speciesId && key(p) !== key(target),
    ),
    random,
  ).slice(0, 3);
  if (distractors.length < 3) return null;
  return {
    types: target.types,
    options: shuffled([target, ...distractors], random),
    answerId: target.speciesId,
  };
}
