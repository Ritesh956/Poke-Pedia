import { useRef, useState } from 'react';
import { Link } from 'wouter';
import {
  makeQuestion,
  randomPokemon,
  type QuizQuestion,
} from '@shared/discovery';
import { useCatalogue } from '@/lib/pokemonData';
import { AppShell, RequestState } from '@/components/AppShell';
import { PokemonCard } from '@/components/PokemonCard';
import { TypeBadge } from '@/components/TypeBadge';
export default function Discover() {
  const catalogue = useCatalogue(),
    records = catalogue.data?.pokemon ?? [];
  const [mode, setMode] = useState<'random' | 'quiz'>('random'),
    [id, setId] = useState<number | null>(null),
    [question, setQuestion] = useState<QuizQuestion | null>(null),
    [answer, setAnswer] = useState<number | null>(null),
    [streak, setStreak] = useState(0),
    [best, setBest] = useState(() => {
      try {
        const score = Number(
          localStorage.getItem('pokemonpedia.quiz.best.v1') ?? 0,
        );
        return Number.isSafeInteger(score) && score >= 0 ? score : 0;
      } catch {
        return 0;
      }
    }),
    [warning, setWarning] = useState('');
  const answered = useRef(false),
    focus = useRef<HTMLHeadingElement>(null);
  const next = () => {
    answered.current = false;
    const nextQuestion = makeQuestion(records);
    setQuestion(nextQuestion);
    if (!nextQuestion)
      setWarning(
        'This snapshot does not have enough different type sets for a quiz.',
      );
    setAnswer(null);
    requestAnimationFrame(() => focus.current?.focus());
  };
  const choose = (chosen: number) => {
    if (!question || answered.current) return;
    answered.current = true;
    setAnswer(chosen);
    const score = chosen === question.answerId ? streak + 1 : 0;
    setStreak(score);
    if (score > best) {
      setBest(score);
      try {
        localStorage.setItem('pokemonpedia.quiz.best.v1', String(score));
      } catch {
        setWarning(
          'Your best streak could not be saved. It remains available for this session.',
        );
      }
    }
  };
  const selected = records.find((p) => p.speciesId === id),
    correct = question?.options.find((p) => p.speciesId === question.answerId);
  return (
    <AppShell>
      <div className="page-heading">
        <h1>Discover Pokémon</h1>
        <p className="muted">
          Meet a random Pokémon or test your knowledge of its types.
        </p>
      </div>
      <div
        className="collection-filter"
        role="group"
        aria-label="Discovery mode"
      >
        <button
          className="action secondary"
          aria-pressed={mode === 'random'}
          onClick={() => setMode('random')}
        >
          Random Pokémon
        </button>
        <button
          className="action secondary"
          aria-pressed={mode === 'quiz'}
          onClick={() => setMode('quiz')}
        >
          Type quiz
        </button>
      </div>
      <RequestState
        loading={catalogue.isPending}
        error={catalogue.isError}
        retry={() => void catalogue.refetch()}
      />
      {catalogue.isSuccess && mode === 'random' && (
        <section className="random-discovery">
          <button
            className="action"
            disabled={!records.length}
            onClick={() => setId(randomPokemon(records)?.speciesId ?? null)}
          >
            Discover a random Pokémon
          </button>
          {selected ? (
            <div className="discovery-result">
              <PokemonCard pokemon={selected} layout="box" />
            </div>
          ) : (
            <p className="request-state">
              Choose Discover to meet a Pokémon from the saved catalogue.
            </p>
          )}
        </section>
      )}
      {catalogue.isSuccess && mode === 'quiz' && (
        <section className="type-quiz">
          <h2 ref={focus} tabIndex={-1}>
            Which Pokémon has exactly these types?
          </h2>
          <p className="muted">
            Four choices, one matching set of types. Artwork is not needed to
            answer.
          </p>
          <p className="quiz-score">
            Streak: {streak} · Best streak: {best} (saved in this browser)
          </p>
          {warning && <p role="status">{warning}</p>}
          {question ? (
            <>
              <div className="badge-row">
                {question.types.map((type) => (
                  <TypeBadge key={type} type={type} />
                ))}
              </div>
              <div className="quiz-options">
                {question.options.map((option) => (
                  <button
                    key={option.speciesId}
                    className="action secondary"
                    disabled={answer !== null}
                    onClick={() => choose(option.speciesId)}
                  >
                    {option.name}
                  </button>
                ))}
              </div>
              {answer !== null && (
                <p role="status" className="quiz-feedback">
                  {answer === question.answerId ? 'Correct!' : 'Not quite.'} The
                  answer is {correct?.name}.{' '}
                  <Link
                    href={`/pokemon/${question.answerId}`}
                    className="text-action"
                  >
                    View details
                  </Link>
                </p>
              )}
            </>
          ) : (
            <p className="request-state">
              Start a quiz to see your first set of types.
            </p>
          )}
          <button
            className="action"
            disabled={question !== null && answer === null}
            onClick={next}
          >
            {question ? 'Next question' : 'Start quiz'}
          </button>
        </section>
      )}
    </AppShell>
  );
}
