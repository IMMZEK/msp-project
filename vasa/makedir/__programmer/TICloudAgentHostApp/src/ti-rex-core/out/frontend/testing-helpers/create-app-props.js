"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.createAppProps = void 0;
const React = require("react");
// our modules
const apis_1 = require("../../frontend/apis/apis");
const entry_point_helpers_1 = require("../../frontend/component-helpers/entry-point-helpers");
const nodes_state_1 = require("../../frontend/component-helpers/nodes-state");
const auto_detect_1 = require("../../frontend/component-helpers/auto-detect");
const tour_state_1 = require("../../frontend/component-helpers/tour-state");
const local_apis_1 = require("../apis/local-apis");
const mount_component_temporarily_1 = require("../component-helpers/mount-component-temporarily");
const fakeHistory = {
    length: 0,
    action: 'PUSH',
    location: { pathname: '', search: '', state: '', hash: '' },
    push: () => { },
    replace: () => { },
    go: () => { },
    goBack: () => { },
    goForward: () => { },
    block: () => {
        return () => { };
    },
    listen: () => {
        return () => { };
    },
    createHref: () => {
        return '';
    }
};
async function createAppProps({ page, urlQuery }) {
    const apis = new apis_1.APIs();
    const appPropsInit = {
        apis,
        autoDetect: new auto_detect_1.AutoDetect(),
        history: { ...fakeHistory },
        localApis: new local_apis_1.LocalAPIs({ current: null }),
        mountComponentTemporarily: new mount_component_temporarily_1.MountComponentTemporarily(),
        nodesState: new nodes_state_1.NodesState(),
        page,
        tourState: new tour_state_1.TourState(),
        urlQuery,
        errorCallback: React.useRef(null)
    };
    const state = await (0, entry_point_helpers_1.getAppState)(appPropsInit, null);
    if (!state) {
        throw new Error('state expected');
    }
    return (0, entry_point_helpers_1.getAppProps)(appPropsInit, state);
}
exports.createAppProps = createAppProps;
