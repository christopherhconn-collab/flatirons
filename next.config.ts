import type { NextConfig } from "next";

import { NATIVES_HOST } from "./src/lib/natives";

const nextConfig: NextConfig = {
  async rewrites() {
    return {
      // The plant guide is the home page of its own subdomain. `beforeFiles`,
      // because `/` is a real page and an ordinary rewrite never sees it.
      beforeFiles: [
        {
          source: "/",
          has: [{ type: "host", value: NATIVES_HOST }],
          destination: "/natives",
        },
      ],
    };
  },
};

export default nextConfig;
