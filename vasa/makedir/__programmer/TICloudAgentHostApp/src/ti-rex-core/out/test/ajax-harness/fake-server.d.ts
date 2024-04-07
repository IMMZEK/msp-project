import * as sinon from 'sinon';
import { ServerData, ServerHarness } from '../server-harness/server-harness';
import { ServerDataInput } from '../server-harness/initialize-server-harness-data';
export declare function fakeServerInit(server: sinon.SinonFakeServer, dataIn: ServerDataInput.Input, serverHarness: ServerHarness): ServerData;
