import { ReactWrapper } from 'enzyme';
export declare function getDataFromHook<T>(hook: () => T): {
    data: T;
    wrapper: ReactWrapper<any, any>;
};
export declare function getDataFromHookWrapper<T>(wrapper: ReactWrapper, _hook: () => T): T;
/**
 * Trigger the hook, wait until the result is truthly (assuming that means it's done)
 *
 */
export declare function waitForHookResult<T, U>(hook: () => T, getResult: (val: T) => U): Promise<{
    result: U;
    wrapper: ReactWrapper<any, any>;
}>;
export declare function waitForHookWrapperResult<T, U>(wrapper: ReactWrapper, hook: () => T, getResult: (val: T) => U): Promise<NonNullable<U>>;
export declare function doAct<T>(getVal: () => T): T;
