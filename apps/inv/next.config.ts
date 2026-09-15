import type { NextConfig } from 'next';

/**
 * The renderer. This must never break — it serves invitations that couples have
 * already sent to 300 guests.
 *
 * `@kairn/sections` ships as source, so Next compiles it here rather than
 * consuming a build artifact. One registry renders both the builder preview and
 * the live site; that is the whole architecture.
 */
const config: NextConfig = {
  transpilePackages: ['@kairn/sections', '@kairn/orchestrator'],
};

export default config;
