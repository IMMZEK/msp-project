/**
 * Measures the execution time of an async function in ms
 *
 * @param  {()=>Promise<any>} fn An anonymous function that wraps the function to be timed
 * @param  {number=4} precision Number of significant digits (between 1 - 21, inclusive)
 * @returns {Promise} number
 */
export declare function timedPromise(fn: () => Promise<any>, precision?: number): Promise<number>;
/**
 * Measures the execution time of a sync function in ms
 *
 * @param  {()=>void} fn An anonymous function that wraps the function to be timed
 * @param  {number=4} precision Number of significant digits (between 1 - 21, inclusive)
 *
 * @returns number
 */
export declare function timedFunction(fn: () => void, precision?: number): number;
export declare function mark(): [number, number];
export declare function duration(start: [number, number], precision?: number): number;
