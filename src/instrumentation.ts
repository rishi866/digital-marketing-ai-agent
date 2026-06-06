export async function register() {
  // Fix broken localStorage injected by certain Node.js environments
  if (typeof localStorage !== "undefined" && typeof localStorage.getItem !== "function") {
    const store = new Map<string, string>();
    // @ts-ignore
    global.localStorage = {
      getItem: (k: string) => store.get(k) ?? null,
      setItem: (k: string, v: string) => store.set(k, v),
      removeItem: (k: string) => store.delete(k),
      clear: () => store.clear(),
      key: () => null,
      get length() { return store.size; },
    };
  }
}
