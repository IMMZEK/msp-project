import * as React from 'react';
export declare class ErrorBoundary extends React.Component<{}, {
    error: Error | null;
    errorInfo: React.ErrorInfo | null;
}> {
    constructor(props: {});
    componentDidCatch(error: Error, info: React.ErrorInfo): void;
    render(): JSX.Element;
    private handleInboundError;
}
