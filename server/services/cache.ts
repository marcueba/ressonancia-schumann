import { ProviderResponse } from '../types';

interface CacheEntry<T> {
  data: ProviderResponse<T>;
  expiresAt: number;
}

class CacheManager {
  private cache: Map<string, CacheEntry<any>> = new Map();
  private inFlight: Map<string, Promise<any>> = new Map();

  get<T>(key: string): ProviderResponse<T> | null {
    const entry = this.cache.get(key);
    if (!entry) return null;
    if (Date.now() > entry.expiresAt) {
      this.cache.delete(key);
      return null;
    }
    // Return cached flag as true
    return { ...entry.data, cached: true };
  }

  set<T>(key: string, data: ProviderResponse<T>, ttlSeconds: number) {
    this.cache.set(key, {
      data: { ...data, cached: false },
      expiresAt: Date.now() + (ttlSeconds * 1000)
    });
  }

  async resolve<T>(
    key: string,
    fetcher: () => Promise<ProviderResponse<T>>
  ): Promise<ProviderResponse<T>> {
    const cached = this.get<T>(key);
    if (cached) return cached;

    const existing = this.inFlight.get(key);
    if (existing) {
      return existing;
    }

    const promise = fetcher().finally(() => {
      this.inFlight.delete(key);
    });

    this.inFlight.set(key, promise);
    return promise;
  }
}

export const apiCache = new CacheManager();
