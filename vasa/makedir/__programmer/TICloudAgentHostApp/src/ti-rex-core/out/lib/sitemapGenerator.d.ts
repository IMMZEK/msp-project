/// <reference types="node" />
import * as fs from 'fs-extra';
import { PackageGroupJson } from '../sqldb/manage';
import { Resource, Overview } from './dbBuilder/dbTypes';
interface ResourceLinkJSON {
    [link: string]: {
        name: string;
        duplicatePaths: {
            [id: string]: string;
        };
        frontTrim: string;
        backTrim: string;
    };
}
export interface LinkSummary {
    total: number;
    software: number;
    ti: number;
    external: number;
}
export declare function createSitemap(args: any): Promise<void>;
export declare function getDuplicateLinks(items: Resource[] | Overview[]): ResourceLinkJSON;
export declare function writePackageSitemap(packageGroupUid: string, pkg: string, sitemapIndex: fs.WriteStream, linkSummary: LinkSummary): Promise<void>;
export declare function writeResourcesToSitemap(resources: Resource[], duplicateLinkFilepath: string, packageGroupPublicIdEncoded: string, packagePublicId: string, writeBuffer: fs.WriteStream, linkSummary: LinkSummary): Promise<boolean>;
export declare function writeOverviewToSitemap(overviews: Overview[], duplicateLinkFilepath: string, packageGroupPublicIdEncoded: string, packagePublicId: string, writeBuffer: fs.WriteStream, linkSummary: LinkSummary): Promise<boolean>;
export declare function getLatestPackageGroups(packageGroups: PackageGroupJson[]): PackageGroupJson[];
export declare function sortPackageGroups(packageGroups: PackageGroupJson[]): PackageGroupJson[];
export declare function isExcludedExternalSites(linkType: string, link: string): boolean;
export {};
