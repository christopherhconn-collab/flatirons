import { defineConfig, globalIgnores } from "eslint/config";
import nextVitals from "eslint-config-next/core-web-vitals";
import nextTs from "eslint-config-next/typescript";

const eslintConfig = defineConfig([
  ...nextVitals,
  ...nextTs,
  // Override default ignores of eslint-config-next.
  globalIgnores([
    // Default ignores of eslint-config-next:
    ".next/**",
    "out/**",
    "build/**",
    "next-env.d.ts",
    // The design handoff is a reference, not source. `support.js`,
    // `doc-page.js` and `image-slot.js` are a preview runtime we are told not
    // to port, and linting them only produces noise about someone else's code.
    "design_handoff_flatirons_movers/**",
    // The routing map is the handoff's Leaflet document, kept whole on purpose.
    "public/dispatch-map.html",
  ]),
]);

export default eslintConfig;
