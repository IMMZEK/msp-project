import { APIs } from '../../../frontend/apis/apis';
import { BrowserUrlQuery } from '../../../frontend/apis/filter-types';
import { PackageData } from '../../../shared/routes/response-data';
export declare namespace PackageManager {
    function toggleAll(): Promise<void>;
    function toggleVersionCheckbox(packageUid: string, isLatest: boolean): Promise<void>;
    function openActionsMenu(packageUid: string): Promise<void>;
    function closeActionsMenu(packageUid: string): Promise<void>;
    function apply(): Promise<void>;
    function cancel(): Promise<void>;
    function openDetailedView(packageId: string): Promise<void>;
    function openSummaryView(): Promise<void>;
    function verifyPackageSummaryRows(expectedPackages: {
        expectedPkg: PackageData;
    }[]): Promise<void>;
    function verifyPackageDetailedRows(expectedPackages: {
        expectedPkg: PackageData;
        isLatest: boolean;
        isSelected: boolean;
        hasCheckbox: boolean;
    }[]): Promise<void>;
    function verifySelectAll(checked: boolean): Promise<void>;
    function verifyApply(expectedUrlQuery: BrowserUrlQuery.Params, apis: APIs): Promise<void>;
    function verifyCancel(expectedUrlQuery: BrowserUrlQuery.Params, apis: APIs): Promise<void>;
}
