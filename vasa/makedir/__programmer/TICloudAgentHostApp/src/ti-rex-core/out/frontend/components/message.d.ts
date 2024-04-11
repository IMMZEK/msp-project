import * as React from 'react';
import { CommonProps, UseStylesClasses } from '../component-helpers/util';
interface SplashPresentationProps extends CommonProps {
    message: JSX.Element | string;
    messageType: MESSAGE_TYPE;
    classes?: UseStylesClasses<typeof useStyles>;
}
export declare enum MESSAGE_TYPE {
    ERROR = "error",
    INFO = "INFO"
}
declare const useStyles: (props?: any) => import("@material-ui/styles").ClassNameMap<"text" | "root" | "paper" | "errorIcon" | "refreshButton" | "warningIcon" | "messageBody" | "messageText">;
export declare const Message: React.ForwardRefExoticComponent<Pick<SplashPresentationProps, "key" | "id" | "message" | "style" | "className" | "classes" | "messageType"> & React.RefAttributes<any>>;
export declare function refreshTirexPage(): void;
export {};
