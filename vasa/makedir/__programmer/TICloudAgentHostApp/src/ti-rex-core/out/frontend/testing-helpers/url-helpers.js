"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.updateUrlForTesting = void 0;
function updateUrlForTesting(link) {
    const appProps = window.appPropsInitial;
    if (!appProps) {
        throw new Error('appProps not set');
    }
    appProps.history.push(link);
}
exports.updateUrlForTesting = updateUrlForTesting;
