import { Nodes } from '../shared/routes/response-data';
import { RequestQueryInput, Response } from '../shared/routes/request-response';
import * as Sqldb from '../lib/dbSession';
/**
 *
 * @returns {Router}
 */
export declare function getRoutes(): import("express-serve-static-core").Router;
export declare function lookupNodeDbId(sqldb: Sqldb.DbSession, query: RequestQueryInput.NodePublicIdToToDbId): Promise<string>;
export declare function lookupNodeDbIdRex3(sqldb: Sqldb.DbSession, query: RequestQueryInput.NodeDbIdRex3): Promise<string>;
export declare function getRootNode(sqldb: Sqldb.DbSession): Promise<string>;
export declare function getSearchSuggestions(sqldb: Sqldb.DbSession, query: RequestQueryInput.SearchSuggestions): Promise<string[]>;
export declare function getNodeInfoForResourceId(sqldb: Sqldb.DbSession, query: RequestQueryInput.NodeInfoForResourceId): Promise<import("../lib/dbBuilder/dbTypes").LandingPageNodeInfo[]>;
export declare function getNodeInfoForGlobalId(sqldb: Sqldb.DbSession, query: RequestQueryInput.NodeInfoForGlobalId): Promise<import("../lib/dbBuilder/dbTypes").LandingPageNodeInfo[]>;
export declare function getFilteredTableItemsData(sqldb: Sqldb.DbSession, query: RequestQueryInput.FilteredTableItemsData): Promise<Response.FilteredTableItemsData>;
export declare function getAvailableTableViewFilters(sqldb: Sqldb.DbSession, query: RequestQueryInput.FilteredTableItemsData): Promise<Response.TableViewFiltersData>;
/**
 * For filter change case
 *
 * Get the basic metadata for the given list of node ids
 * Called for node ids that are cached in the front-end but their data is not
 *
 * @param sqldb
 * @param {RequestQueryInput.NodesData} query
 * @returns {Promise<Response.NodesData>}
 */
export declare function getNodesData(sqldb: Sqldb.DbSession, query: RequestQueryInput.NodesData): Promise<Response.NodesData>;
/**
 * For node selected case
 *
 * Get the extended metadata of the given single node id (which includes info needed for rendering)
 * Only a single id is accepted because the returned data includes node ancestors ids which
 * are expensive to obtain from the DB. It is also assumed that this API is only called
 * infrequently, e.g. when the user selects a node in the front-end.
 *
 * @param {RequestQueryInput.NodeExtendedData} query
 * @returns {Promise<Response.NodeExtendedData>}
 */
export declare function getNodeExtendedData(sqldb: Sqldb.DbSession, query: RequestQueryInput.NodeExtendedData): Promise<Response.NodeExtendedData>;
/**
 *  Data massaging only, no conversions or DB queries
 *
 * @param sqldb
 * @param nodeIdClient
 * @param presentationData
 * @param nodeIdDb
 * @returns {Nodes.Node}
 */
export declare function makeNodeData(sqldb: Sqldb.DbSession, nodeIdClient: string, presentationData: Sqldb.PresentationData): Promise<Nodes.Node>;
/**
 *
 * @param {string | string[]} ids
 * @returns {number[]}
 */
export declare function convertIdsForDB(ids: string | string[] | undefined): number[];
/**
 *
 * @param {number} id
 * @returns {string}
 */
export declare function convertIdForClient(id: number): string;
export declare function convertIdsForClient(ids: number[]): string[];
export declare function convertResourceRecordForClient(sqldb: Sqldb.DbSession, resourceRecordMap: Map<number, Sqldb.ResourceRecord | null>): Promise<Response.NodeExtendedData>;
