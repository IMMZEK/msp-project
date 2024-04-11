"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.useIsMounted = void 0;
// 3rd party
const React = require("react");
function useIsMounted() {
    const isMounted = React.useRef(true);
    React.useEffect(() => {
        return () => {
            isMounted.current = false;
        };
    }, []);
    return isMounted;
}
exports.useIsMounted = useIsMounted;
