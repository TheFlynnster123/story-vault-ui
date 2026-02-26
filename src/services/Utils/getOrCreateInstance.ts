/**
 * Generic singleton cache for per-key (e.g., per-chatId) service instances.
 *
 * Replaces the copy-pasted Map + get-or-create pattern used across ~16 services.
 *
 * Usage:
 *   const getInstance = createInstanceCache((chatId: string) => new MyService(chatId));
 *   const service = getInstance("chat-123"); // cached per chatId
 *
 * Returns null when called with null key, otherwise returns cached T.
 */
export const createInstanceCache = <T>(
  factory: (key: string) => T,
): ((key: string) => T) & ((key: string | null) => T | null) => {
  const instances = new Map<string, T>();

  const getter = (key: string | null): T | null => {
    if (!key) return null;

    if (!instances.has(key)) {
      instances.set(key, factory(key));
    }

    return instances.get(key)!;
  };

  return getter as ((key: string) => T) & ((key: string | null) => T | null);
};

/**
 * Singleton cache for global (non-keyed) service instances.
 *
 * Usage:
 *   const getInstance = createGlobalInstanceCache(() => new MyGlobalService());
 *   const service = getInstance(); // always returns the same instance
 */
export const createGlobalInstanceCache = <T>(factory: () => T): (() => T) => {
  let instance: T | null = null;

  return (): T => {
    if (!instance) {
      instance = factory();
    }

    return instance;
  };
};
