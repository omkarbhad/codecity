interface CacheEntry<T> {
  data: T
  expiry: number
}

class LRUCache<T = unknown> {
  private store = new Map<string, CacheEntry<T>>()
  private maxSize: number

  constructor(maxSize = 100) {
    this.maxSize = maxSize
  }

  get(key: string): T | null {
    const entry = this.store.get(key)
    if (!entry) return null
    if (Date.now() > entry.expiry) {
      this.store.delete(key)
      return null
    }
    // Move to end (most recently used)
    this.store.delete(key)
    this.store.set(key, entry)
    return entry.data
  }

  set(key: string, data: T, ttlMs: number): void {
    // Evict oldest if at capacity
    if (this.store.size >= this.maxSize) {
      const oldest = this.store.keys().next().value
      if (oldest) this.store.delete(oldest)
    }
    this.store.set(key, { data, expiry: Date.now() + ttlMs })
  }

  has(key: string): boolean {
    const entry = this.store.get(key)
    if (!entry) return false
    if (Date.now() > entry.expiry) {
      this.store.delete(key)
      return false
    }
    return true
  }

  delete(key: string): void {
    this.store.delete(key)
  }

  clear(): void {
    this.store.clear()
  }

  get size(): number {
    return this.store.size
  }
}

// Singleton caches — use `unknown` for general-purpose caches
export const analysisCache = new LRUCache<unknown>(50) // CitySnapshot cache, 30 min TTL
export const queryCache = new LRUCache<unknown>(200) // DB query cache, 60s TTL

export const CACHE_TTL = {
  analysis: 30 * 60 * 1000, // 30 minutes
  query: 60 * 1000, // 60 seconds
} as const
