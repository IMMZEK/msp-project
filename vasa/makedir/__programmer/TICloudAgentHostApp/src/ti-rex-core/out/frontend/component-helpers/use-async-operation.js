"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.useAsyncOperation = void 0;
// 3rd party
const React = require("react");
const PQueue = require("p-queue");
// our modules
const util_1 = require("./util");
const use_is_mounted_1 = require("./use-is-mounted");
const use_state_1 = require("./use-state");
const counter_1 = require("./counter");
///////////////////////////////////////////////////////////////////////////////
/// Code
///////////////////////////////////////////////////////////////////////////////
function useAsyncOperation({ operation, dependencies, errorCallback, cleanup, keepResultBetweenUpdates = false, doAllUpdates = false }) {
    const [getState, setState] = (0, use_state_1.useState)(getInitialState());
    const isMounted = (0, use_is_mounted_1.useIsMounted)();
    React.useEffect(() => {
        doTask(operation).catch(e => {
            if (!errorCallback.current) {
                console.error(e);
            }
            else if (isMounted.current) {
                errorCallback.current(e);
            }
        });
        return cleanup;
    }, dependencies);
    const { showLoading, updating, initialLoadDone, result } = getState();
    return {
        // Handles both inital load and subsequent loads
        shouldDisplayLoadingUI: (!initialLoadDone || updating) && showLoading,
        // Handles first load
        shouldDisplayInitalLoadingUI: !initialLoadDone && showLoading,
        // If you need the async operation to finish at least once to display stuff
        initalLoadInProgress: !initialLoadDone,
        // Operation result
        result
    };
    /**
     * Perform an async task. Handles the loading states.
     *
     */
    async function doTask(operation) {
        getState().updateCounter.setValue();
        const initialCount = getState().updateCounter.getValue();
        const isLatestOperation = () => initialCount === getState().updateCounter.getValue();
        /*
          Use a queue so we don't end up running multiple versions of the operation at once.

          The isLatestOperation check allows us to skip a version if we already have one waiting.
          This is useful if multiple versions get queued up, this will speed things up.
         */
        await getState().updateQueue.add(async () => {
            if (isLatestOperation() || doAllUpdates) {
                let updateComplete = false;
                setState({
                    showLoading: false,
                    updating: true,
                    ...(!keepResultBetweenUpdates ? { result: null } : {})
                });
                setTimeout(() => {
                    if (!updateComplete && isLatestOperation()) {
                        setState({ showLoading: true });
                    }
                }, util_1.LOADING_DELAY_MS);
                const result = await operation();
                updateComplete = true;
                setState({ initialLoadDone: true, updating: false, showLoading: false, result });
            }
        });
    }
    function getInitialState() {
        const initialState = {
            showLoading: false,
            updating: false,
            initialLoadDone: false,
            result: null,
            updateCounter: new counter_1.Counter(),
            updateQueue: new PQueue({ concurrency: 1 })
        };
        return initialState;
    }
}
exports.useAsyncOperation = useAsyncOperation;
