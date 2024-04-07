import { APIs } from '../../frontend/apis/apis';
import { BrowserUrlQuery } from '../../frontend/apis/filter-types';
import { ServerDataInput, NodesHarness } from '../server-harness/initialize-server-harness-data';
import { Page } from '../../shared/routes/page';
interface SetupEnzymeTestParams {
    data: ServerDataInput.NodeData | ServerDataInput.TableItemData;
}
interface SetupProtractorTestParams {
    apis: APIs;
    data: ServerDataInput.NodeData | ServerDataInput.TableItemData;
    additionalSetup?: () => Promise<void>;
    clearLocalStorage?: boolean;
    node?: NodesHarness.NodeData;
    urlQuery?: BrowserUrlQuery.Params;
}
interface LightSetupProtractorTestParams {
    apis: APIs;
    additionalSetup?: () => Promise<void>;
    node?: NodesHarness.NodeData;
    urlQuery?: BrowserUrlQuery.Params;
    page?: Page;
    customUrl?: string;
}
export declare const PROTRACTOR_TEST_TIMEOUT = 120000;
export declare function setupEnzymeTest({ data }: SetupEnzymeTestParams): Promise<void>;
export declare function cleanupEnzymeTest(): void;
export declare function setupProtractorTest({ data, apis, node, urlQuery, clearLocalStorage, additionalSetup }: SetupProtractorTestParams): Promise<void>;
/**
 * A lightweight setup.
 *   Does not refresh page & load scripts like the fake server.
 *   Clears as much from memory as needed.
 *   Useful for setting up tests within a suite which we are ok with not doing a full refresh / setup. This is much faster.
 *
 */
export declare function lightSetupProtractorTest({ apis, node, urlQuery, additionalSetup, page, customUrl }: LightSetupProtractorTestParams): Promise<void>;
export declare function cleanupProtractorTest(): Promise<void>;
export declare function logBrowserConsole(testName: string): Promise<void>;
export declare function getNodeLinkForTest(nodeInput: NodesHarness.NodeData, urlQuery: BrowserUrlQuery.Params, apis: APIs, page?: Page): Promise<string>;
export declare function getLinkForTest(urlQuery: BrowserUrlQuery.Params, page?: Page): string;
export {};
