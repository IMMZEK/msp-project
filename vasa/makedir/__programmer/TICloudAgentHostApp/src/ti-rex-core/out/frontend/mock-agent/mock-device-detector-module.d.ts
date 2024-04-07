import { DetectedDebugProbe, DetectedDevice } from 'device_detector';
import { DeviceDetectorModule } from '../component-helpers/auto-detect';
import { Options } from './util';
export declare const attachedDevices: DetectedDevice[];
export declare const initialDevices: number;
/**
 * Mock TICloudAgent device detection module, but with only the functions we care about
 *
 */
export declare class MockDeviceDetectorModule implements Partial<DeviceDetectorModule> {
    private readonly options;
    private detectedCount;
    private readonly listeners;
    constructor(options: Options);
    filesNeeded(): Promise<boolean>;
    addListener(eventName: string, listener: (data: any) => void): void;
    removeListener(eventName: string, listener: (data: any) => void): void;
    detectDebugProbes(): Promise<{
        probes: {
            connectionXml: string;
            id: number;
        }[];
    }>;
    detectDeviceWithProbe(probe: DetectedDebugProbe): Promise<DetectedDevice>;
    private fireEvent;
}
