import type { NextConfig } from 'next';

/**
 * The builder. Deploys constantly; blast radius is limited to itself by the
 * Ignored Build Step in scripts/.
 */
const config: NextConfig = {
  transpilePackages: ['@kairn/sections', '@kairn/orchestrator'],
};

export default config;
