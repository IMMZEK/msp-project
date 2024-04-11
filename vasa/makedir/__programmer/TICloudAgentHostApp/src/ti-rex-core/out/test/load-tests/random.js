"use strict";
// This is a pseudo random number generator that is repeatable (same seed = same sequence of numbers).
// I looked into random-js, but it a) had poor typing and b) was expensive
// This implementation is "good enough" for load testing to be sufficiently random yet lightweight/repeatable.
Object.defineProperty(exports, "__esModule", { value: true });
exports.RandomGenerator = void 0;
class RandomGenerator {
    seed;
    constructor(seed) {
        this.seed = seed;
        ++this.seed; // expect "zero" as a likely seed.
    }
    generate(max) {
        // Algorithm "xor" from p. 4 of Marsaglia, "Xorshift RNGs"
        // https://en.wikipedia.org/wiki/Xorshift
        // tslint:disable:no-bitwise
        let value = this.seed || 1; // state must be initialized as non-zero
        value ^= value << 13;
        value ^= value >> 17;
        value ^= value << 5;
        value %= Math.pow(2, 32);
        value = Math.abs(value);
        this.seed = value;
        return Math.floor(((value % 100) * max) / 100);
    }
    pick(collection) {
        return collection[this.generate(collection.length)];
    }
    shouldDo(percentage) {
        return percentage > this.generate(100);
    }
}
exports.RandomGenerator = RandomGenerator;
