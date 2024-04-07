import * as React from 'react';
import { DialogProps } from '../imports/material-ui-imports';
export declare enum MountPoint {
    DISPLAY_MOUNT = "tempMountPoint",
    WAITING_MOUNT = "tempMountPoint2"
}
/**
 * Used to mount a component to the dom outside of our normal execution - i.e in just js code hooked into an event handler.
 * The component should do a particular task which will eventually complete, at which point we will unmount the component.
 *
 * @param Component - the component to mount
 * @param props - the props to pass to the component
 * @param mountPoint - the mount point to use.
 */
export declare class MountComponentTemporarily {
    private readonly emitter;
    private readonly queue;
    mountComponentTemporarily<T extends {
        onClose?: (...args: any[]) => void;
    }>(Component: React.ComponentType<T>, props: T, mountPoint?: MountPoint): void;
    mountDialogTemporarily<T extends {
        onClose?: (...args: any[]) => void;
    }>(Component: React.ComponentType<T>, props: T, { mountPoint, dialogProps }?: {
        mountPoint?: MountPoint;
        dialogProps?: Partial<DialogProps>;
    }): void;
    _reset(): void;
}
