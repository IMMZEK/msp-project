/**
 * Implements a locking solution to allow users of apis.ts to
 * acquire / release control of the exposed methods.
 *
 */
export declare class APIControl {
    private currentMaster;
    private resolver;
    private apiQueue;
    private apiIndex;
    /**
     * Acquire control. If someone has control it resolves the promise once you have control.
     *
     * @param name
     *
     * @returns {Promise} name - Resolved once you have acquired control.
     */
    acquireControl(name: string): Promise<string>;
    /**
     * Release control. Note you can only relese control if you have already acquired control.
     *
     * @param name
     */
    releaseControl(name: string): void;
    /**
     * Determine if you are the current master
     *
     * @param name
     *
     * @returns isCurrentMaster
     */
    isCurrentMaster(name: string): boolean;
    /**
     * Resolves when there is no ongoing masters with control.
     *
     * @returns {Promise} void
     *
     */
    onIdle(): Promise<void>;
    /**
     * Clear the queue (for testing purposes only)
     *
     */
    _clear(): void;
}
