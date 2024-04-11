export declare class OverridesManager {
    private readonly overridesDir;
    constructor(overridesDir: string);
    updateOverridesFile(packageFolder: string, showEntry: boolean): Promise<void>;
    getShowEntryValues(packageFolders: string[]): Promise<boolean[]>;
    static getOveridesFilePath(packageFolder: string, overridesDir: string): string;
    getOverridesDir(): string;
}
