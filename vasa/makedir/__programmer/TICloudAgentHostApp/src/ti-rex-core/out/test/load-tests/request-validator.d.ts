import { APIs } from '../../frontend/apis/apis';
import { BrowserUrlQuery } from '../../frontend/apis/filter-types';
export interface IAPIs extends Pick<APIs, 'getNodes' | 'getExtendedNodes' | 'getFilteredChildrenNodes' | 'expandNode' | 'getSearchSuggestions'> {
}
type PromiseType<T> = T extends Promise<infer U> ? U : never;
type APIsResult<T extends keyof IAPIs> = PromiseType<ReturnType<IAPIs[T]>>[];
export declare class APIsBase {
    protected getNodesResult: APIsResult<'getNodes'>;
    protected getExtendedNodesResult: APIsResult<'getExtendedNodes'>;
    protected getFilteredChildrenNodesResult: APIsResult<'getFilteredChildrenNodes'>;
    protected getSearchSuggestionsResult: APIsResult<'getSearchSuggestions'>;
    protected readonly apis: APIs;
    constructor(getNodesResult?: APIsResult<'getNodes'>, getExtendedNodesResult?: APIsResult<'getExtendedNodes'>, getFilteredChildrenNodesResult?: APIsResult<'getFilteredChildrenNodes'>, getSearchSuggestionsResult?: APIsResult<'getSearchSuggestions'>);
    expandNode(id: string, urlQuery: BrowserUrlQuery.Params): Promise<void>;
}
declare class RequestSaver extends APIsBase implements IAPIs {
    getNodes(ids: string[]): Promise<import("../../shared/routes/response-data").Nodes.Node[]>;
    getExtendedNodes(id: string): Promise<Readonly<import("../../shared/routes/response-data").Nodes.LeafNodeExtended> | Readonly<import("../../shared/routes/response-data").Nodes.FolderNodeExtended> | Readonly<import("../../shared/routes/response-data").Nodes.FolderWithResourceNodeExtended> | Readonly<import("../../shared/routes/response-data").Nodes.PackageFolderNodeExtended>>;
    getFilteredChildrenNodes(parentIds: string[], urlQuery: BrowserUrlQuery.Params): Promise<import("../../shared/routes/response-data").Nodes.Node[][]>;
    getSearchSuggestions(text: string, urlQuery: BrowserUrlQuery.Params): Promise<import("../../shared/routes/request-response").Response.SearchSugestionsData>;
    fetchNodesResult(): import("../../shared/routes/response-data").Nodes.Node[][];
    fetchExtendedNodesResult(): (Readonly<import("../../shared/routes/response-data").Nodes.LeafNodeExtended> | Readonly<import("../../shared/routes/response-data").Nodes.FolderNodeExtended> | Readonly<import("../../shared/routes/response-data").Nodes.FolderWithResourceNodeExtended> | Readonly<import("../../shared/routes/response-data").Nodes.PackageFolderNodeExtended>)[];
    fetchFilteredChildrenNodesResult(): import("../../shared/routes/response-data").Nodes.Node[][][];
    fetchSearchSuggestionsResult(): import("../../shared/routes/request-response").Response.SearchSugestionsData[];
}
declare class RequestValidator extends APIsBase implements IAPIs {
    constructor(saver: RequestSaver);
    getNodes(ids: string[]): Promise<import("../../shared/routes/response-data").Nodes.Node[]>;
    getExtendedNodes(id: string): Promise<Readonly<import("../../shared/routes/response-data").Nodes.LeafNodeExtended> | Readonly<import("../../shared/routes/response-data").Nodes.FolderNodeExtended> | Readonly<import("../../shared/routes/response-data").Nodes.FolderWithResourceNodeExtended> | Readonly<import("../../shared/routes/response-data").Nodes.PackageFolderNodeExtended>>;
    getFilteredChildrenNodes(parentIds: string[], urlQuery: BrowserUrlQuery.Params): Promise<import("../../shared/routes/response-data").Nodes.Node[][]>;
    getSearchSuggestions(text: string, urlQuery: BrowserUrlQuery.Params): Promise<import("../../shared/routes/request-response").Response.SearchSugestionsData>;
    private validate;
}
interface Settings {
    seed: number;
    filterPercentage: number;
    searchPercentage: number;
}
export declare class APIsFactory {
    private saver;
    private settingsToValidateAgainst;
    create(settings: Settings): APIs | RequestSaver | RequestValidator;
}
export {};
