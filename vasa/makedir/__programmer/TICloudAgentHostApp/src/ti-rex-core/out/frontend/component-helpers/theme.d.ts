import { ZIndexOptions } from '../imports/material-ui-imports';
interface ZIndexOptionsExtended extends ZIndexOptions {
    min: number;
    levelOne: number;
    levelTwo: number;
    levelThree: number;
    levelFour: number;
    max: number;
}
export declare const SMALL_ICON_SIZE = "18px";
export declare const REGULAR_ICON_SIZE = "18px";
export declare const LARGE_ICON_SIZE = "24px";
export declare const zIndexLevel: ZIndexOptionsExtended;
export declare const theme: (type: 'dark' | 'light') => import("@material-ui/core/styles/createTheme").Theme;
export {};
