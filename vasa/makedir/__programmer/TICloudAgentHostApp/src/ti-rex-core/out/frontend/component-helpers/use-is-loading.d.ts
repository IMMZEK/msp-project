import * as React from 'react';
import { ErrorContextValue } from './context';
interface UseIsLoadingArgs<T> {
    inputDeps: React.DependencyList;
    result: T | null;
    errorCallback: React.RefObject<ErrorContextValue | null>;
    trigger: boolean;
}
export declare function useIsLoading<T>(args: UseIsLoadingArgs<T>): boolean;
export {};
