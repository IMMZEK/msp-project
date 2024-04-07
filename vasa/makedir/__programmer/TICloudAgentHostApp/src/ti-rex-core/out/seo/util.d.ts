import { Response } from 'express';
import { RequestSqldb } from '../routes/executeRoute';
import { DbSession } from '../lib/dbSession';
import { PackageGroupData, PackageData } from '../frontend/apis/filter-types';
export declare function isSearchBot(req: RequestSqldb): "" | RegExpMatchArray | null | undefined;
export declare function sendNoIndex(res: Response): void;
export declare function getDuplicateLinks(nodeDbId: number, sqldb: DbSession): Promise<any>;
export declare function replaceCharactersWithHtmlEncoding(content: string): string;
export declare function getNodeDbIdforLatestVersion(sqldb: DbSession, packageGroupPublicId: string, nodePublicId: string, packagePublicId: string | null): Promise<number | null>;
export declare function isFromSearchResults(req: RequestSqldb): boolean | "" | undefined;
export declare function getLinkPrefix(): string;
export declare function handlePublicId(req: RequestSqldb, _res: Response, packageGroups: PackageGroupData[], _packages: PackageData[]): {
    packageGroupPublicId: string;
    packageGroupVersion: string;
    packagePublicId: string | null;
    nodePublicId: string;
} | null;
