"use strict";
// tslint:disable:member-ordering
Object.defineProperty(exports, "__esModule", { value: true });
exports.rowToPresentationNode = exports.Tree = void 0;
const _ = require("lodash");
const util_1 = require("../shared/util");
const types_js_1 = require("./db/types.js");
const rexError_1 = require("../utils/rexError");
// TODO: Move these to config
const MAX_KEYWORD_SEARCH = 8;
const NODE_COUNT_LIMIT = 1000;
const INVALID_CHUNK_CHARS_REGEX = /([^a-z0-9]+)/g;
let metricsEnabled = false;
class Tree {
    db;
    static LATEST_VERSION = 'LATEST';
    mysql;
    initialized = false;
    foundationNodes = {};
    treeTopNodes = {}; // foundation and content nodes
    rootNode = null;
    queryMetrics = {};
    constructor(db, dinfraLibPath) {
        this.db = db;
        this.mysql = require(dinfraLibPath + '/node_modules/mysql');
    }
    reset() {
        this.initialized = false;
        this.foundationNodes = {};
        this.treeTopNodes = {};
        this.rootNode = null;
    }
    resetMetrics() {
        this.queryMetrics = {};
    }
    getMetrics() {
        return this.queryMetrics;
    }
    enableMetrics(enable) {
        metricsEnabled = enable;
    }
    /**
     * Initialize and populate caches.
     */
    async init() {
        // TODO: Should instead be done in new create() func that replaces instance()
        if (!this.initialized) {
            this.rootNode = null;
            this.foundationNodes = {};
            this.treeTopNodes = {};
            // Get root node row
            const rows = await this.db.simpleQuery('get-tree-root', `select * from ${this.db.tables.nodes} where parent_id is null`);
            if (!_.isEmpty(rows)) {
                // Create and cache root node
                this.rootNode = rowToTopNode(rows[0]);
                this.rootNode.descendantContentHeads = [];
                // Retrieve and cache foundation nodes and content subtree head nodes
                this.foundationNodes[this.rootNode.id] = this.rootNode;
                await this.addFoundationAndContentHeadChildren(this.rootNode);
                this.initialized = true;
            }
        }
    }
    /**
     * Is tree empty?
     */
    async isEmpty() {
        if (!this.initialized) {
            await this.init();
        }
        return this.rootNode == null;
    }
    /**
     * Get root node id
     */
    async getTreeRootId() {
        if (!this.initialized) {
            await this.init();
        }
        return this.rootNode ? this.rootNode.id : undefined;
    }
    /**
     * Get node package tree, consisting of just foundation nodes and top-level package-overview
     * nodes.
     *
     * @param nodeId - the node's id
     * @returns ids of the node's foundation and package node
     */
    async getNodePackageTree() {
        if (!this.initialized) {
            await this.init();
        }
        return this.getNodePackageSubTree(this.rootNode);
    }
    getNodePackageSubTree(node) {
        return {
            ...this.nodeToPackageTreeNode(node),
            children: [
                ..._.chain(node.children)
                    .filter(isOrHasPackageOverviewDescendant)
                    // uniqBy() and orderBy() are used to filter out all package overviews except
                    // for the latest. orderBy() is used to put the latest package group versions
                    // first so that they are retained by uniqBy (which discards all duplicates
                    // except for the first).
                    .orderBy(['isFoundation', 'packageGroupPublicId', 'packageGroupVersion'], ['desc', 'asc', 'desc'])
                    .uniqBy((node) => (node.isFoundation ? node.id : node.packageGroupPublicId))
                    .map((node) => this.getNodePackageSubTree(node))
                    .value(),
                ..._.map(
                // exclude nodes with restricted packages
                _.filter(node.nestedPackageOverviews, (o) => !o.packageRestrictions), 
                // node.nestedPackageOverviews,
                (node) => this.nodeToPackageTreeNode(node))
            ]
        };
        function isOrHasPackageOverviewDescendant(node) {
            return ((node.resourceType === 'packageOverview' && !node.packageRestrictions) ||
                // node.resourceType === 'packageOverview' ||
                !_.isEmpty(_.filter(node.nestedPackageOverviews, (o) => !o.packageRestrictions)) ||
                // !_.isEmpty(node.nestedPackageOverviews) ||
                _.some(node.children, (child) => isOrHasPackageOverviewDescendant(child)));
        }
    }
    /**
     * Get node's children, optionally filtered
     *
     * @param nodeId - the node's id
     * @param packageGroupIds - array of package group ids, to filter on
     * @param filters - filters to apply
     *
     * @returns node's children ids
     */
    async getNodeChildren(nodeId, packageGroupIds, filters) {
        if (!this.initialized) {
            await this.init();
        }
        const callStart = process.hrtime();
        let q1Time = null;
        const q2Time = null;
        let childNodeIds;
        const foundationNode = this.foundationNodes[nodeId];
        if (foundationNode) {
            let childNodes;
            // The node is a Foundation Node. So we need to take a look at each of the child's
            // content heads to determine which match the given Package ID Sets and Filters
            // Get the foundation node's children and each child's package subtree heads, filtered
            // by the given package groups.
            const childrenAndTheirHeads = this.getChildrenAndSubtreeHeads(foundationNode, packageGroupIds);
            if (!_.isEmpty(filters)) {
                // Query DB to get subset of children whose head nodes that match filter.
                // TODO: Consider doing these in parallel using multiple mysql connections.
                // Individually query on each child node, for the existence of any content
                // nodes to which the given filters apply. Add all that are found to the
                // filtered child list.
                childNodes = [];
                for (const childNodeAndHeads of childrenAndTheirHeads) {
                    // Get the IDs of the child node's head nodes.
                    const headNodeIds = [];
                    let headNodePackageGroupIds = [];
                    childNodeAndHeads.heads.forEach((head) => {
                        headNodeIds.push(head.id);
                        headNodePackageGroupIds.push(head.contentSourceId);
                    });
                    headNodePackageGroupIds = _.uniq(headNodePackageGroupIds);
                    // Perform query
                    // TODO!: Improve performance by breaking up query into one per package group.
                    // May be able to do this simply using multiple or'd where clauses...
                    const filterSqlClauses = await this.buildFilterSqlClauses('node', 'n.id', false, filters, headNodePackageGroupIds);
                    // TODO!: Set optimizer_search_depth for all similar queries; fine for now as
                    // none of the others are being used at this time. Best to generalize this.
                    // Maybe even set it before all groups of queries just in case it wasn't reset
                    // to default afterwards somehow.
                    // Lower optimizer_search_depth as query optimization otherwise takes too long
                    // at 5 filters (0.13s), slowing down exponentially past that (2.8s at 6
                    // filters, 83s at 7)
                    const queryStatement = `set optimizer_search_depth = 4; ` +
                        this.mysql.format(`select exists( ` +
                            `  select 1 ` +
                            `  from ${this.db.tables.nodes} n ` +
                            `    ${filterSqlClauses.fromClauses} ` +
                            `  where n.id in ( ? ) ` +
                            `  limit 1 ` +
                            `) matches`, [headNodeIds]) +
                        `; ` +
                        `set optimizer_search_depth = default`;
                    // TODO: [REX-2235] Move this and other sql tracing and benchmarking
                    // into DB
                    const startQ1 = process.hrtime();
                    const rows = await this.db.simpleQuery('do-child-heads-match', queryStatement, undefined, 1);
                    q1Time = process.hrtime(startQ1);
                    this.db.sqlStats.addSqlStats('QGetNodeChildrenHeadsMatch' + filterSqlClauses.statNameSuffix, filterSqlClauses.statParams, {
                        time: q1Time,
                        rowCount: rows.length,
                        sqlParams: {
                            nodeId,
                            query: queryStatement
                        }
                    });
                    if (rows[0].matches) {
                        childNodes.push(childNodeAndHeads.child);
                    }
                }
            }
            else {
                // We already have everything we need, no need to query the database.
                // Just add all of the child nodes.
                childNodes = _.map(childrenAndTheirHeads, (o) => o.child);
            }
            // Create a list of the child node ids sorted by name
            // There is no need to sort by package-specific order fields at this level because all
            // children are either other foundation nodes or package tree heads.
            childNodes.sort((n1, n2) => {
                const s1 = n1.name.toLowerCase();
                const s2 = n2.name.toLowerCase();
                return s1 > s2 ? 1 : s1 < s2 ? -1 : 0;
            });
            childNodeIds = _.map(childNodes, (node) => node.id);
        }
        else {
            // Node is a Content Node. We don't have to worry about package groups
            // at this point, because the node and all of its descendants belong to
            // the same package group; and since the caller has the node, the
            // package group must be in its package group set.
            // Get node's children
            // Lower optimizer_search_depth as query optimization otherwise takes too long
            // at 5 filters (0.13s), slowing down exponentially past that (2.8s at 6 filters,
            // 83s at 7)
            let queryStatements = 'set optimizer_search_depth = 4; ';
            let filterSqlClauses;
            if (!_.isEmpty(filters)) {
                // Get node's package group
                const packageGroupId = await this.getNodePackageGroupId(nodeId);
                // Build SQL clauses from filters
                filterSqlClauses = await this.buildFilterSqlClauses('node', 'n.id', false, filters, [packageGroupId]);
            }
            queryStatements +=
                `select distinct n.id, ` +
                    // Only sort on implicit order (which is based on the physical order of the node's
                    // resource within metadata) if a) manual sort; or b) default sort and file node
                    `  if(n.parent_sort = 'm' or ` +
                    `      (n.parent_sort = 'd' and n.is_leaf), ` +
                    `    n.implicit_order, ` +
                    `    null ` +
                    `  ) orderi ` +
                    `from ${this.db.tables.nodes} n ` + // the child nodes
                    `  ${(filterSqlClauses && filterSqlClauses.fromClauses) || ''} ` + // filter joins
                    `where n.parent_id = ? ` + // the node's children
                    `order by n.leaf_order, n.custom_order is null, n.custom_order, ` +
                    `  orderi is null, orderi, n.name; `;
            queryStatements += 'set optimizer_search_depth = default';
            const startQ1 = process.hrtime();
            const rows = await this.db.simpleQuery('get-node-children', queryStatements, [nodeId], 1);
            q1Time = process.hrtime(startQ1);
            this.db.sqlStats.addSqlStats('QGetNodeChildrenOfContentNode' +
                (filterSqlClauses ? filterSqlClauses.statNameSuffix : 'Unfiltered'), filterSqlClauses ? filterSqlClauses.statParams : null, {
                time: q1Time,
                rowCount: rows.length,
                sqlParams: {
                    nodeId,
                    query: queryStatements
                }
            });
            // Build child node list and pass pack to caller.
            childNodeIds = _.map(rows, (row) => row.id);
        }
        // Add metrics
        if (metricsEnabled) {
            const callTime = process.hrtime(callStart);
            // TODO: Breaking metrics on devtool/device filtering, now that it's expanded
            // beyond that; need to revisit
            let devFilter;
            devFilter = 'BROKE';
            // Get the call metrics for the queried node and filter; add if first time
            let filterCallMetrics = this.queryMetrics[devFilter];
            if (filterCallMetrics === undefined) {
                filterCallMetrics = {};
                this.queryMetrics[devFilter] = filterCallMetrics;
            }
            let nodeCallMetrics = filterCallMetrics[nodeId];
            if (nodeCallMetrics === undefined) {
                nodeCallMetrics = {
                    calls: [],
                    nodeInfo: {
                        childCount: childNodeIds.length
                    }
                };
                filterCallMetrics[nodeId] = nodeCallMetrics;
            }
            // Create metrics object for this call and add it to the metrics for all
            // calls on this node.
            const callMetrics = {
                callTime,
                q1Time,
                q2Time
            };
            nodeCallMetrics.calls.push(callMetrics);
        }
        return childNodeIds;
    }
    /**
     * Get node's descendant count, optionally filtered
     * @param nodeId - the node's id
     * @param packageGroupIds - array of package group ids, to filter on
     * @param filters  filters to apply
     * @returns node's decendant count
     */
    async getNodeDescendantCount(nodeId, packageGroupIds, filters) {
        if (!this.initialized) {
            await this.init();
        }
        const foundationNode = this.foundationNodes[nodeId];
        if (foundationNode) {
            // The node is a foundational node. So we need to get its descendants'
            // content heads that match the given Package ID Sets and Filters.
            // And then sum each content head's descendant count.
            let totalDescendantCount = 0;
            const contentHeads = this.getContentHeadsBelongingToPackageGroups(foundationNode, packageGroupIds);
            if (!_.isEmpty(filters)) {
                // TODO: Consider doing these in parallel using multiple mysql connections?
                // Individually query each head node for its descendant count, until
                // the done or the sum reached the count limit..
                for (const head of contentHeads) {
                    // Query for content node descendant coutns
                    const filterSqlClauses = await this.buildFilterSqlClauses('node', this.mysql.escape(head.id), true, filters, [head.contentSourceId]);
                    const maxCount = NODE_COUNT_LIMIT - totalDescendantCount;
                    const queryStatement = `select count(*) child_count ` +
                        `from ( ` +
                        `    select distinct node_id ` +
                        `    from ${filterSqlClauses.fromClauses} ` +
                        `    where ${filterSqlClauses.whereClauses} ` +
                        `    limit ${this.mysql.escape(maxCount)} ` +
                        `) x`;
                    const startQ1 = process.hrtime();
                    const rows = await this.db.simpleQuery('get-descendant-count', queryStatement);
                    const q1Time = process.hrtime(startQ1);
                    this.db.sqlStats.addSqlStats('QGetNodeDescendantCount' + filterSqlClauses.statNameSuffix, filterSqlClauses.statParams, {
                        time: q1Time,
                        descendantCount: rows[0].child_count,
                        sqlParams: {
                            nodeId: head.id,
                            query: queryStatement
                        }
                    });
                    // Add count to total count, and abort if we've reached the limit.
                    totalDescendantCount += rows[0].child_count;
                    if (totalDescendantCount >= NODE_COUNT_LIMIT) {
                        return totalDescendantCount;
                    }
                }
            }
            else {
                // No need to query the DB, as all the content head nodes are already
                // loaded including their pre-calculated unfiltered descendant counts.
                // So just need to get the sum of the individual nodes' descendant counts.
                totalDescendantCount = 0;
                contentHeads.forEach((head) => {
                    totalDescendantCount += head.descendantCount;
                });
            }
            return totalDescendantCount;
        }
        else {
            // Node is a Content Node. We don't have to worry about the package groups at
            // this point, because the node and its all of its descendants belong to the
            // same package group; and since we have the node, the package group must be
            // in our package group group.
            let queryStatement;
            let filterSqlClauses;
            if (!_.isEmpty(filters)) {
                // Get the node's filtered descendant count, up to the count limit.
                // Get node's package group
                const packageGroupId = await this.getNodePackageGroupId(nodeId);
                // Build SQL clauses from filters
                filterSqlClauses = await this.buildFilterSqlClauses('node', this.mysql.escape(nodeId), true, filters, [packageGroupId]);
                queryStatement = this.mysql.format(`select count(*) descendant_count ` +
                    `from ( ` +
                    `    select distinct node_id ` +
                    `    from ${filterSqlClauses.fromClauses} ` +
                    `    where ${filterSqlClauses.whereClauses} ` +
                    `    limit ${NODE_COUNT_LIMIT} ` +
                    `) x`, [nodeId]);
            }
            else {
                // Get the node's pre-calculated unfiltered descendant count from DB.
                queryStatement =
                    `select descendant_count ` +
                        `from ${this.db.tables.nodes} where id = ${this.mysql.escape(nodeId)}`;
            }
            const startQ = process.hrtime();
            const rows = await this.db.simpleQuery('get-node-descendant-count', queryStatement);
            const descendantCount = rows[0].descendant_count;
            const qTime = process.hrtime(startQ);
            this.db.sqlStats.addSqlStats('QGetNodeDescendantCount' +
                (filterSqlClauses ? filterSqlClauses.statNameSuffix : 'Unfiltered'), filterSqlClauses ? filterSqlClauses.statParams : null, {
                time: qTime,
                descendantCount,
                sqlParams: { nodeId, query: queryStatement }
            });
            return descendantCount;
        }
    }
    /**
     * Get node's parent
     *
     * @param nodeId - the node's id
     * @returns parent node id
     */
    async getNodeParent(nodeId) {
        if (!this.initialized) {
            await this.init();
        }
        // Check locally cached foundation and content head nodes first.
        const node = this.treeTopNodes[nodeId];
        if (node) {
            return node.parentId;
        }
        else {
            // Not cached. Need to query DB for node's parent ID.
            const rows = await this.db.simpleQuery('get-node-parent', `select parent_id from ${this.db.tables.nodes} where id = ?`, [
                nodeId
            ]);
            if (_.isEmpty(rows)) {
                throw new rexError_1.RexError(`getNodeParent: node not found: id: ${nodeId}`);
            }
            return rows[0].parent_id;
        }
    }
    /**
     * Get node's ancestor IDs, in distant-to-near order (i.e. root first, parent last)
     *
     * @param nodeId - the node's id
     * @returns ancestor node ids
     */
    async getNodeAncestors(nodeId) {
        if (!this.initialized) {
            await this.init();
        }
        // Check locally cached foundation and content head nodes first.
        const node = this.treeTopNodes[nodeId];
        if (node) {
            // Node is cached (and by extension so are all of its ancestors), so no need
            // to query DB. Build ancestor ID list by climbing up tree from node.
            const ancestorIds = [];
            let parent = node.parent;
            while (parent) {
                ancestorIds.unshift(parent.id);
                parent = parent.parent;
            }
            return ancestorIds;
        }
        else {
            // Not cached. Need to query DB for node's ancestors IDs.
            return (await this.db.simpleQuery('get-node-ancestors', `select ancestor_node_id ` +
                `from ${this.db.tables.nodeAncestors} ` +
                `where node_id = ? ` +
                `order by 1`, [nodeId])).map((row) => row.ancestor_node_id);
        }
    }
    /**
     * Get presentation attributes for the given node IDs
     *
     * @param nodeIds - array of node IDs
     * @returns array of node presentation info; in the same order as nodeIds
     */
    async getNodePresentation(nodeIds) {
        if (_.isEmpty(nodeIds)) {
            return [];
        }
        const rows = await this.db.simpleQuery('get-node-presentation', `select ` +
            ` n.id, n.public_id_w0, n.public_id_w1, n.name, n.content_source_id, n.is_leaf, ` +
            ` n.resource_type, n.file_type, n.package_id, n.link_ext, n.link_type, n.icon, ` +
            ` n.short_descr, n.view_limitations, ` +
            ` n.readme_public_id_w0, n.readme_public_id_w1 ` +
            `from ${this.db.tables.nodes} n ` +
            `where n.id in ( ? )`, [nodeIds]);
        // First store nodes in a map, so that they can be efficiently looked
        // up and pushed into an array in the same order as nodeIds.
        const nodes0 = {};
        rows.forEach((row) => {
            nodes0[row.id] = rowToPresentationNode(row);
        });
        const nodes = [];
        nodeIds.forEach((id) => {
            nodes.push(nodes0[id]);
        });
        return nodes;
    }
    /**
     * Look up a node on its public node id, and optionally package group public id and version
     * and package public id.
     *
     * The package group id and version are both expected to be null for foundation nodes, and
     * non-null otherwise.
     *
     * Package group version may be an exact version or 'LATEST' for the latest version.
     *
     * @param nodePublicId
     * @param packageGroupPublicId
     * @param packageGroupVersion
     *
     * @returns node id or null if not found
     */
    async lookupNodeOnPublicId(nodePublicId, packageGroup, packagePublicId) {
        return this.lookupNodeOnPublicIdInternal(nodePublicId, packageGroup, packagePublicId);
    }
    async lookupNodeOnPublicIdInternal(nodePublicId, packageGroup, packagePublicId, widenToAllGroups = false // widen search to all groups, for legacy URLs only
    ) {
        // Convert the public id from a 128 bit base64 string to two 64-bit words (big-endian) in
        // numeric string form.
        const { publicIdWord0, publicIdWord1 } = (0, types_js_1.nodePublicIdToDbWords)(nodePublicId);
        if (!packageGroup) {
            // Must be a foundation node, so search on public id only
            const rows = await this.db.simpleQuery('get-node-on-public-id-1', `select distinct n.id from ${this.db.tables.nodes} n ` +
                `where n.public_id_w0 = ? and n.public_id_w1 = ? and n.is_foundation`, [publicIdWord0, publicIdWord1]);
            return _.isEmpty(rows) ? null : rows[0].id;
        }
        if (!packageGroup.version) {
            // Latest version must be explicitly requested using 'LATEST', undefined not accepted
            return null;
        }
        // So we're looking for a package node...
        // The package public ids to search on
        let packageAndAliasingPublicIds;
        // Potential new public ids to search on instead of those that are given
        let newPublicIdWord0;
        let newPublicIdWord1;
        if (packageGroup.version === Tree.LATEST_VERSION) {
            // We're searching for the node's latest version
            let directPackagePublicIds;
            if (packagePublicId) {
                // We have a non-legacy URL that contains the package public id, so we can just
                // use that
                directPackagePublicIds = [packagePublicId];
            }
            else {
                // We have a legacy URL (since it doesn't contain the package public id) and has
                // either a full-path or custom public node id.
                // Look up the latest node on the given node public id and package group public id
                const sql = `select distinct n.id, n.public_id_w0, n.public_id_w1, ` +
                    `  cs.public_id pg_public_id ` +
                    `from ${this.db.tables.contentSources} cs ` +
                    `  join ${this.db.tables.nodes} n on n.content_source_id = cs.id ` +
                    `  join ${this.db.tables.nodePublicIds} pi on pi.node_id = n.id ` +
                    `where ` +
                    `  pi.public_id_w0 = ? and pi.public_id_w1 = ? ` +
                    `  and cs.state = 'published' ` +
                    (widenToAllGroups
                        ? ``
                        : `and cs.public_id = ${this.mysql.escape(packageGroup.publicId)} `) +
                    `order by cs.version desc ` +
                    `limit 1`;
                const values = [publicIdWord0, publicIdWord1];
                const rows = await this.db.simpleQuery('get-node-on-public-id-2', sql, values);
                let newPackageGroupPublicId;
                if (!_.isEmpty(rows)) {
                    // Node was found on the given node public id. It's possible that a more
                    // recent version of the node may yet exist in a package group that supersedes
                    // the given package group. So we get the found node's primary public id to
                    // use in a later wider search.
                    newPublicIdWord0 = rows[0].public_id_w0;
                    newPublicIdWord1 = rows[0].public_id_w1;
                    if (widenToAllGroups) {
                        newPackageGroupPublicId = rows[0].pg_public_id;
                    }
                }
                else if (widenToAllGroups) {
                    // Nothing more we can do, giving up
                    return null;
                }
                else {
                    // Node wasn't found. It's possible that this may be due to its original
                    // package group no longer existing, but if so then the node may still exist
                    // in a new package group that has since superseded it.
                    //
                    // We therefore check if the package group still exists, and if it doesn't
                    // then we repeat the search across all packages.
                    const sql = `select exists( ` +
                        `  select 1 ` +
                        `  from ${this.db.tables.contentSources} ` +
                        `  where state = 'published' ` +
                        `  and public_id = ${this.mysql.escape(packageGroup.publicId)} ` +
                        `  limit 1 ` +
                        `) groupExists`;
                    const rows = await this.db.simpleQuery('get-node-on-public-id-3', sql);
                    if (!rows[0].groupExists) {
                        const sql = `select distinct n.id, n.public_id_w0, n.public_id_w1, cs.public_id ` +
                            `from ${this.db.tables.contentSources} cs ` +
                            `  join ${this.db.tables.nodes} n on n.content_source_id = cs.id ` +
                            `  join ${this.db.tables.nodePublicIds} pi on pi.node_id = n.id ` +
                            `where ` +
                            `  pi.public_id_w0 = ? and pi.public_id_w1 = ? ` +
                            `  and cs.state = 'published' ` +
                            `order by cs.version desc ` +
                            `limit 1`;
                        const values = [publicIdWord0, publicIdWord1];
                        const rows = await this.db.simpleQuery('get-node-on-public-id-4', sql, values);
                        if (!_.isEmpty(rows)) {
                            // A matching node was found. Use its primary public node id and
                            // package group public id to later perform a wider lookup as there
                            // may still be a later version of the node available on another
                            // superseding package.
                            newPublicIdWord0 = rows[0].public_id_w0;
                            newPublicIdWord1 = rows[0].public_id_w1;
                            newPackageGroupPublicId = rows[0].public_id;
                        }
                        else {
                            // This is about as far as we can go, giving up
                            return null;
                        }
                    }
                }
                // Get the package public ids from packageGroup, so that we can widen the search
                // to include packages that alias the current node's package to ensure that we get
                // the latest node.
                const packageGroupPublicId = newPackageGroupPublicId
                    ? newPackageGroupPublicId
                    : packageGroup.publicId;
                directPackagePublicIds = _.map(await this.db.simpleQuery('get-node-on-public-id-5', `select distinct p.public_id ` +
                    `  from ${this.db.tables.packages} p ` +
                    `  join ${this.db.tables.contentSourcePackages} x ` +
                    `    on x.package_id = p.id ` +
                    `  join ${this.db.tables.contentSources} cs ` +
                    `    on cs.id = x.content_source_id and cs.state = 'published' ` +
                    `where cs.public_id = ${this.mysql.escape(packageGroupPublicId)} `), (row) => row.public_id);
            }
            // Build the set of package public ids consisting of the initial packages as well as
            // those that alias them directly and indirectly (e.g. [A, B, C, D] if initial package
            // A is aliased by packages B and C and package C is aliased by D.
            // This is performed by starting with the package group package's public ids, and
            // repeatedly performing alias -> package lookups until no new package ids are found.
            let newPackageIds = directPackagePublicIds;
            let latestPackageIds = [];
            let allPackageIds = [];
            while (!_.isEmpty(newPackageIds)) {
                latestPackageIds = _.clone(newPackageIds);
                allPackageIds = _.union(allPackageIds, latestPackageIds);
                // Retrieve the public ids of all packages that alias the last set of packages
                const aliasedPackageIds = _.map(await this.db.simpleQuery('get-node-on-public-id-6', `select distinct p.public_id ` +
                    `from ${this.db.tables.packageAliases} a ` +
                    `  join ${this.db.tables.packages} p on p.id = a.package_id ` +
                    `  join ${this.db.tables.contentSourcePackages} x ` +
                    `    on x.package_id = p.id ` +
                    `  join ${this.db.tables.contentSources} cs ` +
                    `    on cs.id = x.content_source_id and cs.state = 'published' ` +
                    `where a.alias in (?)`, [latestPackageIds]), (row) => row.public_id);
                newPackageIds = _.difference(aliasedPackageIds, allPackageIds);
            }
            packageAndAliasingPublicIds = allPackageIds;
        }
        let groupWhereClause;
        let packageJoinClause;
        let packageWhereClause;
        if (packagePublicId || !_.isEmpty(packageAndAliasingPublicIds)) {
            packageJoinClause = `join ${this.db.tables.packages} p on p.id = n.package_id `;
            // We filter on not just the package public id but also its aliases. This is needed as
            // the public id of the desired package within the given package group may have
            // changed during tree restructuring (which impacted all package groups, not just new
            // ones as with SDK Composer), with all supplementary packages (new and old) moved to
            // new package groups.
            if (!_.isEmpty(packageAndAliasingPublicIds)) {
                // Aliases were already retrieved in an earlier query, so we use those
                packageWhereClause = `p.public_id in (${this.mysql.escape(packageAndAliasingPublicIds)}) `;
            }
            else {
                // We don't yet have the aliases, so we need to expand query to include them
                packageWhereClause =
                    `(` +
                        // Seach on both package public id
                        `  p.public_id = ${this.mysql.escape(packagePublicId)} or ` +
                        // and package aliases
                        `  p.id in (select package_id from ${this.db.tables.packageAliases} ` +
                        `    where alias = ${this.mysql.escape(packagePublicId)}) ` +
                        `) `;
                // TODO: Consider supporting multiple alias levels here (like the latest case)?
            }
        }
        if (packageGroup.version !== Tree.LATEST_VERSION) {
            // Filter on the given package group public id and version
            groupWhereClause =
                `cs.public_id = ${this.mysql.escape(packageGroup.publicId)} and ` +
                    `cs.version = ${this.mysql.escape(packageGroup.version)}`;
            // NOTE: This won't work for bookmarked versioned URLs (new or old style) for packages
            // that have since moved to new package groups (e.g. supplementary packages as part of
            // tree restructuring). We currently instead return the latest version in when this
            // occurs, as it's not expected to be common problem.
        }
        const sql = `select distinct n.id ` +
            `from ${this.db.tables.contentSources} cs ` +
            `  join ${this.db.tables.nodes} n on n.content_source_id = cs.id ` +
            (packageJoinClause ? packageJoinClause : '') +
            `  join ${this.db.tables.nodePublicIds} pi on pi.node_id = n.id ` +
            `where ` +
            // Search for nodes on both primary public ids and public id aliases; fine to do both
            // as only matches from the latest package group will be returned
            `  pi.public_id_w0 = ? and pi.public_id_w1 = ? ` +
            `  and cs.state = 'published' ` +
            `  ${groupWhereClause ? 'and ' + groupWhereClause : ''} ` +
            `  ${packageWhereClause ? 'and ' + packageWhereClause : ''} ` +
            `order by cs.version desc ` +
            `limit 1`;
        const values = newPublicIdWord0 && newPublicIdWord1
            ? [newPublicIdWord0, newPublicIdWord1]
            : [publicIdWord0, publicIdWord1];
        const rows = await this.db.simpleQuery('get-node-on-public-id-7', sql, values);
        const nodeId = _.isEmpty(rows) ? null : rows[0].id;
        if (!nodeId) {
            if (packageGroup.version !== Tree.LATEST_VERSION) {
                // Try again, but look for latest version instead
                return this.lookupNodeOnPublicIdInternal(nodePublicId, { publicId: packageGroup.publicId, version: Tree.LATEST_VERSION }, packagePublicId);
            }
            else if (!packagePublicId && !widenToAllGroups) {
                // We have a legacy URL, repeat search but widen to all package groups
                return this.lookupNodeOnPublicIdInternal(nodePublicId, packageGroup, packagePublicId, true);
            }
            else {
                return null;
            }
        }
        else {
            return nodeId;
        }
    }
    /**
     * Look up nodes on custom resource public id, package and optionally a device or devtool
     */
    async lookupNodesOnCustomResourceId(customResourceId, pkg, filter, maxNodes) {
        return this.lookupNodesOnResourcePublicId(customResourceId, pkg, filter, maxNodes);
    }
    /**
     * Look up nodes on a global public id and optionally a device or devtool
     */
    async lookupNodesOnGlobalId(globalId, filter, maxNodes) {
        return this.lookupNodesOnResourcePublicId(globalId, undefined, filter, maxNodes);
    }
    /**
     * Look up nodes on a resource public id, package (if and only if public id is package-scoped)
     * and optionally device or devtool.
     *
     * Resource public ids are all custom ids provided by BUs and either:
     *   package-scoped - which are unique to a single resource within a package; or
     *   global-scoped - which can be assigned to multiple resources within a package and across
     *     packages
     *
     * The resource public id is assumed to be package-scoped if a package is provided, and
     * global-scoped if not.
     *
     * For devices and devtools, both device/devtool public ids and aliases are supported.
     */
    async lookupNodesOnResourcePublicId(resourcePublicId, pkg, filter, maxNodes) {
        const packagePublicId = pkg ? pkg.publicId : undefined;
        const packageVersion = pkg ? pkg.version : undefined;
        const globalScope = packagePublicId == null;
        // Get device or devtool public id (if defined)
        let devicePublicId;
        let devtoolPublicId;
        if (filter) {
            if (filter.type === 'device') {
                devicePublicId = filter.publicId;
            }
            else if (filter.type === 'devtool') {
                devtoolPublicId = filter.publicId;
            }
            else {
                (0, util_1.assertNever)(filter.type);
            }
        }
        let sql = `select distinct n.id, n.public_id_w0, n.public_id_w1, n.content_source_id, ` +
            ` cs0.public_id pkggrp_public_id, cs0.version pkggrp_version, ` +
            ` p0.public_id pkg_public_id, p0.version pkg_version ` +
            `from ${this.db.tables.nodes} n ` +
            `join ${this.db.tables.contentSources} cs0 on cs0.id = n.content_source_id ` +
            `join ${this.db.tables.packages} p0 on p0.id = n.package_id ` +
            `join ${this.db.tables.nodeCustomResourceIds} ni on ni.node_id = n.id `;
        let sqlWhere = 
        // Search on public id
        `where ni.custom_resource_public_id = ` +
            `    ${this.mysql.escape(resourcePublicId.toLowerCase())} ` +
            `  and ni.global = ${this.mysql.escape(globalScope)} `;
        if (packagePublicId) {
            // Searching on package public id
            sql +=
                `join ${this.db.tables.contentSources} cs on cs.id = ni.package_group_id ` +
                    `join ${this.db.tables.contentSourcePackages} csp ` +
                    `  on csp.content_source_id = cs.id ` +
                    `join ${this.db.tables.packages} p on p.id = csp.package_id `;
            sqlWhere +=
                `and (` +
                    // Seach on both package public id...
                    `  p.public_id = ${this.mysql.escape(packagePublicId)} or ` +
                    // and package alias
                    `  p.id in (select package_id from ${this.db.tables.packageAliases} ` +
                    `    where alias = ${this.mysql.escape(packagePublicId)}) ` +
                    `) `;
            if (packageVersion) {
                sqlWhere += `and p.version = ${this.mysql.escape(packageVersion)} `;
            }
            else {
                // No package version specified, so instead use the latest
                sqlWhere +=
                    `and p.version = ` +
                        `( select max(version) from ${this.db.tables.packages} ` +
                        `  where (` +
                        // Seach on both package public id
                        `    public_id = ${this.mysql.escape(packagePublicId)} or ` +
                        // and package alias
                        `    id in (select package_id from ${this.db.tables.packageAliases} ` +
                        `      where alias = ${this.mysql.escape(packagePublicId)}) ` +
                        `  ) ` +
                        `) `;
            }
        }
        if (devicePublicId || devtoolPublicId) {
            // Searching on device or devtool public id
            sql +=
                `join ${this.db.tables.filterAffectsNode} nf on nf.node_id = ni.node_id ` +
                    `join ${this.db.tables.filters} f on f.id = nf.filter_id ` +
                    (packagePublicId ? `and f.package_group_id = cs.id ` : '');
            if (devicePublicId) {
                sql += `join ${this.db.tables.devices} dv on dv.id = f.device_id `;
                sqlWhere +=
                    `and (` +
                        `  dv.public_id = ${this.mysql.escape(devicePublicId)} or ` +
                        `  dv.id in (select device_id from ${this.db.tables.deviceAliases} ` +
                        `    where alias = ${this.mysql.escape(devicePublicId)}) ` +
                        `) `;
            }
            else {
                sql += `join ${this.db.tables.devtools} dt on dt.id = f.devtool_id `;
                sqlWhere +=
                    `and (` +
                        `  dt.public_id = ${this.mysql.escape(devtoolPublicId)} or ` +
                        `  dt.id in (select devtool_id from ${this.db.tables.devtoolAliases} ` +
                        `    where alias = ${this.mysql.escape(devtoolPublicId)}) ` +
                        `) `;
            }
        }
        sql += sqlWhere;
        if (maxNodes) {
            // Order more recent package group versions first, so that when just a single node is
            // requested (which is currently how this is called) it's from the latest version of
            // its package.
            sql += 'order by pkggrp_public_id, pkggrp_version desc ';
            // Limit result set to maxNodes
            sql += `limit ${maxNodes}`;
        }
        const rows = await this.db.simpleQuery('get-node-custom-res-ids', sql);
        return _.isEmpty(rows)
            ? []
            : _.map(rows, (row) => ({
                nodeDbId: row.id,
                hashedNodePublicId: (0, types_js_1.mysqlWordsToPublicId)(row.public_id_w0, row.public_id_w1),
                packageGroup: {
                    dbId: row.content_source_id,
                    publicId: row.pkggrp_public_id,
                    version: row.pkggrp_version
                },
                package: {
                    publicId: row.pkg_public_id,
                    version: row.pkg_version
                }
            }));
    }
    /**
     * Get resource's nodes
     *
     * @param resourceId - the resource's id
     * @param filters - filters to apply
     * {
     *     compiler : compiler name
     *     resourceClass : resource class
     *     ide : ide
     *     kernel : kernel
     *     language : language
     *     os : os
     *     search : search strings, as an array of arrays, with the inner arrays OR'd,
     *         and their individual strings AND'd
     * }
     * @returns node ids
     */
    async getNodesOnResource(resourceId, filters) {
        // NOTE!: Broken as buildFilterSqlClauses() now requires package group arg. Leaving for
        // now as is currently unused, and uncertain if it will ever be needed.
        // Get resource's node
        let sql;
        if (!_.isEmpty(filters)) {
            const filterSqlClauses = await this.buildFilterSqlClauses('node', 'n.id', false, filters, 
            // TODO: Package group ids are now required
            []);
            sql =
                `select distinct n.id ` +
                    `from ` +
                    `    ${this.db.tables.nodes} n ` + // the resource's nodes
                    `    ${filterSqlClauses.fromClauses} ` + // filter table join(s)
                    `where ` +
                    `    n.resource_id = ? ` +
                    `    and ${filterSqlClauses.whereClauses} `; // the filters
        }
        else {
            sql =
                `select n.id ` +
                    `from ` +
                    `    ${this.db.tables.nodes} n ` + // the resource's nodes
                    `where ` +
                    `    n.resource_id = ? `;
        }
        return _.map(await this.db.simpleQuery('get-node-on-resource', sql, [resourceId]), (row) => row.id);
    }
    /**
     * Get board, device, and keyword filter suggestions matching the given search string.
     *
     * @param search - the search string
     * @param options
     *   maxTotal            - maximum number of total suggestions to return
     *   maxBoardsAndDevices - maximum number of total board and device suggestions
     *
     * @returns search suggestions for boards, devices, and keywords
     */
    async getSearchSuggestions(search, packageGroupIds, options = { maxTotal: 20, maxBoardsAndDevices: 5 }) {
        // Break search string up into its last word, upon which search suggestions will be based,
        // and the words before it, which will be prepended to the search suggestions.
        const words = search.split(/\s+/);
        const lastWord = words.pop();
        if (!lastWord) {
            return [];
        }
        const searchPrefix = words.join(' ');
        // Search is on the last word lowercased with all non-alphanumeric characters stripped
        const searchWord = lastWord.toLowerCase().replace(INVALID_CHUNK_CHARS_REGEX, '');
        if (!searchWord) {
            return searchPrefix ? [searchPrefix] : [];
        }
        // TODO?: Return devtool and device ids instead of filter ids - if they're useful to caller
        const packageGroupWhereClause = packageGroupIds
            ? `and c.package_group_id in (${this.mysql.escape(packageGroupIds)})`
            : '';
        const sql = `
            select name_search, min(priority) priority, min(concat(name, ':', grp, ':', id)) info
            from (
                (
                    # board and device filters
                    select distinct
                        if(f.devtool_id is not null, 'bd', 'dv') grp,
                        f.name_search,
                        min(f.name) name,
                        length(min(f.name)) name_length,
                        if(locate('${searchWord}', f.name_search) = 1, 1, 2) priority,
                        min(if(f.devtool_id is not null, f.devtool_id, f.device_id)) id
                    from ${this.db.tables.chunks} c
                        join ${this.db.tables.filtersXChunks} x
                            on x.chunk_id = c.id and x.filter_type in ('b', 'd')
                        join ${this.db.tables.filters} f on f.id = x.filter_id
                    where c.chunk like '${searchWord}%'
                        ${packageGroupWhereClause}
                    group by grp, name_search
                    order by priority, name_length, name_search
                    limit ${this.mysql.escape(options.maxBoardsAndDevices)}
                )
                union
                (
                    select
                        'kw' grp,  # search keywords group
                        chunk name_search,
                        min(filter_segment) name,  # pick upper caps first
                        length(min(filter_segment)) name_length,
                        min(if(at_chunk_start, 1, 2)) priority,
                        '' id
                    from (
                        (
                            # chunks, on s*, ordered by length then alphabetically
                            select distinct c.chunk, 1 at_chunk_start, 1 int_priority,
                                x.filter_segment
                            from ${this.db.tables.chunks} c
                            join ${this.db.tables.filtersXChunks} x
                                on x.chunk_id = c.id and x.filter_type <> 'x'
                            where c.chunk like '${searchWord}%'
                                ${packageGroupWhereClause}
                            order by length(chunk), chunk
                            limit ${this.mysql.escape(options.maxTotal)}
                        )
                        union
                        (
                            # chunks, on trailing chunks
                            select distinct c.chunk, 0 at_chunk_start, 1 int_priority,
                                x.filter_segment
                            from ${this.db.tables.chunks} c
                            join ${this.db.tables.trailingSubChunks} t on t.chunk_id = c.id
                            join ${this.db.tables.filtersXChunks} x
                                on x.chunk_id = c.id and x.filter_type <> 'x'
                            where t.subchunk like '${searchWord}%'
                                and c.chunk not regexp '^[0-9]'
                                    # preceding chunk cannot start with digit
                                ${packageGroupWhereClause}
                            order by length(chunk), chunk
                            limit ${this.mysql.escape(options.maxTotal)}
                        )
                    ) u1
                    
                    group by grp, name_search, int_priority
                    order by int_priority, name_length, name
                    limit ${this.mysql.escape(options.maxTotal)}
                )
            ) u2
            group by name_search
            order by priority, name_search
            limit ${this.mysql.escape(options.maxTotal)}`;
        const rows = await this.db.simpleQuery('get-search-suggestions', sql);
        const suggestions = _.map(rows, (row) => row.info.split(':')[0]);
        if (suggestions.length < options.maxTotal) {
            // Make an attempt to get more rows that match glob *?s*.
            // This is done separately from the initial query and only if needed, due to its lower
            // quality results and performance hit.
            // Also, get the maximum number of suggestions, just in case we already have some.
            // First, get the starting position in the suggestions array where suggestions are
            // ordered in alphabetical order, and do not start with the search string. All new
            // suggestions will be inserted into this latter part of the array.
            let start = _.findIndex(suggestions, (suggestion) => !suggestion
                .toLowerCase()
                .replace(INVALID_CHUNK_CHARS_REGEX, '')
                .startsWith(searchWord));
            if (start === -1) {
                start = suggestions.length;
            }
            for (const row of await this.db.simpleQuery('get-search-suggestions-substr', `select distinct x.filter_segment
                    from ${this.db.tables.chunks} c
                    join ${this.db.tables.filtersXChunks} x
                        on x.chunk_id = c.id and x.filter_type <> 'x'
                    where c.chunk like '%_${searchWord}%'
                        ${packageGroupWhereClause}
                    order by length(x.filter_segment), x.filter_segment
                    limit ${this.mysql.escape(options.maxTotal)}`)) {
                const insertPos = findInsertPos(suggestions, start, row.filter_segment);
                if (insertPos === -1) {
                    // already in array
                    continue;
                }
                else {
                    // insert into array
                    suggestions.splice(insertPos, 0, row.filter_segment);
                }
                if (suggestions.length === options.maxTotal) {
                    // we've reached the max # of suggestions, break
                    break;
                }
                function findInsertPos(suggestions, start, chunk) {
                    const chunkStripped = chunk
                        .toLowerCase()
                        .replace(INVALID_CHUNK_CHARS_REGEX, '');
                    for (let i = start; i < suggestions.length; i++) {
                        const suggestionStripped = suggestions[i]
                            .toLowerCase()
                            .replace(INVALID_CHUNK_CHARS_REGEX, '');
                        if (chunkStripped === suggestionStripped) {
                            // already in array
                            return -1;
                        }
                        else if (chunkStripped < suggestionStripped) {
                            // found it
                            return i;
                        }
                    }
                    // insert at end
                    return suggestions.length;
                }
            }
        }
        if (!searchPrefix) {
            return suggestions;
        }
        else {
            // Return suggestions prepended with the words preceding the last word upon which the
            // suggestions were based.
            return _.map(suggestions, (suggestion) => searchPrefix + ' ' + suggestion);
        }
    }
    /**
     * Get the children of the given foundation node, and the heads of their package subtree,
     * filtered on the given given package groups.
     */
    getChildrenAndSubtreeHeads(node, packageGroupIds) {
        return _.filter(_.map(node.children, (child) => ({
            child,
            heads: this.getContentHeadsBelongingToPackageGroups(child, packageGroupIds)
        })), (o) => !_.isEmpty(o.heads));
    }
    async addFoundationAndContentHeadChildren(node) {
        // Get top of tree from database, consisting of foundation, content head, and nested
        // package overview nodes
        node.children = _.map(await this.db.simpleQuery('get-foundation-children', `select n.*, ` +
            `  cs.public_id pgrp_public_id, cs.version pgrp_version, ` +
            `  p.public_id pkg_public_id, p.version pkg_version, ` +
            `  p.restrictions pkg_restrictions ` +
            `from ${this.db.tables.nodes} n ` +
            `  left join ${this.db.tables.contentSources} cs ` +
            `    on cs.id = n.content_source_id ` +
            `  left join ${this.db.tables.packages} p on p.id = n.package_id ` +
            `where n.parent_id = ? ` +
            `  and (n.is_foundation or n.is_content_subtree_head)`, [node.id]), (row) => {
            const child = rowToTopNode(row);
            child.parent = node;
            return child;
        });
        for (const child of node.children) {
            this.treeTopNodes[child.id] = child;
            if (child.isFoundation) {
                // Child is a foundation node, so add it to the foundation node
                // map and process its children.
                child.descendantContentHeads = [];
                this.foundationNodes[child.id] = child;
                // Add grandchildren to child
                await this.addFoundationAndContentHeadChildren(child);
            }
            else {
                // Child is a Content Head node
                // Add it to its ancestor descendantContentHeads list
                let ancestor = node;
                do {
                    ancestor.descendantContentHeads.push(child);
                    ancestor = ancestor.parent;
                } while (ancestor);
                // Add any deeper package overviews
                child.nestedPackageOverviews = _.map(await this.db.simpleQuery('get-nested-pkg-overviews', `select n.*, ` +
                    `  cs.public_id pgrp_public_id, cs.version pgrp_version, ` +
                    `  p.public_id pkg_public_id, p.version pkg_version, ` +
                    `  p.restrictions pkg_restrictions ` +
                    `from ${this.db.tables.nodes} n ` +
                    `  join ${this.db.tables.nodeAncestors} a on a.node_id = n.id ` +
                    `  left join ${this.db.tables.contentSources} cs ` +
                    `    on cs.id = n.content_source_id ` +
                    `  left join ${this.db.tables.packages} p on p.id = n.package_id ` +
                    `where a.ancestor_node_id = ? ` +
                    `  and n.resource_type = 'packageOverview'`, [child.id]), rowToNestedPackageOverviewNode);
            }
        }
    }
    /**
     * Return the Content Head Nodes of the given node (either on the node itself or a
     * descendant), that belong to the given Package Groups.
     */
    getContentHeadsBelongingToPackageGroups(node, packageGroupIds) {
        if (node.isContentSubTreeHead) {
            // Node is a content head node, so return it if it belongs to the given package groups.
            if (packageGroupIds.includes(node.contentSourceId)) {
                return [node];
            }
        }
        else {
            // Return the node's content heads that belong to given package groups.
            return _.filter(node.descendantContentHeads, (head) => packageGroupIds.includes(head.contentSourceId));
        }
        return [];
    }
    /**
     * Get SQL clauses for querying on nodes in the given package groups and restricted to the
     * given filters
     *
     * @param filteredEntity - the targeted entity type that's being filtered
     * @param entityIdField - the id field name of the nodes to be filtered
     * @param forDescendantCount - true if SQL statement is node descendant count retrieval
     * @param filters - filters to apply to the nodes
     * @param packageGroupIds - ids of the selected package groups in the content view
     *
     * @returns {FilterSqlClauses}
     *
     * If multiple filters are specified, then conjunction is used in merging results (i.e.
     * they are AND'd). This also applies to multiple keywords in the search filter.
     *
     */
    async buildFilterSqlClauses(filteredEntity, entityIdField, forDescendantCount, filters, packageGroupIds) {
        const sqlClauses = {
            fromClauses: '',
            whereClauses: '',
            onFilters: false,
            statNameSuffix: null,
            statParams: {}
        };
        // Transform filter object into a list of filters, with some filter args (such as
        // keyword 'search') possibly mapping to multiple filters. While also determining if
        // it contains standard or/and keyword filters.
        const { filterList } = _.reduce(filters, (acc, filterValue, filterName) => {
            if (filterValue) {
                // TODO: hasStdFilters and hasKeywordFilters currently unused, remove?
                if (filterName === 'search') {
                    acc.hasKeywordFilters = true;
                    const keywordFilters = _.uniq(filterValue).slice(0, MAX_KEYWORD_SEARCH);
                    for (const keyword of keywordFilters) {
                        acc.filterList.push({ type: filterName, value: keyword });
                    }
                }
                else {
                    acc.hasStdFilters = true;
                    acc.filterList.push({
                        type: filterName,
                        value: filterValue
                    });
                }
            }
            return acc;
        }, { filterList: [], hasKeywordFilters: false, hasStdFilters: false });
        // Build non-filter specific SQL clauses
        const fromClauseParts = [];
        const whereClauseParts = [];
        // Build individual SQL clauses for each filter
        let filterSeq = 0;
        await Promise.all(_.map(filterList, async (filter) => {
            ++filterSeq;
            const filterAlias = 'f' + filterSeq;
            const entityXFilterAlias = 'exf' + filterSeq;
            // Construct where clause(s) that compares filter's value
            const { sqlWhereClauses, sqlValues, statName } = await this.createFilterWhereClauses(filter, packageGroupIds);
            let filterComparison;
            if (sqlValues != null) {
                filterComparison = this.mysql.format(sqlWhereClauses, [sqlValues]);
            }
            else {
                filterComparison = sqlWhereClauses;
            }
            // Construct from clauses
            if (forDescendantCount) {
                // TODO!: If we decide to continue taking this approach to determining
                // descendant count for filtered nodes, then this block will need to be updated
                // to use filters-x-chunks and chunk tables similarly to the next else block.
                // Until then, this block is *broken* for keyword search.
                // join nodes-x-filters-with-descendant-counts
                fromClauseParts.push(`${this.db.tables.filterAffectsNodeCDesc} ${entityXFilterAlias}`);
                // join with filters
                fromClauseParts.push(`${this.db.tables.filters} ${filterAlias} ` +
                    `on ${filterAlias}.id = ${entityXFilterAlias}.filter_id`);
                // TODO Move this into from clause?
                whereClauseParts.push(`${entityXFilterAlias}.ancestor_node_id = ${entityIdField}`);
            }
            else {
                let subquery;
                if (filter.type === 'search') {
                    subquery =
                        `select distinct fxc.filter_id ` +
                            `from ${this.db.tables.filtersXChunks} fxc ` +
                            `  join ${this.db.tables.chunks} c ` +
                            `    on c.id = fxc.chunk_id and c.package_group_id in ` +
                            `      (${this.mysql.escape(packageGroupIds)}) and ` +
                            `      ${filterComparison} ` +
                            `where fxc.search_on_filter is true`;
                }
                else {
                    subquery =
                        `select distinct f.id ` +
                            `from ${this.db.tables.filters} f ` +
                            `where f.package_group_id in ` +
                            `  (${this.mysql.escape(packageGroupIds)}) and ` +
                            `  ${filterComparison} `;
                }
                // Join on filter-x-nodes if we're filtering nodes, or filter-x-resources if
                // we're filtering on resources.
                // And add 'filter_id in (filter-subquery)' to the join to narrow it to the
                // filters specified in the filter subquery.
                let entityXFilterTable;
                let entityFkColumn;
                let useIndex;
                switch (filteredEntity) {
                    case 'node':
                        entityXFilterTable = this.db.tables.filterAffectsNode;
                        entityFkColumn = 'node_id';
                        useIndex = 'use index (PRIMARY)';
                        break;
                    case 'resource':
                        entityXFilterTable = this.db.tables.resourceFilters;
                        entityFkColumn = 'resource_id';
                        break;
                    default:
                        (0, util_1.assertNever)(filteredEntity);
                        throw new rexError_1.RexError(`Unknown filter entity type: ${filteredEntity}`);
                }
                fromClauseParts.push(`${entityXFilterTable} ${entityXFilterAlias} ` +
                    `${useIndex || ''} ` +
                    `on ${entityXFilterAlias}.${entityFkColumn} = ${entityIdField} ` +
                    `and ${entityXFilterAlias}.filter_id in ( ${subquery} )`);
            }
            // TODO: Either remove or rework
            sqlClauses.onFilters = true;
            sqlClauses.statParams[statName] = true;
        }));
        // Aggregate the individual clauses and return
        sqlClauses.fromClauses = '';
        if (!_.isEmpty(fromClauseParts)) {
            if (!forDescendantCount) {
                sqlClauses.fromClauses += 'join ';
            }
            sqlClauses.fromClauses += fromClauseParts.join(' join ');
        }
        sqlClauses.whereClauses = whereClauseParts.join(' and ');
        if (sqlClauses.onFilters) {
            sqlClauses.statNameSuffix = 'OnFilter';
        }
        else {
            sqlClauses.statNameSuffix = 'Unfiltered';
        }
        // TODO!: Need to handle case where no non-empty filters were provided (e.g. {search: []}),
        // by updating API contract that this info is passed back to and handled on caller's side.
        return sqlClauses;
    }
    async createFilterWhereClauses(filter, packageGroupIds) {
        let sqlWhereClauses;
        let sqlValues;
        let statName;
        // TODO: Refactor these type casts, they're pretty ugly
        switch (filter.type) {
            case 'devtoolId':
                sqlWhereClauses = 'f.devtool_id in ( ? )';
                statName = 'devtool';
                let devtoolIds = await this.getPackageGroupDevtoolIds(filter.value, packageGroupIds);
                if (_.isEmpty(devtoolIds)) {
                    // The package group's devset doesn't contain the device. Use
                    // 0 as the id for now, so that the clause doesn't match anything.
                    // TODO: Improve performance by short-circuiting the query altogether
                    devtoolIds = [0];
                }
                sqlValues = devtoolIds;
                break;
            case 'deviceId':
                sqlWhereClauses = 'f.device_id in ( ? )';
                statName = 'device';
                let deviceIds = await this.getPackageGroupDeviceIds(filter.value, packageGroupIds);
                if (_.isEmpty(deviceIds)) {
                    // The package group's devset doesn't contain the devtool. Use
                    // 0 as the id for now, so that the clause doesn't match anything.
                    // TODO: Improve performance by short-circuiting the query altogether
                    deviceIds = [0];
                }
                sqlValues = deviceIds;
                break;
            case 'compiler':
                if (Array.isArray(filter.value)) {
                    sqlWhereClauses = "( f.type = 'compiler' and f.name in ( ? ) )";
                    sqlValues = filter.value;
                    statName = 'compiler';
                }
                else {
                    sqlWhereClauses = "( f.type = 'compiler' and f.name = ? )";
                    sqlValues = filter.value;
                    statName = 'compiler';
                }
                break;
            case 'resourceClass':
                sqlWhereClauses = "( f.type = 'resClass' and f.name = ? )";
                sqlValues = filter.value;
                statName = 'resourceClass';
                break;
            case 'ide':
                sqlWhereClauses = "( f.type = 'ide' and f.name = ? )";
                sqlValues = filter.value;
                statName = 'ide';
                break;
            case 'kernel':
                sqlWhereClauses = "( f.type = 'kernel' and f.name = ? )";
                sqlValues = filter.value;
                statName = 'kernel';
                break;
            case 'language':
                sqlWhereClauses = "( f.type = 'language' and f.name = ? )";
                sqlValues = filter.value;
                statName = 'language';
                break;
            case 'os':
                sqlWhereClauses = "( f.type = 'os' and f.name = ? )";
                sqlValues = filter.value;
                statName = 'os';
                break;
            case 'search':
                sqlWhereClauses = '( c.chunk = ? )';
                // escape, lowercase, and strip out all characters except alphanumeric
                sqlValues = filter.value
                    .toLowerCase()
                    .replace(INVALID_CHUNK_CHARS_REGEX, '');
                statName = 'search';
                break;
            default:
                (0, util_1.assertNever)(filter.type);
                throw new rexError_1.RexError(`Unknown filter type: ${filter.type}`);
        }
        return { sqlWhereClauses, sqlValues, statName };
    }
    /**
     * Return the ids of the devices belonging to the devsets of the given package groups, that
     * have the same public id as that of the given device.
     *
     * Necessary because there may be multiple devsets in a content view (since its package groups
     * can have different devsets), and the same device needs to work across all of them.
     *
     * @param deviceId
     */
    async getPackageGroupDeviceIds(deviceId, packageGroupIds) {
        return _.map(await this.db.simpleQuery('get-devices-on-package-groups', `select d.id ` +
            `from ${this.db.tables.contentSources} pkggrp ` +
            `  join ${this.db.tables.contentSources} devset ` +
            `    on devset.id = pkggrp.devset_id ` +
            `  join ${this.db.tables.devices} d on d.devset_id = devset.id ` +
            `  join ${this.db.tables.devices} d2 ` +
            `    on d2.public_id = d.public_id ` +
            `where pkggrp.id in ( ? ) ` +
            `  and pkggrp.type = 'pkggrp' ` +
            `  and pkggrp.state = 'published' ` +
            `  and d2.id = ?`, [packageGroupIds, deviceId]), (row) => row.id);
    }
    /**
     * Return the ids of the devtools belonging to the devsets of the given package groups, that
     * have the same public id as that of the given devtool.
     *
     * Necessary because there may be multiple devsets in a content view (since its package groups
     * can have different devsets), and the same devtool needs to work across all of them.
     *
     * @param devtoolId
     */
    async getPackageGroupDevtoolIds(devtoolId, packageGroupIds) {
        return _.map(await this.db.simpleQuery('get-devtools-on-package-groups', `select d.id ` +
            `from ${this.db.tables.contentSources} pkggrp ` +
            `  join ${this.db.tables.contentSources} devset ` +
            `    on devset.id = pkggrp.devset_id ` +
            `  join ${this.db.tables.devtools} d ` +
            `    on d.devset_id = devset.id ` +
            `  join ${this.db.tables.devtools} d2 ` +
            `    on d2.public_id = d.public_id ` +
            `where pkggrp.id in ( ? ) ` +
            `  and pkggrp.type = 'pkggrp' ` +
            `  and pkggrp.state = 'published' ` +
            `  and d2.id = ?`, [packageGroupIds, devtoolId]), (row) => row.id);
    }
    /**
     * Return the package group id of the given node
     */
    async getNodePackageGroupId(nodeId) {
        const sql = `select n.content_source_id ` +
            `from ${this.db.tables.nodes} n ` +
            `where n.id = ? ` +
            `  and n.content_source_id is not null`;
        const rows = await this.db.simpleQuery('get-package-group-id-on-node', sql, [nodeId]);
        if (_.isEmpty(rows)) {
            throw new rexError_1.RexError(`getNodePackageGroupId: package group not found: node id: ${nodeId}`);
        }
        else if (rows.length > 1) {
            throw new rexError_1.RexError(`getNodePackageGroupId: multiple package groups: node id: ${nodeId}`);
        }
        return rows[0].content_source_id;
    }
    /**
     * Get foundation nodes
     */
    async getFoundationNodes() {
        if (!this.initialized) {
            await this.init();
        }
        return this.foundationNodes;
    }
    /**
     * Get root node
     */
    async getRootNode() {
        if (!this.initialized) {
            await this.init();
        }
        return this.rootNode;
    }
    nodeToPresentationNode(node) {
        return {
            id: node.id,
            publicId: node.publicId,
            name: node.name,
            packageGroupId: node.contentSourceId || undefined,
            isLeaf: node.isLeaf,
            resourceType: node.resourceType || undefined,
            fileType: node.fileType || undefined,
            packageId: node.packageId || undefined,
            linkExt: node.linkExt || undefined,
            linkType: node.linkType || undefined,
            icon: node.icon || undefined,
            shortDescription: node.shortDescription || undefined,
            viewLimitations: node.viewLimitations || undefined,
            readmeNodePublicId: node.readmeNodePublicId || undefined
        };
    }
    nodeToPackageTreeNode(node) {
        return {
            ...this.nodeToPresentationNode(node),
            children: [],
            packagePublicId: node.packagePublicId || undefined,
            packageVersion: node.packageVersion || undefined,
            packageGroupPublicId: node.packageGroupPublicId || undefined,
            packageGroupVersion: node.packageGroupVersion || undefined
        };
    }
}
exports.Tree = Tree;
function rowToPresentationNode(row) {
    return {
        id: row.id,
        publicId: (0, types_js_1.nodeRowToPublicId)(row),
        name: row.name,
        packageGroupId: row.content_source_id || undefined,
        isLeaf: Boolean(row.is_leaf),
        resourceType: row.resource_type != null
            ? row.resource_type // TODO: perform checked conversion
            : undefined,
        fileType: row.file_type || undefined,
        packageId: row.package_id || undefined,
        // follow node path module convention of preceding '.'
        linkExt: row.link_ext ? '.' + row.link_ext : undefined,
        linkType: row.link_type ? (row.link_type === 'l' ? 'local' : 'external') : undefined,
        icon: row.icon || undefined,
        shortDescription: row.short_descr || undefined,
        viewLimitations: ((0, types_js_1.recomposeStringArray)(row.view_limitations) || undefined),
        readmeNodePublicId: row.readme_public_id_w0 == null || row.readme_public_id_w1 == null
            ? undefined
            : (0, types_js_1.mysqlWordsToPublicId)(row.readme_public_id_w0, row.readme_public_id_w1)
    };
}
exports.rowToPresentationNode = rowToPresentationNode;
function rowToTopNode(row) {
    return {
        ...(0, types_js_1.rowToNode)(row),
        descendantContentHeads: [],
        children: [],
        nestedPackageOverviews: [],
        parent: null,
        packageGroupPublicId: row.pgrp_public_id || null,
        packageGroupVersion: row.pgrp_version || null,
        packagePublicId: row.pkg_public_id || null,
        packageVersion: row.pkg_version || null,
        packageRestrictions: row.pkg_restrictions || null
    };
}
function rowToNestedPackageOverviewNode(row) {
    return {
        ...(0, types_js_1.rowToNode)(row),
        packageGroupPublicId: row.pgrp_public_id || null,
        packageGroupVersion: row.pgrp_version || null,
        packagePublicId: row.pkg_public_id || null,
        packageVersion: row.pkg_version || null,
        packageRestrictions: row.pkg_restrictions || null
    };
}
