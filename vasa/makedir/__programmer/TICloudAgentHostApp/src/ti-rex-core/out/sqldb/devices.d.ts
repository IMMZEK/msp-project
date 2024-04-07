import { Db } from './db/db';
import { CoreType } from './db/types';
import { DeviceType } from '../shared/routes/response-data';
export declare class Devices {
    private readonly db;
    constructor(db: Db);
    /**
     * Get all devices
     *
     * @returns all devices
     */
    getAll(): Promise<Device[]>;
    /**
     * Get IDs of devices supported by the given resource
     *
     * @param resourceId - the resource's id
     * @returns device ids
     */
    getIdsOnResource(resourceId: number): Promise<number[]>;
    /**
     * Get names of devices supported by the given resource
     *
     * @param resourceId - the resource's id
     * @returns device names
     */
    getNamesOnResource(resourceId: number): Promise<string[]>;
    /**
     * Get IDs of devices supported by the given devtool
     *
     * @param devtoolId - the devtool's id
     * @returns device ids
     */
    getIdsOnDevtool(devtoolId: number): Promise<number[]>;
}
export interface Device {
    id: number;
    _id: string;
    devSetId: number;
    parentId?: number;
    publicId: string;
    jsonId: string;
    type: DeviceType;
    overviewPublicId?: string;
    overviewNodeId?: number | null;
    name: string;
    packageUid: string;
    description?: string;
    image?: string;
    coreTypes: CoreType[];
    ancestorIds?: number[];
}
