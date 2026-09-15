import { notFound } from 'next/navigation';
import { Harness } from './harness-client';
import { HARNESS_IDS, type HarnessId } from './ids';

/**
 * Build order step 3. Permanent fixture, never shipped: the renderer serves
 * invitations couples have already sent to 300 guests, and a debug route is not
 * part of that.
 *
 * `?order=` picks the composition, so one page covers every permutation:
 *   /harness?order=pinner,bleeder,hog
 */
export default async function Page({
  searchParams,
}: {
  searchParams: Promise<{ order?: string }>;
}) {
  if (process.env.VERCEL_ENV === 'production') notFound();

  const { order } = await searchParams;
  const ids = (order ?? 'pinner,bleeder,hog')
    .split(',')
    .map((id) => id.trim())
    .filter((id): id is HarnessId => (HARNESS_IDS as readonly string[]).includes(id));

  if (ids.length === 0) notFound();

  return <Harness order={ids} />;
}
