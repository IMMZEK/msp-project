import { ElementFinder } from 'protractor';
export declare namespace Filter {
    function openAllFiltersPopup(): Promise<void>;
    function verifyRadioButtonPresence(key: string, publicId: string): Promise<void>;
    function verifyRadioButtonValue(key: string, publicId: string, value: boolean): Promise<void>;
}
declare abstract class FilterInput {
    static click(): Promise<void>;
    static clickSuggestion(id: string): Promise<void>;
    static enterText(text: string): Promise<void>;
    static getValue(): Promise<string>;
    protected static getInput(): ElementFinder;
}
export declare class BoardDeviceInput extends FilterInput {
    protected static getInput(): ElementFinder;
}
export declare class KeywordInput extends FilterInput {
    protected static getInput(): ElementFinder;
}
export {};
