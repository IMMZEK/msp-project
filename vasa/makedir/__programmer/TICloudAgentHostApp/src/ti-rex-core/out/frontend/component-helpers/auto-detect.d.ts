/// <reference types="agent" />
import { DeviceDetector, DetectedDevice } from 'device_detector';
export type DeviceDetectorModule = DeviceDetector & TICloudAgent.Module;
export declare const enum DetectionResultType {
    SUCCESS = "SUCCESS",
    HOST_FILES_MISSING = "HOST_FILES_MISSING",
    UNKNOWN_ERROR = "UNKNOWN_ERROR"
}
interface DetectectedDevices {
    type: DetectionResultType.SUCCESS;
    detectedDevices: DetectedDevice[];
}
interface HostFilesMissing {
    type: DetectionResultType.HOST_FILES_MISSING;
    handler: () => void;
}
interface UnknownError {
    type: DetectionResultType.UNKNOWN_ERROR;
    error: string;
}
export interface ProgressData {
    name: string;
    subActivity: string;
    isComplete: boolean;
    isFirstUpdate: boolean;
    percent?: number;
}
export type DetectionResult = DetectectedDevices | HostFilesMissing | UnknownError;
export declare class AutoDetect {
    private initPromise;
    private detectPromise;
    private readonly changeListeners;
    private readonly progressListeners;
    addChangeListener(listener: () => void): void;
    removeChangeListener(listener: () => void): void;
    addProgressListener(listener: (status: ProgressData) => void): void;
    removeProgressListener(listener: (status: ProgressData) => void): void;
    detect(agent: TICloudAgent.Module): Promise<DetectionResult>;
    _reset(): void;
    private getInitPromise;
    private maybeDetectDevices;
    private detectDevices;
    private handleChange;
    private handleProgress;
    private handleError;
}
export {};
