/**
 * Deliberately not a client module.
 *
 * `sections.tsx` is `'use client'`, so anything exported from it reaches a
 * server component as a client reference proxy rather than the real value —
 * `id in HARNESS_SECTIONS` silently matches nothing and the route 404s. The id
 * list has to live somewhere both sides can actually read.
 */
export const HARNESS_IDS = ['pinner', 'bleeder', 'hog'] as const;

export type HarnessId = (typeof HARNESS_IDS)[number];
