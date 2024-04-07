/**
 * Like an lru but will bulk evict items we haven't used much recently.
 *
 */
export declare class Cache<T> {
    private readonly maxSize;
    private readonly evicitLimit;
    private cache;
    private currentSize;
    private currentUsageNumber;
    constructor(size: number);
    /**
     * Insert or update a value.
     *
     * @param id
     * @param value
     *
     * @returns value
     */
    insert(id: string, value: T): T;
    /**
     * Get the value for the id, or null if it does not exist.
     *
     * @param id
     *
     * @returns value
     */
    get(id: string): T | null;
    /**
     * Clear the entire cache.
     *
     */
    clear(): void;
    private init;
    private evicit;
}
