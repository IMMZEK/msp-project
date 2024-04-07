import { APIs } from '../../../frontend/apis/apis';
import { NodesHarness } from '../../server-harness/initialize-server-harness-data';
export declare namespace NodeContextMenu {
    function openInstall(node: NodesHarness.NodeData, apis: APIs): Promise<void>;
    function openUninstall(node: NodesHarness.NodeData, apis: APIs): Promise<void>;
    function openManageVersions(node: NodesHarness.NodeData, apis: APIs): Promise<void>;
    function openDownload(node: NodesHarness.NodeData, apis: APIs): Promise<void>;
    function openImport(node: NodesHarness.NodeData, apis: APIs): Promise<void>;
    function openContextMenu(nodeDbId: string): Promise<void>;
    function verifyDialogOpen(): Promise<void>;
}
