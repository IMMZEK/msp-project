export declare function doGetRequest<T>(url: string, json?: boolean): Promise<{
    data: T;
    statusCode: number;
}>;
export declare function doPostRequest<T>(url: string, body: object, json?: boolean): Promise<{
    data: T;
    statusCode: number;
}>;
export declare function doFormDataPostRequest<T>(url: string, body: object, json?: boolean): Promise<{
    data: T;
    statusCode: number;
}>;
export declare function doDeleteRequest<T>(url: string, json?: boolean): Promise<{
    data: T;
    statusCode: number;
}>;
