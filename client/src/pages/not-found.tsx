import { Link } from 'wouter';
import { AppShell } from '@/components/AppShell';

export default function NotFound() {
  return (
    <AppShell>
      <h1>Page not found</h1>
      <p className="request-state">
        This page does not exist. Return to the Pokédex to find a Pokémon.
      </p>
      <Link href="/" className="action">
        Open Pokédex
      </Link>
    </AppShell>
  );
}
