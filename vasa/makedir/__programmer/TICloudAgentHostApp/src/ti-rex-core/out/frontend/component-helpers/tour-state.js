"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.TourState = exports.TourStateElement = void 0;
const event_emitter_1 = require("../component-helpers/event-emitter");
///////////////////////////////////////////////////////////////////////////////
/// Types
///////////////////////////////////////////////////////////////////////////////
var TourStateElement;
(function (TourStateElement) {
    TourStateElement["INACTIVE"] = "inactive";
    TourStateElement["NAVBAR_HEADER"] = "navbar header";
    TourStateElement["FILTERS"] = "filters";
    TourStateElement["KEYWORD_FILTER_BAR"] = "keyword filter bar";
    TourStateElement["HAMBURGER"] = "hamburger";
    TourStateElement["TREE"] = "tree";
    TourStateElement["RIGHT_HAND_VIEW"] = "right hand view";
})(TourStateElement || (exports.TourStateElement = TourStateElement = {}));
///////////////////////////////////////////////////////////////////////////////
/// Code
///////////////////////////////////////////////////////////////////////////////
const TOUR_ORDER = [
    TourStateElement.INACTIVE,
    TourStateElement.NAVBAR_HEADER,
    TourStateElement.FILTERS,
    TourStateElement.KEYWORD_FILTER_BAR,
    TourStateElement.HAMBURGER,
    TourStateElement.TREE,
    TourStateElement.RIGHT_HAND_VIEW
];
/**
 * Holds the state of the tour in the frontend.
 */
class TourState {
    emitter = new event_emitter_1.default();
    tourIndex = 0;
    exit() {
        this.tourIndex = 0;
        this.emitChange();
    }
    next() {
        this.tourIndex = (this.tourIndex + 1) % TOUR_ORDER.length;
        this.emitChange();
    }
    onChange(onChangeFn) {
        const listener = newState => onChangeFn(newState);
        this.emitter.on('change', listener);
        return listener;
    }
    previous() {
        if (this.tourIndex > 0) {
            this.tourIndex--;
            this.emitChange();
        }
    }
    removeListener(listener) {
        this.emitter.off('change', listener);
    }
    emitChange() {
        this.emitter.emit('change', TOUR_ORDER[this.tourIndex]);
    }
}
exports.TourState = TourState;
