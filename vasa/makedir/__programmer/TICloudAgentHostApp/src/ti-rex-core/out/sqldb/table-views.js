"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.TableViews = void 0;
const _ = require("lodash");
const types_1 = require("./db/types");
const tree_1 = require("./tree");
const rexError_1 = require("../utils/rexError");
const tableViewRowLimit = 3000;
class TableViews {
    db;
    tree;
    mysql;
    constructor(db, dinfraLibPath, tree) {
        this.db = db;
        this.tree = tree;
        this.mysql = require(dinfraLibPath + '/node_modules/mysql');
    }
    /**
     * Get table view items for the given node, package groups, device/devtool and filters.
     *
     * NOTE: Package groups are ignored if node is within a package.
     *
     * @param nodeId - node id, defaults to root if undefined
     * @param packageGroupIds - package group to filter items on
     * @param filters - table view filters, must include a device or devtool
     *
     * @returns table view rows
     */
    async getTableView(nodeId, packageGroupIds, filters) {
        if (filters.deviceId && filters.devtoolId) {
            // TODO: Replace with a devId; or better yet merge devices and devtools throughout
            // incl. schema
            throw new Error('Both deviceId and devtoolId are provided');
        }
        else if (!filters.deviceId && !filters.devtoolId) {
            throw new Error('Neither deviceId or devtoolId is provided');
        }
        let node;
        if (nodeId) {
            // If the node's id is given, then try to get it from the set of foundations nodes
            node = (await this.tree.getFoundationNodes())[nodeId];
        }
        else {
            // Otherwise use the root node
            node = await this.tree.getRootNode();
            nodeId = node.id;
        }
        if (node) {
            // We've got a foundation node.
            // Get the package subtree head nodes that are descendants of the given foundation
            // node, belong to the given package groups and that contain resource groups assigned
            // the given device/devtool
            const headsWithTheDev = await this.getHeadNodesWithResourceGroups(node, packageGroupIds, filters);
            // Then query for the table view items on and under each subtree head node and return
            // all of them (up to the table-view-item limit)
            const items = [];
            for (const head of headsWithTheDev) {
                items.push(...(await this.getTableViewItemsOnPackageNode(head.id, filters, head.contentSourceId)));
                if (_.size(items) >= tableViewRowLimit) {
                    // We've hit the limit, skip any remaining tree heads and return just those
                    // table view items retrieved so far
                    break;
                }
            }
            return items;
        }
        else {
            // We've got a package group node.
            // Query for all table view items on and under the node and return all of them (up to
            // the table-view-item limit)
            const packageGroupId = await this.getNodePackageGroupId(nodeId);
            return this.getTableViewItemsOnPackageNode(nodeId, filters, packageGroupId);
        }
    }
    /**
     * Get available table view filters for the given node, package groups, device/devtool and
     * selected filters.
     *
     * NOTE: Package groups are ignored if node is within a package.
     *
     * @param nodeId - node id, defaults to root if undefined
     * @param packageGroupIds - package group to filter on
     * @param filters - table view filter, must include a device or devtool
     *
     * @returns available filters
     */
    async getAvailableTableViewFilters(nodeId, packageGroupIds, filters) {
        if (filters.deviceId && filters.devtoolId) {
            throw new Error('Both deviceId and devtoolId are provided');
        }
        else if (!filters.deviceId && !filters.devtoolId) {
            throw new Error('Neither deviceId or devtoolId is provided');
        }
        let node;
        if (nodeId) {
            // If the node's id is given, then try to get it from the set of foundations nodes
            node = (await this.tree.getFoundationNodes())[nodeId];
        }
        else {
            // Otherwise use the root node
            node = await this.tree.getRootNode();
            nodeId = node.id;
        }
        if (node) {
            // We've got a foundation node.
            // Get the package subtree head nodes that are descendants of the given foundation
            // node, belong to the given package groups and that contain resource groups assigned
            // the given device/devtool
            // Then query for and return the union of all available table view filters assigned to
            // table view items on and under each subtree head node.
            const headsWithTheDev = await this.getHeadNodesWithResourceGroups(node, packageGroupIds, filters);
            const allAvailableFilters = {
                kernels: [],
                compilers: []
            };
            for (const head of headsWithTheDev) {
                const availableFilters = await this.getAvailableTableViewFiltersOnPackageNode(head.id, filters, head.contentSourceId);
                allAvailableFilters.kernels = _.union(allAvailableFilters.kernels, availableFilters.kernels);
                allAvailableFilters.compilers = _.union(allAvailableFilters.compilers, availableFilters.compilers);
            }
            return allAvailableFilters;
        }
        else {
            // We've got a package group node.
            // Query for and return all available table view filters assigned to table view items
            // on and under the node.
            const packageGroupId = await this.getNodePackageGroupId(nodeId);
            return this.getAvailableTableViewFiltersOnPackageNode(nodeId, filters, packageGroupId);
        }
    }
    /**
     * Get node for the given table view group, device/devtool, and variant.
     *
     * @param tableViewGroupId -- id of table view group
     * @param dev - id of device or devtool
     * @param variant - the variant
     *
     * @returns table view node
     */
    async getNode(tableViewItemId, dev, variant) {
        if (dev.deviceId && dev.devtoolId) {
            // TODO: Replace with a devId; or better yet merge devices and devtools throughout
            // incl. schema
            throw new Error('Both deviceId and devtoolId are provided');
        }
        else if (!dev.deviceId && !dev.devtoolId) {
            throw new Error('Neither deviceId or devtoolId is provided');
        }
        const devIdQArg = dev.deviceId || dev.devtoolId;
        const compilerQArg = (0, types_1.compilerToDb)(variant.compiler);
        const kernelQArg = (0, types_1.kernelToDb)(variant.kernel);
        const rows = await this.db.simpleQuery('get-node-on-tableview', `select n.* ` +
            `from ${this.db.tables.nodes} n ` +
            `  join ${this.db.tables.resourceGroupNodes} gn on gn.node_id = n.id ` +
            `where ` +
            `  gn.resource_group_id = ? ` +
            `  and gn.is_devtool = ${dev.devtoolId ? '1' : '0'} and gn.dev_id = ? ` +
            `  and gn.compiler ${this.db.nullSafeSqlComparison(compilerQArg)} ` +
            `  and gn.kernel ${this.db.nullSafeSqlComparison(kernelQArg)} `, [tableViewItemId, devIdQArg]);
        return _.isEmpty(rows) ? undefined : (0, tree_1.rowToPresentationNode)(rows[0]);
    }
    /**
     * Retrieve the package subtree head nodes that are descendants of the given foundation node,
     * belong to the given package groups and that contain resource groups assigned the given
     * device/devtool.
     *
     * @param foundationNode - foundation node
     * @param packageGroupIds - package groups ids to filter on
     * @param devFilters - device or devtool id to filter on
     * @returns
     */
    async getHeadNodesWithResourceGroups(foundationNode, packageGroupIds, devFilters) {
        // Get the foundation node's package subtree head nodes, filtered on the given package
        // groups
        const headNodes = _.reduce(this.tree.getChildrenAndSubtreeHeads(foundationNode, packageGroupIds), (accum, child) => [...accum, ...child.heads], []);
        // Reduce head nodes to just those with the given device/devtool. This is done as an
        // optimization to reduce the number of head nodes, as one query will be needed later for
        // each head node.
        const devId = devFilters.deviceId || devFilters.devtoolId;
        const headNodeIds = _.map(headNodes, (h) => h.id);
        const idsOfHeadNodesWithTheDev = _.map(await this.db.simpleQuery('get-head-nodes-with-dev', `select distinct(ndg.node_id) node_id ` +
            `from ${this.db.tables.nodeDevResourceGroups} ndg ` +
            `where ndg.node_id in ( ? ) ` +
            `  and ndg.is_devtool = ${devFilters.devtoolId ? '1' : '0'} ` +
            `  and ndg.dev_id = ? `, [headNodeIds, devId]), (row) => row.node_id);
        return _.filter(headNodes, (head) => _.includes(idsOfHeadNodesWithTheDev, head.id));
    }
    /**
     * Retrieve the id of the given node's package group.
     */
    async getNodePackageGroupId(nodeId) {
        const rows = await this.db.simpleQuery('get-package-group-id-of-node', `select content_source_id from ${this.db.tables.nodes} where id = ?`, [nodeId]);
        if (_.isEmpty(rows)) {
            throw new rexError_1.RexError(`node not found: id: ${nodeId}`);
        }
        const packageGroupId = rows[0].content_source_id;
        if (!packageGroupId) {
            throw new rexError_1.RexError(`package group not found: node id: ${nodeId}`);
        }
        return packageGroupId;
    }
    async getTableViewItemsOnPackageNode(nodeId, filters, packageGroupId) {
        const devId = filters.deviceId ? filters.deviceId : filters.devtoolId;
        const tableViewQuery = this.mysql.format(`select g.id, g.resource_grp, g.cat_context, g.resource_type, g.resource_subclass, ` +
            `  g.name, g.short_descr, g.file_type, g.package_id, g.link_ext, g.link_type, ` +
            `  g.icon, g.view_limitations, ` +
            `  group_concat(` +
            `    distinct concat(ifnull(gn2.compiler,0), ifnull(gn2.kernel,0))) variants, ` +
            `  bit_or(gn2.has_readme) has_readme, ` +
            `  bit_or(gn2.has_children) has_children ` +
            `from ${this.db.tables.resourceGroups} g ` +
            // Join on resource-group-nodes to restrict resource groups to only those with
            // variants that match the given filters
            `  join ${this.db.tables.resourceGroupNodes} gn ` +
            `    on gn.resource_group_id = g.id ` +
            // Join again to narrow on filters
            `  join ${this.db.tables.nodeDevResourceGroups} ndg ` +
            `    on ndg.resource_group_id = gn.resource_group_id ` +
            // Join on resource-group-nodes a second time to get *all* of the variants (and not
            // just those that the filters apply to) belonging to the resource groups remaining
            // after filtering
            `  join ${this.db.tables.resourceGroupNodes} gn2 ` +
            `    on gn2.resource_group_id = g.id ` +
            (await this.tree.buildFilterSqlClauses('resource', 'gn.resource_id', false, _.omit(filters, ['deviceId', 'devtoolId']), // dev filtering on gn instead
            [packageGroupId])).fromClauses +
            ` ` +
            `where ` +
            // Clauses on ndg used to narrow res-groups to given node and dev
            `  ndg.node_id = ? ` +
            `  and ndg.is_devtool = ${filters.devtoolId ? '1' : '0'} and ndg.dev_id = ? ` +
            // Clauses on gn used to narrow variants to given dev
            `  and gn.is_devtool = ${filters.devtoolId ? '1' : '0'} and gn.dev_id = ? ` +
            `group by g.id ` +
            `limit ${this.mysql.escape(tableViewRowLimit)}`, [nodeId, devId, devId]);
        // The MySQL Query Optimizer chooses a FirstMatch semijoin strategy over a Duplicate
        // Weedout semijoin strategy when optimizing table view queries with two or more keywords,
        // resulting in a far less than optimal join sequence, and a 3 order of magnitude drop in
        // performance (25ms => 15s). To workaround this, the FirstMatch Semijoin strategy is
        // temporarily disabled.
        // Decrease optimizer_search_depth as query optimization otherwise takes too long as number
        // of filters increase, slowing down exponentially with each additional filter.
        // FUTURE: It should be possible to replace these with optimizer hints with MySQL 5.7+
        const rows = await this.db.simpleQuery('get-tableview-items', `set optimizer_switch = 'firstmatch=off'; ` +
            `set optimizer_search_depth = 4; ` +
            tableViewQuery +
            `; ` +
            `set optimizer_switch = 'firstmatch=on'; ` +
            `set optimizer_search_depth = default`, undefined, 2);
        return _.map(rows, (row) => ({
            id: row.id,
            name: row.name,
            resourceType: row.resource_type,
            subClass: row.resource_subclass,
            fileType: row.file_type,
            linkExt: row.link_ext ? '.' + row.link_ext : undefined,
            linkType: row.link_type ? (row.link_type === 'l' ? 'local' : 'external') : undefined,
            icon: row.icon,
            shortDescription: row.short_descr,
            viewLimitations: ((0, types_1.recomposeStringArray)(row.view_limitations) || undefined),
            categoryContext: row.cat_context || undefined,
            packageId: row.package_id,
            variants: _.map(_.split(row.variants, ','), (s) => ({
                // For now at least variant compiler and kernel should always be defined. This will
                // likely change though if we expand table view support beyond Examples to
                // Documents or other types.
                compiler: (0, types_1.dbToCompiler)(s[0]),
                kernel: (0, types_1.dbToKernel)(s[1])
            })),
            hasReadme: row.has_readme ? true : false,
            hasChildren: row.has_children ? true : false
        }));
    }
    async getAvailableTableViewFiltersOnPackageNode(nodeId, filters, packageGroupId) {
        const devId = filters.deviceId ? filters.deviceId : filters.devtoolId;
        const tableViewQuery = this.mysql.format(`select group_concat(distinct gn.compiler) compilers, ` +
            `  group_concat(distinct gn.kernel) kernels ` +
            `from ${this.db.tables.resourceGroups} g ` +
            `  join ${this.db.tables.resourceGroupNodes} gn ` +
            `    on gn.resource_group_id = g.id ` +
            `  join ${this.db.tables.nodeDevResourceGroups} ndg ` +
            `    on ndg.resource_group_id = gn.resource_group_id ` +
            (await this.tree.buildFilterSqlClauses('resource', 'gn.resource_id', false, _.omit(filters, ['deviceId', 'devtoolId']), // dev filtering on gn instead
            [packageGroupId])).fromClauses +
            ` ` +
            `where ` +
            // Clauses on ndg used to narrow res-groups to given node and dev
            `  ndg.node_id = ? ` +
            `  and ndg.is_devtool = ${filters.devtoolId ? '1' : '0'} and ndg.dev_id = ? ` +
            // Clauses on gn used to narrow variants to given dev
            `  and gn.is_devtool = ${filters.devtoolId ? '1' : '0'} and gn.dev_id = ? ` +
            `group by g.id `, [nodeId, devId, devId]);
        // TODO!! TP Verify that this is necessary here (I believe it is), and update the following
        // comment that actually refers to a similar but different query (the performance
        // improvement may be even greater in this case)
        // The MySQL Query Optimizer chooses a FirstMatch semijoin strategy over a Duplicate
        // Weedout semijoin strategy when optimizing table view queries with two or more keywords,
        // resulting in a far less than optimal join sequence, and a 3 order of magnitude drop in
        // performance (25ms => 15s). To workaround this, the FirstMatch Semijoin strategy is
        // temporarily disabled.
        // Decrease optimizer_search_depth as query optimization otherwise takes too long as number
        // of filters increase, slowing down exponentially with each additional filter.
        // FUTURE: It should be possible to replace these with optimizer hints with MySQL 5.7+
        const rows = await this.db.simpleQuery('get-tableview-items', `set optimizer_switch = 'firstmatch=off'; ` +
            `set optimizer_search_depth = 4; ` +
            tableViewQuery +
            `; ` +
            `set optimizer_switch = 'firstmatch=on'; ` +
            `set optimizer_search_depth = default`, undefined, 2);
        return _.isEmpty(rows)
            ? {
                kernels: [],
                compilers: []
            }
            : {
                kernels: _.map(_.split(rows[0].kernels, ','), (k) => (0, types_1.dbToKernel)(k)),
                compilers: _.map(_.split(rows[0].compilers, ','), (c) => (0, types_1.dbToCompiler)(c))
            };
    }
}
exports.TableViews = TableViews;
