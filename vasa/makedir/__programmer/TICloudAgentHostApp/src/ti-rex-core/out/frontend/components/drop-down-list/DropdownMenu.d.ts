import * as React from 'react';
import { ListProps, PopoverProps } from '../../imports/material-ui-imports';
import { DropDownDirection } from './drop-down-list-types';
import { CommonProps, UseStylesClasses } from '../../component-helpers/util';
interface DropdownMenuProps extends CommonProps {
    isOpen: boolean;
    onClose: () => void;
    toggle: JSX.Element;
    direction: DropDownDirection;
    listProps?: Partial<ListProps>;
    popoverProps?: Partial<PopoverProps>;
    children?: React.ReactNode;
    classes?: UseStylesClasses<typeof useStyles>;
}
declare const useStyles: (props?: any) => import("@material-ui/styles").ClassNameMap<"root" | "paper">;
export declare const DropdownMenu: React.ForwardRefExoticComponent<Pick<DropdownMenuProps, "key" | "id" | "children" | "onClose" | "style" | "toggle" | "className" | "classes" | "direction" | "isOpen" | "listProps" | "popoverProps"> & React.RefAttributes<any>>;
export {};
