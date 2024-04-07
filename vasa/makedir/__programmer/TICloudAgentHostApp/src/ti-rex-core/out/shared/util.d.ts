import * as _ from 'lodash';
export declare function assertNever(_x: never): void;
export declare function getObjectKeys<T extends object>(obj: T): (keyof T)[];
export declare function objectFromKeyValuePairs<T>(pairs: {
    key: string;
    value: T;
}[]): _.Dictionary<T>;
/**
 * Same as _.mapValues, but with object-explicit typing so the return values keys are fixed
 *
 */
export declare const mapValues: <T extends object, TResult>(obj: T, callback: _.ObjectIterator<T, TResult>) => {
    [P in keyof T]: TResult;
};
export declare function measureTime<T>(promise: Promise<T>, label: string): Promise<T>;
/**
 * Sets the value at a key for one object from another after applying func to the value.
 * This method is needed after a change in ts, this function was inspired by this comment
 * https://github.com/microsoft/TypeScript/pull/30769#issuecomment-503643456
 *
 * @param o1 - The object to set at the key
 * @param o2 - The object to read at the key
 * @param key - The key to read / set the value
 * @param func - The function to apply to o2 before setting it in o1
 */
export declare function setValueForPair<O, K extends keyof O>(o1: O, o2: O, key: K, func: (value: O[K]) => O[K]): void;
export declare function sortVersionedItems<T extends object>(obj: T[], idKey: keyof T, versionKey: keyof T): T[];
