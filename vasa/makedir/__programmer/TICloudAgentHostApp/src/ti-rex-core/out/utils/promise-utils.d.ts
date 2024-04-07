/// <reference types="node" />
export declare function promisePipe(streams: (NodeJS.ReadableStream | NodeJS.WritableStream)[]): Promise<unknown>;
export declare function shouldNeverThrow(callback: () => Promise<void>): void;
export declare function mapSerially<T, R>(collection: T[], iterator: (item: T, idx: number) => Promise<R>): Promise<R[]>;
