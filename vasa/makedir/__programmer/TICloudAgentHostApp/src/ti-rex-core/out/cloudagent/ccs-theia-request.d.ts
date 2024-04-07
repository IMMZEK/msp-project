import { Logger } from '../utils/logging';
import { CCSProduct } from './util';
/**
 * Some CCS API names
 */
export declare const enum CCS_THEIA_API {
    REDISCOVER_PRODUCTS = "/api/ccsserver/rediscoverProducts",
    GET_PRODUCTS = "/api/ccsserver/getProducts",
    GET_PRODUCT_DISCOVERY_PATH = "/api/ccsserver/getProductDiscoveryPath",
    GET_DEVICES = "/api/ccsserver/getDevices",
    GET_DEVICE_DETAILS = "/api/ccsserver/getDeviceDetails",
    GET_PROJECT_TEMPLATES = "/api/ccsserver/getProjectTemplates",
    IMPORT_PROJECT = "/api/ccsserver/importProject",
    CREATE_PROJECT = "/api/ccsserver/createProject",
    IMPORT_SKETCH = "/api/ccsserver/importSketch"
}
export interface CCSDevice {
    id: string;
    name: string;
    filterKey?: string;
}
export interface CCSDevicesInfo {
    devices: CCSDevice[];
    targetFilters: string[];
}
export interface CCSDeviceDetail {
    id: string;
    name: string;
    family: string;
    variant: string;
    isa: string;
    isReal: boolean;
    filterKey?: string;
    xmlFileName?: string;
    partNumber?: string;
    connections?: {
        name: string;
        xmlFileName: string;
    }[];
    defaultConnection?: {
        name: string;
        xmlFileName: string;
    };
    toolVersions: {
        value: string;
        displayString: string;
    }[];
    defaultToolVersion?: {
        value: string;
        displayString: string;
    };
}
export type IDEToolchain = 'TI' | 'TICLANG' | 'GNU';
export interface OutputType {
    id: string;
    name: string;
}
export interface Template {
    id: string;
    name: string;
    description: string;
}
export interface CCSTemplatesInfo {
    outputTypes: OutputType[];
    templateIndex: {
        [outputTypeId: string]: Template[];
    };
}
export declare class CCSTheiaRequest {
    private readonly logger;
    private readonly theiaPort;
    constructor(logger: Logger, theiaPort: number);
    rediscoverProducts(): Promise<void>;
    getProducts(): Promise<CCSProduct[]>;
    getProductDiscoveryPath(): Promise<string[]>;
    getDevices(targetFilter?: string): Promise<CCSDevicesInfo>;
    getDeviceDetail(deviceId: string): Promise<CCSDeviceDetail>;
    getProjectTemplates(deviceId: string, toolVersion: string): Promise<CCSTemplatesInfo>;
    importProject(location: string, targetId?: string, projectName?: string): Promise<void>;
    createProject(location?: string, targetId?: string, projectName?: string, templateId?: string, toolVersion?: string, outputType?: string): Promise<void>;
    importSketch(location: string, targetId: string, projectName?: string): Promise<void>;
    private ccsRequest;
}
