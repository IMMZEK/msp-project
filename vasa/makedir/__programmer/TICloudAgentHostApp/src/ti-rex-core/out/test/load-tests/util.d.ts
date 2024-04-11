/// <reference types="node" />
import * as fs from 'fs-extra';
import { Response } from 'superagent';
import { RandomGenerator } from './random';
export interface LogEntry {
    machine: string;
    file: string;
    apiPath: string;
    latency: number;
    metrics?: LogMetrics;
    stamp: number;
    exception?: string;
}
interface LogMetrics {
    timeStamp?: string;
    cpuUsage: number;
    memUsage: number;
}
export declare function createLoggingResponseHandler(logStream: fs.WriteStream): (url: string, resOrError: Response | Error, proxyResponseTime: number) => void;
export declare function randomDelay(milliseconds: number, rand: RandomGenerator): Promise<void>;
export {};
