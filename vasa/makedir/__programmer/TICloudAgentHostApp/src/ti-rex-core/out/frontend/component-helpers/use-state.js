"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.useState = void 0;
// 3rd party
const React = require("react");
const use_is_mounted_1 = require("./use-is-mounted");
/**
 * A hook for handling state.
 *
 * Returns a function which will return the current value of state.
 * Useful for use in React.useCallback where the callback is memoized,
 * making it easy to have stale state values being referenced if the dependencies are not specfied correctly.
 *
 * Returns another function which allows you to do a parital update of the state. Also handles updates to an unmounted component.
 */
function useState(initalState) {
    const [state, setState] = React.useState(initalState);
    const stateRef = React.useRef(initalState);
    const isMounted = (0, use_is_mounted_1.useIsMounted)();
    stateRef.current = state;
    return [
        () => stateRef.current,
        (partial) => {
            if (isMounted.current) {
                setState({ ...stateRef.current, ...partial });
            }
        }
    ];
}
exports.useState = useState;
