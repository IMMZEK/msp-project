import { History } from 'history';
import { BrowserUrlQuery } from '../apis/filter-types';
import { Nodes } from '../../shared/routes/response-data';
import { Page, AppProps } from './util';
/**
 * For dealing with urls and links
 *
 */
/**
 * Get the default node navigation link.
 *
 */
export declare function getDefaultNodeLink({ urlQuery, page, keepFullQueryUrl, tableViewNode }: {
    urlQuery: BrowserUrlQuery.Params;
    page: Page;
    keepFullQueryUrl?: boolean;
    tableViewNode?: boolean;
}): string;
/**
 * Get the prefix for any navigation url.
 *
 */
export declare function getLinkPrefix(): string;
/**
 * Get the node navigation link for the give publicId.
 */
export declare function getNodeLink({ publicId, urlQuery, page, keepFullQueryUrl, tableViewNode }: {
    publicId: string;
    urlQuery: BrowserUrlQuery.Params;
    page: Page;
    keepFullQueryUrl?: boolean;
    tableViewNode?: boolean;
}): string;
/**
 * Get the node navigation link from the data in Nodes.Node.
 *
 */
export declare function getNodeLinkFromNode(node: Nodes.Node, appProps: AppProps, keepFullQueryUrl?: boolean, tableViewNode?: boolean): string;
/**
 * Resolve the rex3 link into a link to the node
 *
 */
export declare function getNodeLinkFromRex3Link(appProps: AppProps): Promise<string | null>;
/**
 * Get BrowserUrlQuery.Params from the browsers queryString
 *
 */
export declare function getUrlQuery(queryString: string): BrowserUrlQuery.Params;
/**
 * Update the url with the specified query.
 *
 */
export declare function updateUrl({ urlQuery, history, location, replace }: {
    urlQuery: BrowserUrlQuery.Params;
    history: History;
    location?: string;
    replace?: boolean;
}): void;
