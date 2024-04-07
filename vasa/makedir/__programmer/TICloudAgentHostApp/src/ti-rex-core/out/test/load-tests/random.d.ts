export declare class RandomGenerator {
    private seed;
    constructor(seed: number);
    generate(max: number): number;
    pick<T>(collection: T[]): T;
    shouldDo(percentage: number): boolean;
}
