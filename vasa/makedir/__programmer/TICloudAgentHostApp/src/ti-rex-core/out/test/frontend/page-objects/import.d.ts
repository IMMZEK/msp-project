export declare namespace Import {
    function selectTargetRadio(targetId: string): Promise<void>;
    function apply(): Promise<void>;
    function cancel(): Promise<void>;
    function install(): Promise<void>;
    function cancelInstall(): Promise<void>;
    function clickImport(): Promise<void>;
    function cancelImport(): Promise<void>;
    function verifySelectTargetDialog(): Promise<void>;
    function verifyPackageMissingDialog(): Promise<void>;
    function verifyImportConfirmationDialog(): Promise<void>;
}
