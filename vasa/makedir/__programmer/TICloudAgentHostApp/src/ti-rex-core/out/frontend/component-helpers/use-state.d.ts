/**
 * A hook for handling state.
 *
 * Returns a function which will return the current value of state.
 * Useful for use in React.useCallback where the callback is memoized,
 * making it easy to have stale state values being referenced if the dependencies are not specfied correctly.
 *
 * Returns another function which allows you to do a parital update of the state. Also handles updates to an unmounted component.
 */
export declare function useState<T extends object>(initalState: T): [() => T, (partial: Partial<T>) => void];
