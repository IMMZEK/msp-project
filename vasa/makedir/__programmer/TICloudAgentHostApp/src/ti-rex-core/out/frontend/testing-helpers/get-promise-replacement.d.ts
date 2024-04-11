interface ActivePromise {
    [index: string]: string[];
}
export declare function getPromiseReplacement(promiseReplacementTracker: PromiseReplacementTracker): PromiseConstructor;
export declare function restorePromise(): void;
/**
 * Tracks pending promises and allows waiting until all are resolved.
 *
 */
export declare class PromiseReplacementTracker {
    private activePromises;
    private emitter;
    private pendingCount;
    private promiseIndex;
    getActivePromises(): ActivePromise;
    getPromiseIndex(): number;
    registerPromise(index: number): void;
    deregisterPromise(index: number): void;
    onClear(): Promise<void>;
}
export {};
