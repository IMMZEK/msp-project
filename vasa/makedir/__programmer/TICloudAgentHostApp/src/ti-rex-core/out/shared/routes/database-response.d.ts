export interface DatabaseResponse<T> {
    payload: T;
    sideBand: {
        sessionId: string;
    };
}
