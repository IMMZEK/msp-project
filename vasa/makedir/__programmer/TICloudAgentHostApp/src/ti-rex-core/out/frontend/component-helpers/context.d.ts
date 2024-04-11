import * as React from 'react';
export type ErrorContextValue = (error: Error) => void;
interface ErrorContextWrapperProps {
    errorCallbackValue: (value: ErrorContextValue) => void;
    children: React.ReactNode;
}
export declare const _ErrorContext: React.Context<ErrorContextValue>;
export declare function ErrorContextWrapper(props: ErrorContextWrapperProps): JSX.Element;
export {};
