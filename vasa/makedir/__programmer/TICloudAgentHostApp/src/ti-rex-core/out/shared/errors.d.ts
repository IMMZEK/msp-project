import { ExtendableError } from 'ts-error';
export declare class NetworkError extends ExtendableError {
    readonly statusCode: string;
    constructor(message: string, statusCode: string);
}
export declare class SessionIdError extends ExtendableError {
}
export declare class GracefulError extends ExtendableError {
}
export declare class CloudAgentError extends ExtendableError {
}
export declare class ErrorWithLog extends ExtendableError {
    readonly logFile: string;
    constructor(message: string, statusCode: string);
}
