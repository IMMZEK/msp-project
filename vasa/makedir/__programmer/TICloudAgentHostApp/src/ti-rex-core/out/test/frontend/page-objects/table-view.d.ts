import { TableItemHarness, ServerDataInput } from '../../server-harness/initialize-server-harness-data';
export declare namespace TableView {
    /**
     * Go to the node associated with the table item. If there are multiple variants you must select one.
     *
     */
    function selectTableItemNode(tableItemId: string): Promise<void>;
    /**
     * Go to the readme of the node associated with the table item. If there are multiple variants you must select one.
     *
     */
    function selectTableItemReadme(tableItemId: string): Promise<void>;
    function importTableItem(tableItemId: string): Promise<void>;
    function selectVariant(variant: TableItemHarness.Variant): Promise<void>;
    function selectVariantOk(): Promise<void>;
    function selectVariantCancel(): Promise<void>;
    function verifyChangeFilterDisplay(message?: string): Promise<void>;
    function verifyContentDisplay(): Promise<void>;
    function verifySelectVariantDialog(): Promise<void>;
    function verifyNoSelectVariantDialog(): Promise<void>;
    function verifyVariantSelected(variant: TableItemHarness.Variant, data: ServerDataInput.TableItemData): Promise<void>;
}
