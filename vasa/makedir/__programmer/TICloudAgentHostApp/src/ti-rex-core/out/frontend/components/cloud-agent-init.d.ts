import * as React from 'react';
import { MountComponentTemporarily } from '../component-helpers/mount-component-temporarily';
import { CommonProps } from '../component-helpers/util';
import { AgentState } from '../component-helpers/use-cloud-agent';
import { ErrorContextValue } from '../component-helpers/context';
interface CloudAgentInitProps extends CommonProps {
    agentState: AgentState | null;
    children: JSX.Element;
    mountComponentTemporarily: MountComponentTemporarily;
    onChange: () => void;
    errorCallback: React.MutableRefObject<ErrorContextValue | null>;
}
export declare function CloudAgentInit(props: CloudAgentInitProps): JSX.Element;
export {};
