/**
 * Polyfills for server-side rendering
 * Fixes "indexedDB is not defined" errors during SSR
 */

if (typeof window === "undefined") {
  // @ts-expect-error - Polyfill for SSR, global.indexedDB doesn't exist in Node
  global.indexedDB = {
    open: () => ({
      addEventListener: () => {},
      removeEventListener: () => {},
    }),
  };
}
