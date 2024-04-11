export declare const conflictResolvers: {
    ask: string;
    skip: string;
    overwrite: string;
};
export declare function mergeDirs(src: string, dest: string, conflictResolver?: string, move?: boolean): Promise<void>;
