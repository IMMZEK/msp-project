import { ElementFinder } from 'protractor';
export declare namespace AutoDetect {
    function clickButton(): Promise<void>;
    function closeDialog(): Promise<void>;
    function openDetectedDevicesMenu(): Promise<void>;
    function selectDetectedDevice(id: string): Promise<void>;
    function verifyButton(expectedText?: string, allowSubstring?: boolean): Promise<void>;
    function verifyDialogOpen(expectedText: string, allowSubstring?: boolean): Promise<void>;
    function verifyDialogClosed(): Promise<void>;
    function verifyDetectedDevices(numDevices?: number): Promise<void>;
    function getDetectedDevices(): Promise<ElementFinder[]>;
}
