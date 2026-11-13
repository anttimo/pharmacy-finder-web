import * as matchers from "@testing-library/jest-dom/matchers";

// Not "@testing-library/jest-dom/vitest": it extended a different `expect` than the tests use.
expect.extend(matchers);
