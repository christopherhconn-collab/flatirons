import type { NextConfig } from "next";

import { IRRIGATION_HOST } from "./src/lib/irrigation";
import { NATIVES_HOST } from "./src/lib/natives";

const nextConfig: NextConfig = {
  async rewrites() {
    return {
      // The plant guide and the irrigation page are each the home page of their
      // own subdomain. `beforeFiles`, because `/` is a real page and an
      // ordinary rewrite never sees it.
      beforeFiles: [
        {
          source: "/",
          has: [{ type: "host", value: NATIVES_HOST }],
          destination: "/natives",
        },
        {
          source: "/",
          has: [{ type: "host", value: IRRIGATION_HOST }],
          destination: "/irrigation",
        },
      ],
    };
  },
};

export default nextConfig;
