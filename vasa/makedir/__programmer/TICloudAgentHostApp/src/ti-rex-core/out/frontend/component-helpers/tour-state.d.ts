import * as ee from 'event-emitter';
export declare enum TourStateElement {
    INACTIVE = "inactive",
    NAVBAR_HEADER = "navbar header",
    FILTERS = "filters",
    KEYWORD_FILTER_BAR = "keyword filter bar",
    HAMBURGER = "hamburger",
    TREE = "tree",
    RIGHT_HAND_VIEW = "right hand view"
}
type OnChangeFn = (tourState: TourStateElement) => void;
/**
 * Holds the state of the tour in the frontend.
 */
export declare class TourState {
    private emitter;
    private tourIndex;
    exit(): void;
    next(): void;
    onChange(onChangeFn: OnChangeFn): ee.EventListener;
    previous(): void;
    removeListener(listener: ee.EventListener): void;
    private emitChange;
}
export {};
