/**
 * IndexedDB-backed offline cache with quota guards.
 *
 * PROBLEM: `offlineStore.cache` was persisted via Zustand's persist
 * middleware to localStorage as a JSON-serialised array. localStorage is
 * capped at ~5MB; the store's configured budget was 50MB. The serialised
 * array inflated ~4x (binary-as-array), so the store blew past the
 * browser quota long before the configured limit and lost the ENTIRE
 * offline cache via QuotaExceededError — at the worst possible moment.
 *
 * FIX: move the blob cache to IndexedDB, which has a much higher quota
 * (typically a percentage of free disk, often 1GB+) and supports
 * structured-clone storage of objects without JSON round-tripping. We
 * also request a persistent-storage grant so the browser doesn't evict
 * the cache mid-emergency, and enforce LRU eviction at a byte budget
 * measured from real entry sizes.
 *
 * The Map in `offlineStore` is now a read-through cache in front of
 * IndexedDB: hot entries stay in memory; cold ones live only in IDB.
 */

const DB_NAME = 'openrelief-offline'
const STORE_NAME = 'cache'
const DB_VERSION = 1
const DEFAULT_BYTE_BUDGET = 50 * 1024 * 1024 // 50MB — fits comfortably in IDB

export interface IndexedDbCacheEntry {
  key: string
  data: unknown
  timestamp: number
  expiresAt: number
  size: number
  tags: string[]
}

let dbPromise: Promise<IDBDatabase | null> | null = null
let persistentGrantRequested = false

function openDb(): Promise<IDBDatabase | null> {
  if (typeof indexedDB === 'undefined') {
    return Promise.resolve(null)
  }
  if (dbPromise) {
    return dbPromise
  }

  dbPromise = new Promise<IDBDatabase | null>((resolve) => {
    const request = indexedDB.open(DB_NAME, DB_VERSION)
    request.onupgradeneeded = () => {
      const db = request.result
      if (!db.objectStoreNames.contains(STORE_NAME)) {
        const store = db.createObjectStore(STORE_NAME, { keyPath: 'key' })
        store.createIndex('by_timestamp', 'timestamp')
        store.createIndex('by_expires', 'expiresAt')
      }
    }
    request.onsuccess = () => resolve(request.result)
    request.onerror = () => {
      console.warn('[IndexedDBCache] failed to open', request.error)
      resolve(null)
    }
  })

  return dbPromise
}

/**
 * Ask the browser for persistent storage so the offline cache is not
 * evicted under disk pressure. Best-effort — failure is non-fatal.
 */
export async function requestPersistentStorage(): Promise<boolean> {
  if (persistentGrantRequested) return false
  persistentGrantRequested = true
  if (typeof navigator === 'undefined' || !navigator.storage?.persist) {
    return false
  }
  try {
    return await navigator.storage.persist()
  } catch {
    return false
  }
}

function estimateSize(value: unknown): number {
  try {
    return new Blob([JSON.stringify(value)]).size
  } catch {
    // Structured-cloneable but not JSON-serialisable; approximate.
    return 1024
  }
}

function tx<T>(
  db: IDBDatabase,
  mode: IDBTransactionMode,
  fn: (store: IDBObjectStore) => IDBRequest<T> | Promise<T>
): Promise<T> {
  return new Promise<T>((resolve, reject) => {
    const transaction = db.transaction(STORE_NAME, mode)
    const store = transaction.objectStore(STORE_NAME)
    let result: T
    Promise.resolve(fn(store))
      .then((req) => {
        if (req instanceof IDBRequest) {
          req.onsuccess = () => {
            result = req.result
          }
          req.onerror = () => reject(req.error)
        } else {
          result = req
        }
      })
      .catch(reject)
    transaction.oncomplete = () => resolve(result)
    transaction.onerror = () => reject(transaction.error)
    transaction.onabort = () => reject(transaction.error)
  })
}

export const indexedDbCache = {
  async get(key: string): Promise<IndexedDbCacheEntry | null> {
    const db = await openDb()
    if (!db) return null
    try {
      const entry = await tx<IndexedDbCacheEntry | undefined>(db, 'readonly', (store) =>
        store.get(key) as IDBRequest<IndexedDbCacheEntry | undefined>
      )
      return entry ?? null
    } catch {
      return null
    }
  },

  async set(
    key: string,
    data: unknown,
    options: { expiresAt?: number; tags?: string[] } = {}
  ): Promise<IndexedDbCacheEntry | null> {
    const db = await openDb()
    if (!db) return null

    const now = Date.now()
    const entry: IndexedDbCacheEntry = {
      key,
      data,
      timestamp: now,
      expiresAt: options.expiresAt ?? now + 7 * 24 * 60 * 60 * 1000,
      size: estimateSize(data),
      tags: options.tags ?? []
    }

    try {
      await tx(db, 'readwrite', (store) => store.put(entry))
      return entry
    } catch (err) {
      // Quota exhausted — evict oldest entries and retry once.
      if (err && (err as DOMException).name === 'QuotaExceededError') {
        await this.evictToBudget(DEFAULT_BYTE_BUDGET * 0.8)
        try {
          await tx(db, 'readwrite', (store) => store.put(entry))
          return entry
        } catch {
          return null
        }
      }
      return null
    }
  },

  async delete(key: string): Promise<void> {
    const db = await openDb()
    if (!db) return
    try {
      await tx(db, 'readwrite', (store) => store.delete(key))
    } catch {
      // ignore
    }
  },

  async clear(tags?: string[]): Promise<void> {
    const db = await openDb()
    if (!db) return
    try {
      if (!tags || tags.length === 0) {
        await tx(db, 'readwrite', (store) => store.clear())
        return
      }
      const all = await this.entries()
      for (const entry of all) {
        if (entry.tags.some((t: string) => tags.includes(t))) {
          await this.delete(entry.key)
        }
      }
    } catch {
      // ignore
    }
  },

  async entries(): Promise<IndexedDbCacheEntry[]> {
    const db = await openDb()
    if (!db) return []
    try {
      return await tx<IndexedDbCacheEntry[]>(db, 'readonly', (store) =>
        store.getAll() as IDBRequest<IndexedDbCacheEntry[]>
      )
    } catch {
      return []
    }
  },

  /**
   * Evict expired entries, then LRU-evict oldest entries until total
   * estimated size is below `budgetBytes`. Returns the number removed.
   */
  async evictToBudget(budgetBytes: number = DEFAULT_BYTE_BUDGET): Promise<number> {
    const entries = await this.entries()
    const now = Date.now()
    let removed = 0

    // First pass: drop expired.
    for (const entry of entries) {
      if (entry.expiresAt < now) {
        await this.delete(entry.key)
        removed++
      }
    }

    if (removed > 0) {
      // Re-measure after expiry sweep.
      return removed + (await this.evictToBudget(budgetBytes))
    }

    // Second pass: LRU by timestamp until under budget.
    const totalSize = entries.reduce((sum, e) => sum + (e.size || 0), 0)
    if (totalSize <= budgetBytes) {
      return removed
    }

    const sorted = [...entries].sort((a, b) => a.timestamp - b.timestamp)
    let currentSize = totalSize
    for (const entry of sorted) {
      if (currentSize <= budgetBytes) break
      await this.delete(entry.key)
      currentSize -= entry.size || 0
      removed++
    }
    return removed
  },

  /**
   * Best-effort usage estimate via the Storage API. Returns 0 if
   * unavailable (SSR / unsupported browser).
   */
  async usageEstimate(): Promise<{ usage: number; quota: number }> {
    if (typeof navigator === 'undefined' || !navigator.storage?.estimate) {
      return { usage: 0, quota: 0 }
    }
    try {
      const estimate = await navigator.storage.estimate()
      return {
        usage: Number(estimate.usage) || 0,
        quota: Number(estimate.quota) || 0
      }
    } catch {
      return { usage: 0, quota: 0 }
    }
  }
}

// Constants re-exported for tests / callers that need the budget value.
export const INDEXED_DB_BYTE_BUDGET = DEFAULT_BYTE_BUDGET
