import * as React from 'react';
import { ErrorContextValue } from './context';
interface UseAsyncOperationParams<T> {
    operation: () => Promise<T>;
    dependencies: React.DependencyList;
    errorCallback: React.RefObject<ErrorContextValue | null>;
    cleanup?: () => void;
    keepResultBetweenUpdates?: boolean;
    doAllUpdates?: boolean;
}
export declare function useAsyncOperation<T>({ operation, dependencies, errorCallback, cleanup, keepResultBetweenUpdates, doAllUpdates }: UseAsyncOperationParams<T>): {
    shouldDisplayLoadingUI: boolean;
    shouldDisplayInitalLoadingUI: boolean;
    initalLoadInProgress: boolean;
    result: T | null;
};
export {};
