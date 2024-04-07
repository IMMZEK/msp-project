/**
 * Generate a progress id for tirex3 server archive and download APIs
 */
export declare function generateProgressId(): string;
/**
 * Poll progress of download every 1 sec until done
 */
export declare const pollAsync: (arg1: string, arg2: string) => Promise<{
    result: string;
}>;
export declare function poll(progressId: string, rex3Server: string, callback: (err: any, body?: {
    result: string;
}) => void): void;
