import * as React from 'react';
import { ListProps, ListItemProps } from '../../imports/material-ui-imports';
import { DropDownDirection } from './drop-down-list-types';
import { CommonProps, UseStylesClasses } from '../../component-helpers/util';
interface NestedDropdownMenuProps extends CommonProps {
    toggle: JSX.Element;
    direction: DropDownDirection;
    header?: JSX.Element;
    listItemProps?: Partial<ListItemProps>;
    listProps?: Partial<ListProps>;
    children?: React.ReactNode;
    classes?: UseStylesClasses<typeof useStyles>;
}
declare const useStyles: (props?: any) => import("@material-ui/styles").ClassNameMap<"root" | "paper">;
export declare const NestedDropdownMenu: (props: NestedDropdownMenuProps) => JSX.Element;
export {};
