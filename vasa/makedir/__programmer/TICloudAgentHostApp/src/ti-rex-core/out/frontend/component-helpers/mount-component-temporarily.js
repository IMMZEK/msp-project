"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.MountComponentTemporarily = exports.MountPoint = void 0;
// 3rd party
const React = require("react");
const ReactDOM = require("react-dom");
const PQueue = require("p-queue");
// 3rd party components
const material_ui_imports_1 = require("../imports/material-ui-imports");
// our modules
const theme_1 = require("../component-helpers/theme");
const event_emitter_1 = require("./event-emitter");
const theme_config_1 = require("./theme-config");
// our components
const error_boundary_1 = require("../components/error-boundary");
///////////////////////////////////////////////////////////////////////////////
/// Types
///////////////////////////////////////////////////////////////////////////////
/*
 * Use tempMountPoint for displaying (i.e dialog from onClick)
 * Use tempMountPoint2 while waiting on something, before we are ready to display something
 *  (i.e wait for install to finish before displaying dialog)
 */
var MountPoint;
(function (MountPoint) {
    MountPoint["DISPLAY_MOUNT"] = "tempMountPoint";
    MountPoint["WAITING_MOUNT"] = "tempMountPoint2";
})(MountPoint || (exports.MountPoint = MountPoint = {}));
///////////////////////////////////////////////////////////////////////////////
/// Code
///////////////////////////////////////////////////////////////////////////////
/**
 * Used to mount a component to the dom outside of our normal execution - i.e in just js code hooked into an event handler.
 * The component should do a particular task which will eventually complete, at which point we will unmount the component.
 *
 * @param Component - the component to mount
 * @param props - the props to pass to the component
 * @param mountPoint - the mount point to use.
 */
class MountComponentTemporarily {
    emitter = new event_emitter_1.default();
    queue = {
        [MountPoint.DISPLAY_MOUNT]: new PQueue({ concurrency: 1 }),
        [MountPoint.WAITING_MOUNT]: new PQueue({ concurrency: 1 })
    };
    mountComponentTemporarily(Component, props, mountPoint = MountPoint.DISPLAY_MOUNT) {
        this.queue[mountPoint]
            .add(() => {
            return new Promise((resolve, reject) => {
                try {
                    this.emitter.once('reset', () => {
                        resolve();
                    });
                    const tempMountPoint = document.getElementById(mountPoint);
                    if (!tempMountPoint) {
                        throw new Error('Temp mount point not found');
                    }
                    ReactDOM.render(React.createElement(Component, { ...props, onClose: (...args) => {
                            ReactDOM.unmountComponentAtNode(tempMountPoint);
                            if (props.onClose) {
                                props.onClose(...args);
                            }
                            resolve();
                        } }), tempMountPoint);
                }
                catch (e) {
                    reject(e);
                }
            });
        })
            .catch((e) => {
            console.error(e);
        });
    }
    mountDialogTemporarily(Component, props, { mountPoint = MountPoint.DISPLAY_MOUNT, dialogProps } = {}) {
        this.mountComponentTemporarily((props) => {
            return (React.createElement(material_ui_imports_1.MuiThemeProvider, { theme: (0, theme_1.theme)((0, theme_config_1.getTheme)()) },
                React.createElement(material_ui_imports_1.Dialog, { ...(dialogProps ? dialogProps : {}), open: true },
                    React.createElement(error_boundary_1.ErrorBoundary, null,
                        React.createElement(Component, { ...props })))));
        }, props, mountPoint);
    }
    // For testing purposes only
    _reset() {
        Object.values(MountPoint).forEach((mount) => {
            this.queue[mount].clear();
            this.emitter.emit('reset');
            const tempMountPoint = document.getElementById(mount);
            if (!tempMountPoint) {
                throw new Error('Temp mount point not found');
            }
            ReactDOM.unmountComponentAtNode(tempMountPoint);
            this.queue[mount] = new PQueue({ concurrency: 1 });
        });
    }
}
exports.MountComponentTemporarily = MountComponentTemporarily;
