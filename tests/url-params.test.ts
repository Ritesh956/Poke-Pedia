import { it, expect } from 'vitest';
import { mergeRouteParams } from '../shared/url-params';

it('rejects an old search or import callback after navigation to another page', () => {
  expect(mergeRouteParams('#/pokemon/25', '/', { q: 'pikachu' })).toBeNull();
  expect(
    mergeRouteParams('#/compare?first=25', '/team', { team: '6,0,0,0,0,0' }),
  ).toBeNull();
  expect(
    mergeRouteParams('#/pokemon/6', '/pokemon/25', { shiny: '1' }),
  ).toBeNull();
});
it('merges same-route choices while preserving unrelated filters and clearing empty values', () => {
  expect(
    mergeRouteParams('#/?q=old&type=fire&sort=name', '/', {
      q: ' #025 ',
      type: null,
    }),
  ).toBe('/?q=+%23025+&sort=name');
  expect(
    mergeRouteParams('#/compare?first=25&second=133', '/compare', {
      first: '',
      second: null,
    }),
  ).toBe('/compare');
});
it('handles the initial empty hash and keeps new detail choices scoped to the current species', () => {
  expect(mergeRouteParams('', '/', { q: 'Évoli' })).toBe('/?q=%C3%89voli');
  expect(
    mergeRouteParams('#/pokemon/6?form=10034', '/pokemon/6', { shiny: '1' }),
  ).toBe('/pokemon/6?form=10034&shiny=1');
});
