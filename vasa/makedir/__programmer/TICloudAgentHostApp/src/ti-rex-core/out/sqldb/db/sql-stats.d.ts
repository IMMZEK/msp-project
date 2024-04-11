interface StatValues {
    time: [number, number];
    rowCount?: number;
    sqlParams: {
        nodeId: number;
        query: string;
    };
    descendantCount?: number;
}
interface SeqStatValues extends StatValues {
    seq: number;
}
export declare class SqlStats {
    private sqlStats;
    private sqlStatCounter;
    private enabled;
    resetSqlStats(): void;
    enableStatCollection(enabled: boolean): void;
    addSqlStats<T>(statName: string, statParams: T, statValues: StatValues): void;
    getSqlStats(): {
        [key: string]: {
            [key: string]: SeqStatValues[];
        };
    };
}
export {};
