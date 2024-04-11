/// <reference types="sinon" />
import { ServerDataInput } from '../../test/server-harness/initialize-server-harness-data';
export declare function setupFakeServer(data: ServerDataInput.Input, initialPage: string): Promise<void>;
export declare function cleanupFakeServer(): void;
export declare function getFakeServerRequests(): import("sinon").SinonFakeXMLHttpRequest[];
