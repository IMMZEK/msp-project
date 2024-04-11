import { Mode } from './appConfig';
export declare enum ServerStatus {
    INITIALIZING = "initializing",
    UP = "up",
    READY = "ready",
    DOWN = "down"
}
export declare enum ConnectionState {
    INITIALIZING = "initalizing",
    OFFLINE = "offline",
    CONNECTED = "connected"
}
/**
 * Server state - may change during run-time (as opposed to vars.js)
 */
declare class ServerState {
    serverStatus: ServerStatus;
    useRemoteContent: boolean;
    useOfflineContent: boolean;
    connectionState: ConnectionState;
    version?: string;
    defaultContentPath?: string;
    rejected?: string;
    serverMode?: Mode;
    updateConnectionState(state: ConnectionState, config: {
        mode?: string;
    }): void;
    updateServerStatus(status: ServerStatus, config: {
        mode?: string;
    }): void;
    /**
     * serverStatus depends on connectionState; update the serverStatus for
     * the given connectionState.
     *
     * @param {ServerStatus} serverStatus
     * @param {ConnectionState} connectionState
     * @param config
     *
     */
    private _getNextServerStatusForConnectionState;
}
export declare const serverState: ServerState;
export {};
