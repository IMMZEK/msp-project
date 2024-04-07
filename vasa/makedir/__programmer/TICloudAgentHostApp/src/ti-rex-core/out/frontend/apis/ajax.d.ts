/**
 * ajax helper functions
 *
 */
export declare namespace ajax {
    /**
     * Do an HTTP GET. If the contentType is application/json parse the response as JSON.
     *
     * @param url
     * @returns Promise - resolve(response), reject(statusCode)
     */
    function get<T = string | object>(url: string): Promise<T>;
    function head<T = string | object>(url: string): Promise<T>;
}
