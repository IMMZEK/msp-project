import { Db } from './db/db';
export declare class Devtools {
    private readonly db;
    constructor(db: Db);
    /**
     * Get all devtools
     *
     * @returns devtools
     */
    getAll(): Promise<Devtool[]>;
    /**
     * Get IDs of devtools supported by the given resource
     *
     * @param resourceId - the resource's id
     * @returns devtool ids
     */
    getIdsOnResource(resourceId: number): Promise<number[]>;
    /**
     * Get Names of devtools supported by the given resource
     *
     * @param resourceId - the resource's id
     * @returns devtool names
     */
    getNamesOnResource(resourceId: number): Promise<string[]>;
}
export interface Devtool {
    id: number;
    _id: string;
    devSetId: number;
    publicId: string;
    jsonId: string;
    type: string;
    overviewPublicId?: string;
    overviewNodeId?: number | null;
    name: string;
    packageUid: string;
    description?: string;
    buyLink?: string;
    image?: string;
    toolsPage?: string;
    connections?: string[];
    energiaBoards?: {
        id: string;
    }[];
    devices: string[];
}
