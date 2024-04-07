export declare function waitForPromisesToResolvePromise(indicies: string[]): Promise<void>;
export declare function waitForPromisesToResolve(indicies: string[], callback: (err?: Error) => void): void;
export declare function setupPromiseSyncronization(): void;
export declare function cleanupPromiseSyncronization(): void;
export declare function getActivePromiseIndicies(): string[];
