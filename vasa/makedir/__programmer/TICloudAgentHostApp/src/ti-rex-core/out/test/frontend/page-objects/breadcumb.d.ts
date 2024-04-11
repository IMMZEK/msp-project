import { NodesHarness } from '../../server-harness/initialize-server-harness-data';
export declare namespace Breadcrumb {
    function clickBreadcrumbItem(item: NodesHarness.NodeData): Promise<void>;
    function verifyBreadcrumb(path: NodesHarness.NodeData[], _selectedItem: NodesHarness.NodeData): Promise<void>;
}
