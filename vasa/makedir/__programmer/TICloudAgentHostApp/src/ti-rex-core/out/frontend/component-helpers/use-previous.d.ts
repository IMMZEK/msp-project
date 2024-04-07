/**
 * https://reactjs.org/docs/hooks-faq.html#how-to-get-the-previous-props-or-state
 *
 */
export declare function usePrevious<T>(value: T, { update, updateOnNull }?: {
    update?: boolean;
    updateOnNull?: boolean;
}): NonNullable<T> | null;
