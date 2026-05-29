// ─── dedup.js — Request deduplication to prevent duplicate API calls ──────────
// Keeps track of in-flight requests and reuses their results if the same
// request is made again before the first one completes.

/**
 * Create a request deduplicator
 * Useful for preventing duplicate API calls during rapid submissions
 *
 * @returns {object} - { deduplicate(), clear() }
 */
export function createDeduplicator() {
    const pendingRequests = new Map(); // key -> Promise

    return {
        /**
         * Execute a function, deduplicating by key.
         * If the same key is requested while in-flight, reuse the promise.
         *
         * @param {string} key - Unique identifier for this request
         * @param {function} fn - Async function to execute
         * @returns {Promise} - Result of fn()
         */
        async deduplicate(key, fn) {
            // If already in-flight, return the existing promise
            if (pendingRequests.has(key)) {
                console.log(`[dedup] Reusing in-flight request: ${key}`);
                return pendingRequests.get(key);
            }

            // Create new request
            const promise = (async () => {
                try {
                    const result = await fn();
                    return result;
                } catch (error) {
                    throw error;
                } finally {
                    // Clean up after request completes
                    pendingRequests.delete(key);
                }
            })();

            // Track the promise
            pendingRequests.set(key, promise);
            return promise;
        },

        /**
         * Clear all pending requests (for cleanup/testing)
         */
        clear() {
            pendingRequests.clear();
        },

        /**
         * Get status of pending requests
         * @returns {object} - { count, keys }
         */
        getStatus() {
            return {
                count: pendingRequests.size,
                keys: Array.from(pendingRequests.keys()),
            };
        },
    };
}

/**
 * Create a request cache that stores recent responses
 * Reuses cached responses if the same request is made within the TTL
 *
 * @param {number} ttlMs - Time-to-live for cached responses (default 5min)
 * @returns {object} - { cache(), get(), clear() }
 */
export function createRequestCache(ttlMs = 300000) {
    const cache = new Map(); // key -> { result, timestamp }

    return {
        /**
         * Cache a response
         * @param {string} key - Unique identifier
         * @param {any} result - Value to cache
         */
        cache(key, result) {
            cache.set(key, {
                result,
                timestamp: Date.now(),
            });
        },

        /**
         * Retrieve cached response if still valid
         * @param {string} key - Unique identifier
         * @returns {any|null} - Cached result or null if expired/missing
         */
        get(key) {
            if (!cache.has(key)) return null;

            const entry = cache.get(key);
            const age = Date.now() - entry.timestamp;

            if (age > ttlMs) {
                // Expired
                cache.delete(key);
                return null;
            }

            console.log(`[cache] Hit for ${key} (age: ${age}ms)`);
            return entry.result;
        },

        /**
         * Clear all cached entries
         */
        clear() {
            cache.clear();
        },

        /**
         * Get cache statistics
         * @returns {object} - { count, ttlMs }
         */
        getStatus() {
            return {
                count: cache.size,
                ttlMs,
                keys: Array.from(cache.keys()),
            };
        },
    };
}

/**
 * Combine deduplication + caching for optimal request handling
 *
 * @param {number} cacheTtlMs - Cache TTL in milliseconds
 * @returns {object} - { execute(), clear() }
 */
export function createSmartRequester(cacheTtlMs = 300000) {
    const dedup = createDeduplicator();
    const cache = createRequestCache(cacheTtlMs);

    return {
        /**
         * Execute a request with dedup + caching
         * @param {string} key - Unique identifier
         * @param {function} fn - Async function to execute
         * @returns {Promise}
         */
        async execute(key, fn) {
            // Check cache first
            const cached = cache.get(key);
            if (cached !== null) {
                return cached;
            }

            // Execute with deduplication
            const result = await dedup.deduplicate(key, fn);

            // Cache the result
            cache.cache(key, result);

            return result;
        },

        clear() {
            dedup.clear();
            cache.clear();
        },

        getStatus() {
            return {
                dedup: dedup.getStatus(),
                cache: cache.getStatus(),
            };
        },
    };
}

export default {
    createDeduplicator,
    createRequestCache,
    createSmartRequester,
};
