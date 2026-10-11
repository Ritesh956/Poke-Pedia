import { useEffect, type ReactNode } from 'react';
import { Link, useLocation } from 'wouter';
import { CircleDot } from 'lucide-react';
import { Footer } from './Footer';
import { useCollection } from '@/lib/collection';
export function AppShell({ children }: { children: ReactNode }) {
  const [path] = useLocation();
  const { warning } = useCollection();
  useEffect(() => {
    document.title = `${path === '/' ? 'Explore the Pokédex' : path === '/compare' ? 'Compare Pokémon' : path === '/evolution' ? 'Evolution families' : path === '/team' ? 'Team builder' : path === '/discover' ? 'Discover Pokémon' : 'Pokémon details'} | PokemonPedia`;
    window.scrollTo(0, 0);
  }, [path]);
  return (
    <div className="app-shell">
      <a
        href="#main"
        className="skip-link"
        onClick={(e) => {
          e.preventDefault();
          document.getElementById('main')?.focus();
        }}
      >
        Skip to content
      </a>
      <header className="app-header">
        <div className="page-width header-content">
          <Link href="/" className="brand">
            <CircleDot aria-hidden="true" />
            <span>PokemonPedia</span>
          </Link>
          <nav aria-label="Main navigation">
            {[
              ['/', 'Pokédex'],
              ['/compare', 'Compare'],
              ['/evolution', 'Evolution'],
              ['/team', 'Team'],
              ['/discover', 'Discover'],
            ].map(([href, name]) => (
              <Link
                key={href}
                href={href}
                aria-current={path === href ? 'page' : undefined}
              >
                {name}
              </Link>
            ))}
          </nav>
        </div>
      </header>
      <main id="main" tabIndex={-1} className="page-width main-content">
        {warning && (
          <p role="status" className="storage-warning">
            {warning}
          </p>
        )}
        {children}
      </main>
      <Footer />
    </div>
  );
}
export function RequestState({
  loading,
  error,
  retry,
}: {
  loading: boolean;
  error: boolean;
  retry: () => void;
}) {
  if (loading)
    return (
      <p role="status" className="request-state">
        Loading the saved catalogue…
      </p>
    );
  if (error)
    return (
      <div className="request-state" role="alert">
        <p>
          The saved catalogue could not be loaded. Check your connection and try
          again.
        </p>
        <button className="action" onClick={retry}>
          Retry
        </button>
      </div>
    );
  return null;
}
