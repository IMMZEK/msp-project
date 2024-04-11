import * as sinon from 'sinon';
import { Response } from 'superagent';
/**
 * Initialize the proxy server
 *
 * @param  server
 * @param  remoteserverUrl
 * @param  onResponse Callback that gets passed the full response object
 *
 * Consider https://www.npmjs.com/package/xmlhttprequest so we don't have to handle proxy-ing requests ourselves.
 * Will need to figure out how to set the origin to remoteserver.
 */
export declare function proxyServerInit(server: sinon.SinonFakeServer, remoteserverUrl: string, onResponse?: (url: string, resOrError: Response | Error, proxyResponseTime: number) => void): void;
