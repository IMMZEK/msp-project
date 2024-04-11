import { AppProps } from './util';
import { Nodes, PackageData } from '../../shared/routes/response-data';
interface BaseAnalyticsData {
    agentMode: 'desktop' | 'cloud';
}
interface PackageActionAnalyticsData extends BaseAnalyticsData {
    pkg: PackageData;
}
interface NodeActionAnalyticsData extends BaseAnalyticsData {
    pkg: PackageData | null;
    node: Nodes.Node;
    nodeExtended: Nodes.NodeExtended;
    appProps: AppProps;
}
interface UrlChangeAnalyticsData extends BaseAnalyticsData {
    appProps: AppProps | null;
    nextAppProps: AppProps;
}
export declare function handlePackageDownload({ pkg, agentMode }: PackageActionAnalyticsData): Promise<void>;
export declare function handleNodeDownload({ pkg, node, nodeExtended, appProps, agentMode }: NodeActionAnalyticsData): Promise<void>;
export declare function handlePackageInstall({ pkg, agentMode }: PackageActionAnalyticsData): Promise<void>;
export declare function handleNodeImport({ pkg, node, nodeExtended, appProps, agentMode }: NodeActionAnalyticsData): Promise<void>;
export declare function handleUrlChange({ appProps, nextAppProps, agentMode }: UrlChangeAnalyticsData): Promise<void>;
export {};
