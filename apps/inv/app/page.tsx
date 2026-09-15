import { manifest } from '@kairn/sections';

/**
 * Placeholder. `/[slug]` server-renders from `published_config` once the DB
 * lands at step 9; until then there is nothing to render and the route exists
 * only to keep the app building in CI.
 */
export default function Page() {
  return (
    <main>
      <h1>Kairn renderer</h1>
      <p>{manifest.length} section variants registered.</p>
    </main>
  );
}
