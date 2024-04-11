import * as React from 'react';
export declare abstract class BaseComponent<P, S> extends React.Component<P, S> {
    private isActive;
    private error;
    handleError(e: Error): void;
    componentWillUnmount(): void;
    forceUpdate(callback?: () => void): void;
    render(): React.ReactNode;
    setState<K extends keyof S>(stateOrF: ((prevState: S, props: P) => Pick<S, K>) | Pick<S, K>, callback?: () => any): void;
    protected abstract handleRender(): React.ReactNode;
    private checkForError;
}
