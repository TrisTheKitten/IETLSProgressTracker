import type { NextConfig } from "next";
import { PHASE_PRODUCTION_BUILD } from "next/constants";

const nextConfig = (phase: string): NextConfig => {
  return {
    env: {
      IS_NEXT_BUILD: phase === PHASE_PRODUCTION_BUILD ? "true" : "false",
    }
  };
};

export default nextConfig;
