import { PackageData } from '../../../shared/routes/response-data';
import { Options } from '../../../frontend/mock-agent/util';
export declare namespace Install {
    /**
     * Use version if it's local / remote, use range if it is unavailable
     *
     */
    function togglePackageCheckbox(packageId: string, versionRange: string): Promise<void>;
    function next(): Promise<void>;
    function cancel(): Promise<void>;
    function verifyInstallDialogOpen(): Promise<void>;
    function verifyInstallPathsDropdownOpen(): Promise<void>;
    function verifyPackageRows(pkg: PackageData, options: Options, allPackages: PackageData[], unsupported?: {
        [packagePublicUid: string]: boolean;
    }): Promise<void>;
    function verifyInstallPaths(options: Options): Promise<void>;
    function verifyInstallConfirmation(): Promise<void>;
    function verifyNoInstallConfirmation(): Promise<void>;
    function verifyNext(): Promise<void>;
    function verifyNoNext(): Promise<void>;
}
