import * as React from 'react';
import { ButtonProps, ListProps, PopoverProps } from '../../imports/material-ui-imports';
import { DropDownElement, DropDownDirection } from './drop-down-list-types';
import { CommonProps } from '../../component-helpers/util';
interface DropDownListBaseProps extends CommonProps {
    items: DropDownElement[];
    onClose?: () => void;
    listProps?: Partial<ListProps>;
    direction?: DropDownDirection;
    popoverProps?: Partial<PopoverProps>;
}
export interface DropDownListClasses {
    contained?: string;
    button?: string;
    root?: string;
}
interface DropDownListProps extends Pick<ButtonProps, 'variant'>, DropDownListBaseProps {
    name: string;
    classes?: DropDownListClasses;
    className?: string;
    headerButtonProps?: Partial<ButtonProps>;
}
interface DropDownListCustomHeaderProps extends DropDownListBaseProps {
    header: JSX.Element;
    isOpen: boolean;
}
export declare const DropDownList: React.ForwardRefExoticComponent<Pick<DropDownListProps, "key" | "id" | "name" | "onClose" | "style" | "className" | "classes" | "direction" | "variant" | "listProps" | "popoverProps" | "items" | "headerButtonProps"> & React.RefAttributes<any>>;
export declare function DropDownListCustomHeader(props: DropDownListCustomHeaderProps): JSX.Element;
export {};
