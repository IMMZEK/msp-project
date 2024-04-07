/// <reference types="agent" />
import * as React from 'react';
import { AppProps } from '../component-helpers/util';
import { Omit } from '../../shared/generic-types';
export interface WithCloudAgentProps {
    agent: TICloudAgent.AgentModule | null;
    isLoading: boolean;
    hasTooltip: boolean;
}
interface CloudAgentOptions {
}
export interface CloudAgentOnlyProps {
    appProps: AppProps;
}
type CloudAgentWrapperProps<T extends WithCloudAgentProps> = Omit<T, keyof WithCloudAgentProps> & {
    agentProps: CloudAgentOnlyProps;
};
export declare function withCloudAgent(cloudAgentOptions: CloudAgentOptions): <T extends WithCloudAgentProps>(Component: React.ComponentType<T>) => (props: CloudAgentWrapperProps<T>) => JSX.Element;
export {};
