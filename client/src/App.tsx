import { Switch, Route, Router as WouterRouter } from 'wouter';
import { useHashLocation } from 'wouter/use-hash-location';
import { lazy, Suspense } from 'react';
import { queryClient } from './lib/queryClient';
import { QueryClientProvider } from '@tanstack/react-query';
import { Toaster } from '@/components/ui/toaster';
import { TooltipProvider } from '@/components/ui/tooltip';
import NotFound from '@/pages/not-found';
import Home from '@/pages/Home';
import { OfflineStatus } from '@/components/OfflineStatus';
const Compare = lazy(() => import('@/pages/Compare'));
const Evolution = lazy(() => import('@/pages/Evolution'));
const Detail = lazy(() => import('@/pages/Detail'));
const Team = lazy(() => import('@/pages/Team'));
const Discover = lazy(() => import('@/pages/Discover'));
const useRouteLocation = Object.assign(
  function useRouteLocation(): [string, (to: string) => void] {
    const [location] = useHashLocation();
    const navigate = (to: string) => {
      window.location.hash = to;
    };
    return [location.split('?')[0] || '/', navigate];
  },
  { hrefs: (href: string) => `#${href}` },
);

function Router() {
  return (
    <Switch>
      <Route path="/" component={Home} />
      <Route path="/compare" component={Compare} />
      <Route path="/evolution" component={Evolution} />
      <Route path="/pokemon/:id" component={Detail} />
      <Route path="/team" component={Team} />
      <Route path="/discover" component={Discover} />
      <Route component={NotFound} />
    </Switch>
  );
}

function App() {
  return (
    <QueryClientProvider client={queryClient}>
      <TooltipProvider>
        <OfflineStatus />
        <Toaster />
        <WouterRouter hook={useRouteLocation}>
          <Suspense
            fallback={
              <p role="status" className="request-state">
                Loading page…
              </p>
            }
          >
            <Router />
          </Suspense>
        </WouterRouter>
      </TooltipProvider>
    </QueryClientProvider>
  );
}

export default App;
