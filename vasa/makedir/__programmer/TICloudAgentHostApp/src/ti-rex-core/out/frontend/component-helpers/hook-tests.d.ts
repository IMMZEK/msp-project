import * as sinon from 'sinon';
type SetupFn<T> = () => Promise<{
    data: T;
    spy: sinon.SinonSpy;
}>;
type GetHookFn<T, U> = (data: U) => (() => T);
type VerifyResultFn<T, U> = (expectedCallCount: number, result: T, spy: sinon.SinonSpy, data: U) => Promise<void>;
export interface ErrorCallback {
    current: sinon.SinonStub;
}
/**
 * Do the common tests for data fetching apis
 *
 */
export declare function doCommonTests<T, U>(setup: SetupFn<U>, getHook: GetHookFn<T, U>, verifyResult: (result: T) => void, errorCallback: ErrorCallback, expectedCallCountAfterSingleCall?: number): void;
export declare function doUpdateTest<T, U>(setup: SetupFn<U>, getHook: GetHookFn<T, U>, verifyResult: (result: T, updateDone: boolean) => void, errorCallback: ErrorCallback, eventDelayMs: number): void;
export declare function doTriggerTest<T, U>(setup: SetupFn<U>, getHook: GetHookFn<T, U>, verifyResult: VerifyResultFn<T, U>, errorCallback: ErrorCallback, dependencies: {
    trigger: boolean;
}): void;
export declare function doDependencyTest<T, U, V extends object>(setup: SetupFn<U>, getHook: GetHookFn<T, U>, verifyResult: VerifyResultFn<T, U>, errorCallback: ErrorCallback, dependencies: V, updatedDependencyValues: V): void;
export declare function doWaitUntilOptionsSetTest<T, U, V extends object>(setup: SetupFn<U>, getHook: GetHookFn<T, U>, verifyResult: VerifyResultFn<T, U>, errorCallback: ErrorCallback, dependencies: V, updatedDependencyValues: V): void;
export declare function getResult<T>(val: T, errorCallback: ErrorCallback): T;
export {};
