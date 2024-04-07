import { PackageGroupData, PackageData } from '../../shared/routes/response-data';
import { APIs } from '../apis/apis';
import { BrowserUrlQuery } from '../apis/filter-types';
/**
 * For dealing with public ids
 *
 */
export declare function getNodeDbIdFromPublicId(publicId: string, allGroups: PackageGroupData[], urlQuery: BrowserUrlQuery.Params, apis: APIs, masterName?: string): Promise<string | null>;
export declare function getPublicIdFromIds({ nodePublicId, packageGroupPublicUid, packagePublicUid, allGroups, allPackages, urlQuery }: {
    nodePublicId: string;
    packageGroupPublicUid: string | null;
    packagePublicUid: string | null;
    allGroups: PackageGroupData[];
    allPackages: PackageData[];
    urlQuery: BrowserUrlQuery.Params;
}): string;
export declare function getPublicIdFromMinimalIds({ nodePublicId, packageGroupPublicId, packageGroupVersion, packagePublicId }: {
    nodePublicId: string;
    packageGroupPublicId: string | null;
    packageGroupVersion: string | null;
    packagePublicId: string | null;
}): string;
export declare function getPublicIdData(publicId: string, allGroups: PackageGroupData[]): {
    group: null;
    nodePublicId: string;
    packagePublicId: null;
} | {
    group: PackageGroupData & {
        isLatest: boolean;
    };
    nodePublicId: string;
    packagePublicId: string | null;
} | null;
export declare function getPublicIdParts(publicId: string): {
    nodePublicId: string;
    packagePublicId: string | null;
    packageGroupPublicId: string | null;
    packageGroupVersion: string | null;
};
