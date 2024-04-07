interface PromiseQueue<T> {
    [id: string]: Promise<T> | undefined;
}
/**
 * Used to synchronize promises to eliminate redundant function / APO calls.
 *
 */
export declare class PromiseTracker<T> {
    queue: PromiseQueue<T>;
    constructor();
    /**
     * Register a promise to be tracked.
     * Will be automatically deregistered upon resolution.
     *
     * @param id
     * @param promise
     *
     * @returns promise
     */
    registerPromise(id: string, promise: Promise<T>): Promise<T>;
    /**
     * Check if the promise is registered.
     *
     * @param id
     *
     * @returns promise - or null if it does not exist
     */
    checkPromise(id: string): Promise<T> | null;
    private deregisterPromise;
}
export {};
