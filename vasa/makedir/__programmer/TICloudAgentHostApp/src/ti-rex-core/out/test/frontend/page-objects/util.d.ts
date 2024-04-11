import { ElementFinder } from 'protractor';
import { APIs } from '../../../frontend/apis/apis';
import { BrowserUrlQuery } from '../../../frontend/apis/filter-types';
import { NodesHarness } from '../../server-harness/initialize-server-harness-data';
import { Page } from '../../../shared/routes/page';
interface UpdateBrowserUrlParams {
    apis: APIs;
    urlQuery: BrowserUrlQuery.Params;
    node?: NodesHarness.NodeData;
    page?: Page;
}
interface VerifyUrlParams {
    apis: APIs;
    urlQuery: BrowserUrlQuery.Params;
    node?: NodesHarness.NodeData;
    page?: Page;
}
export declare function clickElement(element: ElementFinder): Promise<void>;
export declare const BROWSER_WAIT = 2000;
export declare function goToNode(node: NodesHarness.NodeData, apis: APIs): Promise<void>;
export declare function getItemById(items: ElementFinder[], id: string): Promise<any>;
export declare function updateBrowserUrl({ apis, urlQuery, node, page }: UpdateBrowserUrlParams): Promise<void>;
export declare function waitForPromisesAfterActionToResolve(action: () => Promise<void>): Promise<void>;
export declare function verifyUrl({ apis, urlQuery, node, page }: VerifyUrlParams): Promise<void>;
export {};
