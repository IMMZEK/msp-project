import { Log } from '../utils/logging';
export declare namespace VerificationHelpers {
    /**
     * Verify that the items do not exist
     *
     * @param items - A list of absolute paths to files / folders
     *
     * @returns {Promise} void
     */
    function verifyItemsDoNotExist(items: string[]): Promise<void>;
    /**
     * Verify that the items exist
     *
     * @param items - A list of absolute paths to files / folders
     *
     * @returns {Promise} void
     */
    function verifyItemsExist(items: string[]): Promise<void>;
    function verifyAssetCombinationValid(assets: {
        platform: string;
        asset: string;
    }[], log: Log): void;
    function verifyInstallerCommandValid(installCommand: {
        [platform: string]: string;
    }, log: Log): void;
    function verifyInstallerCommandInSync(installCommand: {
        [platform: string]: string;
    }, packageFolder: string, log: Log): Promise<void>;
}
