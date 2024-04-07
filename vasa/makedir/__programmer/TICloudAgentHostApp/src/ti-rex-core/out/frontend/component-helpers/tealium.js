"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.sendTirexEventToTealium = void 0;
const util_1 = require("../../shared/util");
///////////////////////////////////////////////////////////////////////////////
/// Code
///////////////////////////////////////////////////////////////////////////////
let tryGetAnalyticsFnPromise = null;
function sendTirexEventToTealium(event) {
    return fetchAnalyticsFunction().then(analyticsFn => {
        switch (event.event_name) {
            case "tirex page view" /* TirexEventType.PAGE_VIEW */:
            case "tirex search" /* TirexEventType.SEARCH */:
            case "tirex filter" /* TirexEventType.FILTER */:
            case "tirex package download" /* TirexEventType.PACKAGE_DOWNLOAD */:
            case "tirex file download" /* TirexEventType.FILE_DONWLOAD */:
            case "tirex package install" /* TirexEventType.PACKAGE_INSTALL */:
            case "tirex project import" /* TirexEventType.PROJECT_IMPORT */:
                analyticsFn('design tools', 'resource explorer', 'click', event);
                break;
            default: {
                (0, util_1.assertNever)(event);
                throw new Error(`Unknown event type for event ${event}`);
            }
        }
    });
}
exports.sendTirexEventToTealium = sendTirexEventToTealium;
function fetchAnalyticsFunction() {
    if (!tryGetAnalyticsFnPromise) {
        tryGetAnalyticsFnPromise = tryGetAnalytics();
    }
    return tryGetAnalyticsFnPromise;
}
function tryGetAnalytics() {
    const analyticsFn = getAnalyticsGlobal();
    if (analyticsFn) {
        return Promise.resolve(analyticsFn);
    }
    else {
        return new Promise((resolve, reject) => {
            let depth = 0;
            const intervalRef = setInterval(() => {
                const analyticsFn = getAnalyticsGlobal();
                if (analyticsFn) {
                    clearInterval(intervalRef);
                    resolve(analyticsFn);
                }
                else if (depth < 20) {
                    depth++;
                }
                else {
                    reject(new Error('Exceeded maximum wait time for utag'));
                }
            }, 500);
        });
    }
}
function getAnalyticsGlobal() {
    return window._tiAnalyticsTrack || null;
}
