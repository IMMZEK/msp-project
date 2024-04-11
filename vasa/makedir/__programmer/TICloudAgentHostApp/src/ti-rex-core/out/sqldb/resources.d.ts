import { Db } from './db/db';
import { ResourceType, LinkForDownload, LinkType, ProjectRestriction } from '../lib/dbBuilder/dbTypes';
export declare class Resources {
    private readonly db;
    constructor(db: Db);
    /**
     * Get node's resource
     *
     * @param nodeId - the node's id
     * @returns resource
     */
    getOnNode(nodeId: number): Promise<Resource | null>;
    /**
     * Get resource's parent resource
     *
     * @param resourceId - the resource's id
     * @returns parent resource
     */
    getParent(resourceId: number): Promise<Resource | null>;
    /**
     * Get resource's child resources
     *
     * @param resourceId - the id of the resource
     * @returns child resources
     */
    getChildren(resourceId: number): Promise<Resource[]>;
    /**
     * Get all overviews belonging to a given package
     *
     * @param packageId - the package's id
     * @returns overviews
     */
    getOverviewsOnPackage(packageId: number): Promise<Resource[]>;
}
export interface Resource {
    id: number;
    parentId?: number;
    jsonId: string;
    type: ResourceType;
    name: string;
    packageId: number;
    ordinal?: number;
    description?: string;
    shortDescription?: string;
    viewLimitations?: string[];
    projectRestriction?: ProjectRestriction;
    kernel?: string[];
    compiler?: string[];
    overrideProjectSpecDeviceId?: boolean;
    link?: string;
    linkType?: LinkType;
    icon?: string;
    fileType?: string;
    hasIncludes?: boolean;
    isIncludedFile?: boolean;
    image?: string;
    root0?: string;
    importProjectCCS?: string;
    createProjectCCS?: string;
    linkForDownload?: LinkForDownload;
}
