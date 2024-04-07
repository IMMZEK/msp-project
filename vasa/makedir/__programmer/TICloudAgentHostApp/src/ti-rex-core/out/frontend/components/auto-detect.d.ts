import * as React from 'react';
import { AppProps } from '../component-helpers/util';
import { WithCloudAgentProps } from './with-cloud-agent';
import { CloudAgentOnlyProps } from './with-cloud-agent';
export interface AutoDetectSelection {
    name: string;
    publicId?: string;
}
interface AutoDetectProps extends WithCloudAgentProps {
    appProps: AppProps;
    onSelect: (selection: AutoDetectSelection) => void;
}
export declare const BEGIN_TEXT = "Detect my board";
export declare const SELECT_TEXT = "Use my board";
export declare const AutoDetect: (props: import("../../shared/generic-types").Omit<AutoDetectProps & React.RefAttributes<any>, keyof WithCloudAgentProps> & {
    agentProps: CloudAgentOnlyProps;
}) => JSX.Element;
export {};
