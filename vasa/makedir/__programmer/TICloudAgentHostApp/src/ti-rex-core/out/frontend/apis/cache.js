"use strict";
///////////////////////////////////////////////////////////////////////////////
/// Types
///////////////////////////////////////////////////////////////////////////////
Object.defineProperty(exports, "__esModule", { value: true });
exports.Cache = void 0;
///////////////////////////////////////////////////////////////////////////////
/// Code
///////////////////////////////////////////////////////////////////////////////
// TODO use a 3rd party implementation (i.e lru-cache) instead
/**
 * Like an lru but will bulk evict items we haven't used much recently.
 *
 */
class Cache {
    ///////////////////////////////////////////////////////////////////////////
    /// Members
    ///////////////////////////////////////////////////////////////////////////
    maxSize;
    evicitLimit;
    cache;
    currentSize;
    currentUsageNumber;
    constructor(size) {
        this.maxSize = size;
        this.evicitLimit = Math.max(this.maxSize * 0.2, 1);
        this.init();
    }
    ///////////////////////////////////////////////////////////////////////////
    /// Public Methods
    ///////////////////////////////////////////////////////////////////////////
    /**
     * Insert or update a value.
     *
     * @param id
     * @param value
     *
     * @returns value
     */
    insert(id, value) {
        const item = this.get(id);
        if (item) {
            this.cache[id].value = value;
            return this.cache[id].value;
        }
        if (this.currentSize === this.maxSize) {
            this.evicit();
        }
        this.cache[id] = {
            value,
            usageNumber: this.currentUsageNumber++
        };
        this.currentSize++;
        return this.cache[id].value;
    }
    /**
     * Get the value for the id, or null if it does not exist.
     *
     * @param id
     *
     * @returns value
     */
    get(id) {
        const item = this.cache[id];
        if (item) {
            item.usageNumber = this.currentUsageNumber++;
        }
        return item ? item.value : null;
    }
    /**
     * Clear the entire cache.
     *
     */
    clear() {
        this.init();
    }
    ///////////////////////////////////////////////////////////////////////////
    /// Private Methods
    ///////////////////////////////////////////////////////////////////////////
    init() {
        this.cache = {};
        this.currentSize = 0;
        this.currentUsageNumber = 0;
    }
    evicit() {
        const evictNumber = this.currentUsageNumber - this.maxSize;
        let numEvicits = 0;
        Object.keys(this.cache).forEach(id => {
            if (this.cache[id].usageNumber <= evictNumber && numEvicits < this.evicitLimit) {
                delete this.cache[id];
                this.currentSize--;
                numEvicits++;
            }
        });
    }
}
exports.Cache = Cache;
