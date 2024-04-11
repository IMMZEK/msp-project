import { TraceFunction } from 'denum';
export declare function hrtimeToSec(hrtime: [number, number] | null): number;
export declare function hrtimeToMillisec(hrtime?: [number, number]): number | undefined;
export declare function hrtimeToNanosec(hrtime: [number, number]): number;
export declare function nstimeToSec(nstime: number): number;
export declare function safeTrace<T>(traceFunc: TraceFunction, ...args: T[]): void;
