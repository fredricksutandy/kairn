/**
 * The manifest is the source of truth for what a variant does to the page.
 *
 * Declared honestly, the editor can block bad compositions before a couple
 * assembles one. Undeclared, the page desyncs silently and the bug reads as an
 * orchestrator fault. See docs/03-animation-contract.md, "Composition
 * validation".
 *
 * Mirroring this into a `section_variants` table is deferred to Phase 6. The
 * manifest in code is the source of truth until then.
 */

/** MVP is three slots. Do not add a fourth without splitting work in the spec. */
export type Slot = 'cover' | 'couple' | 'event';

export type Tier = 'free' | 'premium';

/**
 * `deprecated` variants are hidden from the picker but must keep rendering —
 * a live invitation can never change under a couple who already sent links.
 * This is the mechanism behind non-negotiable #7: never mutate a shipped
 * variant, add a new one and deprecate the old.
 */
export type VariantStatus = 'active' | 'deprecated';

/** Aspect ratios the variant needs derived from the uploaded original's focal point. */
export type CropRatio = `${number}:${number}`;

export interface AnimationProfile {
  /**
   * Pinning changes total page height, which shifts every trigger below it.
   * Max one pinning section per invitation, enforced by the editor.
   */
  pins: boolean;
  /** Max two `heavy` sections per invitation — mobile frame budget. */
  weight: 'light' | 'heavy';
  /** A decoration crossing the section edge. The editor forbids a pin directly after a bottom bleed. */
  bleed: null | 'top' | 'bottom';
  /** False only for the cover, which runs an entrance timeline instead of reveal batching. */
  usesOrchestrator: boolean;
  reducedMotionFallback: 'static';
}

export interface VariantManifest {
  id: string;
  slot: Slot;
  /** Display name in the picker. */
  name: string;
  thumbnail: string;
  tier: Tier;
  status: VariantStatus;
  crops: Partial<Record<string, CropRatio>>;
  animation: AnimationProfile;
}

/**
 * Empty until step 5. The six MVP variants are specified in
 * docs/07-component-spec.md and land once the orchestrator and the adversarial
 * harness exist — the build order in CLAUDE.md is not reorderable.
 */
export const manifest: readonly VariantManifest[] = [];
