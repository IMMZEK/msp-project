/// <reference types="superagent" />
import { Response, RequestQuery } from '../../shared/routes/request-response';
import { MinimalResource, MinimalPackageOverview, Metadata } from './database-utils';
import { Options } from '../../lib/dbImporter/contentImporter';
interface Content {
    [key: string]: string | Content;
}
export declare const GROUP_ID_PREFIX = "grp_";
export declare function updateDatabase(data: Metadata): Promise<string>;
export declare function updateDatabaseWithScript(data: Metadata): Promise<string>;
export declare function makeDownloadImportRequest(get: string, query: RequestQuery.NodeDownload | RequestQuery.ImportInfo | RequestQuery.ImportProject): Promise<import("superagent").Response>;
export declare function makeRequest<Response>(get: string, query?: any): Promise<Response>;
export declare function getNodesData(query: RequestQuery.NodesData): Promise<Response.NodesData>;
export declare function getNodeExtendedData(query: RequestQuery.NodeExtendedData): Promise<Response.NodeExtendedData>;
export declare function getFilteredChildrenNodeIds(query: RequestQuery.FilteredChildrenNodeIds): Promise<Response.FilteredChildrenNodeIds>;
export declare function getExpandedFilteredDescendantNodesData(query: RequestQuery.ExpandedFilteredDescendantNodesData): Promise<Response.ExpandedFilteredDescendantNodesData>;
export declare function getFilterOptions(): Promise<import("../../shared/routes/response-data").FilterData.Options>;
export declare function getRootNode(): Promise<string>;
export declare function getSearchSuggestions(query: RequestQuery.SearchSuggestions): Promise<Response.SearchSugestionsData>;
export declare function getNodeDbId(query: RequestQuery.NodePublicIdToDbId): Promise<string>;
export declare function getNodeDbIdRex3(query: RequestQuery.Rex3LinkToDbId): Promise<string>;
export declare function toNodePath(parameter: MinimalResource | MinimalPackageOverview | string[]): string[];
export declare function getDbId(parameter: MinimalResource | MinimalPackageOverview | string[]): Promise<string>;
export declare function createContent(contentPath: string, content: Content): void;
export declare function updateDBContent(contentPath: string, options?: Options): Promise<void>;
export {};
