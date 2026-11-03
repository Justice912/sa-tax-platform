import type { NextConfig } from "next";
import path from "node:path";

const nextConfig: NextConfig = {
  output: "standalone",
  experimental: {
    // Practice uploads of estate documents via server actions (Vercel caps bodies at ~4.5 MB).
    serverActions: { bodySizeLimit: "4mb" },
  },
  turbopack: {
    root: path.resolve(__dirname),
  },
};

export default nextConfig;

