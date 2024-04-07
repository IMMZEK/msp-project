import * as sinon from 'sinon';
import { Response } from 'superagent';
import { ServerDataInput } from '../server-harness/initialize-server-harness-data';
import { Mode } from '../../lib/appConfig';
export declare enum ServerType {
    PROXY_SERVER = "proxyServer",
    FAKE_SERVER = "fakeServer"
}
export declare class AjaxHarness {
    private getElementByIdStub;
    private setupTestCalled;
    private serverMode;
    private fakeXML;
    private server;
    private serverHarness;
    private serverHarnessInner;
    /**
     * @param config The configuration settings for the ajax harness
     */
    constructor({ serverType, mode, role }: {
        serverType: ServerType;
        mode?: Mode;
        role?: string;
    });
    /**
     * Call this before running the test code with the data set you want to set with.
     *
     * @param data
     *
     * @returns {Promise} void
     */
    setupTestFakeServer(dataIn: ServerDataInput.Input): Promise<void>;
    /**
     * Call this before running the load tests.
     *
     * @param remoteserverUrl
     * @param onResponse Callback that gets passed the full response object
     *
     * @returns {Promise} void
     */
    setupTestProxyServer(remoteserverUrl: string, onResponse?: (url: string, resOrError: Response | Error, proxyResponseTime: number) => void): Promise<void>;
    getRequests(): sinon.SinonFakeXMLHttpRequest[];
    /**
     * Call this when you are done running the test
     *
     */
    cleanup(): void;
    /**
     * All the cleanup which doesn't require setupTest to be called
     *
     */
    private cleanupWithoutSetupTest;
    /**
     * All the setup which requires setupTest to be called
     *
     */
    private cleanupWithSetupTest;
}
