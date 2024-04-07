"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.useIsLoading = void 0;
// 3rd party
const React = require("react");
const use_state_1 = require("./use-state");
const util_1 = require("./util");
const counter_1 = require("./counter");
///////////////////////////////////////////////////////////////////////////////
/// Code
///////////////////////////////////////////////////////////////////////////////
function useIsLoading(args) {
    const [getState, setState] = (0, use_state_1.useState)({
        showLoading: false,
        updateCounter: new counter_1.Counter()
    });
    const resultRef = React.useRef(args.result);
    resultRef.current = args.result;
    React.useEffect(() => {
        if (args.trigger) {
            getState().updateCounter.setValue();
            const initialCount = getState().updateCounter.getValue();
            const isLatestOperation = () => initialCount === getState().updateCounter.getValue();
            setTimeout(() => {
                if (isLatestOperation() && resultRef.current === null) {
                    setState({ showLoading: true });
                }
            }, util_1.LOADING_DELAY_MS);
        }
    }, [...args.inputDeps, args.trigger]);
    React.useEffect(() => {
        if (resultRef.current !== null && getState().showLoading) {
            setState({ showLoading: false });
        }
    }, [args.result]);
    return getState().showLoading;
}
exports.useIsLoading = useIsLoading;
