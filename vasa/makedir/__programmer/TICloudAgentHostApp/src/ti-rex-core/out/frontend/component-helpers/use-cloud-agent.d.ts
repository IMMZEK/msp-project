/// <reference types="agent" />
import * as React from 'react';
import { ErrorContextValue } from './context';
export declare const enum CloudAgentInitState {
    SUCCESS = "Success",
    AGENT_NOT_INSTALLED = "AgentNotInstalled",
    UNKNOWN_ERROR = "UnknownError",
    NOT_INITIALIZED = "NotInitialized"
}
export interface AgentState {
    agent: TICloudAgent.AgentModule | null;
    cloudAgentInitState: CloudAgentInitState;
    cloudAgentInitErrors: TICloudAgent.Error[] | null;
}
interface UseCloudAgentParams {
    dependencies: React.DependencyList;
    errorCallback: React.RefObject<ErrorContextValue | null>;
}
export declare function useCloudAgent({ dependencies, errorCallback }: UseCloudAgentParams): {
    shouldDisplayLoadingUI: boolean;
    shouldDisplayInitalLoadingUI: boolean;
    initalLoadInProgress: boolean;
    result: AgentState | null;
};
export declare function getInitialAgentState(): AgentState;
export {};
