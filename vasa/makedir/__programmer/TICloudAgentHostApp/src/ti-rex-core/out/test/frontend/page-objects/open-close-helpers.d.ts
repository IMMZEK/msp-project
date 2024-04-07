/**
 * Helpers for opening and closing UI elements
 *
 */
export declare function openItem(itemButtonId: string, itemId: string): Promise<void>;
export declare function closeItem(itemButtonId: string, itemId: string): Promise<void>;
export declare function waitUntilItemOpen(itemId: string): Promise<void>;
export declare function waitUntilItemClosed(itemId: string): Promise<void>;
export declare function openNestedDropdownMenu(menuButtonId: string, _menuId: string): Promise<void>;
