import nextCoreWebVitals from "eslint-config-next/core-web-vitals";
import nextTypescript from "eslint-config-next/typescript";
import prettier from "eslint-config-prettier";

const eslintConfig = [
  {
    ignores: [
      ".next/**",
      "src/lib/prisma/generated/**",
      "src/lib/manialink/*.js",
    ],
  },
  ...nextCoreWebVitals,
  ...nextTypescript,
  prettier,
  {
    rules: {
      "@typescript-eslint/no-unused-vars": [
        "error",
        {
          argsIgnorePattern: "^_",
          varsIgnorePattern: "^_",
          ignoreRestSiblings: true,
        },
      ],
      // Dependency arrays here are deliberately curated in several hooks; the
      // rule produces more noise than signal in this codebase.
      "react-hooks/exhaustive-deps": "off",
      // Violations of this one are real bugs, not style.
      "react-hooks/rules-of-hooks": "error",
      // Ratchet: warn now, tighten to error as the remaining `any`s are typed.
      "@typescript-eslint/no-explicit-any": "warn",

      // React Compiler rule family (new in eslint-plugin-react-hooks 7). These
      // flag real issues, but the bulk of them are the fetch-in-useEffect
      // pattern that phase 5 of ARCHITECTURE_REVIEW.md replaces with TanStack
      // Query. Kept visible as warnings so `lint` can gate on errors today;
      // promote to "error" once that refactor lands.
      "react-hooks/set-state-in-effect": "warn",
      "react-hooks/immutability": "warn",
      "react-hooks/preserve-manual-memoization": "warn",
      "react-hooks/use-memo": "warn",
      "react-hooks/purity": "warn",
      "react-hooks/incompatible-library": "warn",
    },
  },
];

export default eslintConfig;
