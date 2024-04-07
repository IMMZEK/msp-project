/// <reference types="react" />
import { ListItemProps } from '../../imports/material-ui-imports';
export declare const enum DropDownDirection {
    LEFT = "left",
    RIGHT = "right"
}
export declare const enum DropDownType {
    NON_NESTED = "NonNested",
    NESTED = "Nested",
    SUBHEADER = "Subheader",
    CUSTOM_ITEM = "CustomItem"
}
interface DropDownElementBase {
    label: string;
    id: string;
    onClick?: () => void;
}
export interface DropDownElementNonNested extends DropDownElementBase {
    elementType: DropDownType.NON_NESTED;
    closeOnClick?: boolean;
    leftIcon?: JSX.Element;
    listItemProps?: Partial<ListItemProps>;
    rightIcon?: JSX.Element;
}
export interface DropDownElementNested extends DropDownElementBase {
    elementType: DropDownType.NESTED;
    items: DropDownElement[];
    direction?: DropDownDirection;
    header?: JSX.Element;
    listItemProps?: Partial<ListItemProps>;
}
export interface DropDownElementSubheader extends DropDownElementBase {
    elementType: DropDownType.SUBHEADER;
}
export interface DropDownElementCustom {
    elementType: DropDownType.CUSTOM_ITEM;
    item: React.ComponentType<{
        requestClose: () => void;
    }>;
    id: string;
}
export type DropDownElement = DropDownElementNonNested | DropDownElementNested | DropDownElementSubheader | DropDownElementCustom;
export {};
