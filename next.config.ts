import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  /* config options here */
  distDir: process.env.NEXT_DIST_DIR ?? ".next",
  cacheComponents: true,
  partialPrefetching: true,
  experimental: {
    // The CLI checker can return empty stdout under Nix's detached process wrapper.
    useTypeScriptCli: false,
  },
};

export default nextConfig;
