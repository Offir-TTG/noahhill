import type { NextConfig } from "next";

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
const supabaseHostname = supabaseUrl ? new URL(supabaseUrl).hostname : null;

const nextConfig: NextConfig = {
  images: {
    remotePatterns: supabaseHostname
      ? [
          {
            protocol: "https",
            hostname: supabaseHostname,
            pathname: "/storage/v1/object/public/**",
          },
        ]
      : [],
  },
  experimental: {
    serverActions: {
      // Default is 1mb — too small for audio (.wav files often 30-50mb) and large images.
      bodySizeLimit: "100mb",
    },
    // Next 16's middleware/proxy layer has its own body cap (default 10mb) that
    // also blocks large uploads. Raise it to match the action limit.
    proxyClientMaxBodySize: "100mb",
  },
};

export default nextConfig;
