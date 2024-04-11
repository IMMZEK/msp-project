"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.usePrevious = void 0;
const React = require("react");
/**
 * https://reactjs.org/docs/hooks-faq.html#how-to-get-the-previous-props-or-state
 *
 */
function usePrevious(value, { update = true, updateOnNull = true } = {}) {
    const ref = React.useRef();
    React.useEffect(() => {
        if (update && (value !== null || updateOnNull)) {
            ref.current = value;
        }
    });
    return ref.current || null;
}
exports.usePrevious = usePrevious;
