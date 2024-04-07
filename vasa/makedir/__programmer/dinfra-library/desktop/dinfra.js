// Copyright (C) 2015-2021 Texas Instruments Incorporated - http://www.ti.com/
/**
 * Cloud infrastructure abstraction layer.
 * @module dinfra
 */
const Q = require('q'); // promise library
const crypto = require('crypto');
const os = require('os');
const fs = require('fs');
const util = require('util');
const dschema = require('./dschema');
const denum = require('./denum');
const djson = require('./djson');
const dlog = require('./dlog');
const dfile = require('./dfile');
const dresource = require('./dresource');
const pkgjson = require('./package.json');
const SHUTDOWN_TIMEOUT = 60000; // in milliseconds
const cloud = function () { // when cloud, more services are available
        try {
            require.resolve('./dtopic');
            return (true);
        }
        catch (e) {
            return (null);
        }
    }.call();

const dlease = cloud && require('./dlease');
const devent = cloud && require('./devent');
const dtopic = cloud && require('./dtopic');
const dservice = cloud && require('./dservice');
const dencrypt = cloud && require('./dencrypt');
const dcontain = cloud && require('./dcontain');
const dworkspace = cloud && require('./dworkspace');
const dockerService = cloud && require('./service-container/docker-service')
const dockerServer = cloud && require('./service-container/docker-server');

exports.dtopic = dtopic; // @todo merge other similar exports here

/*
    Any of these signals will start the shutdown process,
    with an exit code of 1 to indicate termination.  Typically,
    this will cause the logger to be flushed as the last
    shutdown activity, assuming shutdown completes gracefully.
    The idea behind this is that all log messages get persisted
    to the database/file, if either are present - this is important,
    because log messages are spooled internally in the node process,
    and a straight process.exit will cause those to be lost.
*/
const defaultSignalHandlers = {
    SIGHUP: shutdownSignalHandler,
    SIGINT: shutdownSignalHandler,
    SIGQUIT: shutdownSignalHandler,
    SIGABRT: shutdownSignalHandler,
    SIGTERM: shutdownSignalHandler,
};

exports.version = pkgjson.version;
exports.variant = pkgjson.variant;

const EventEmitter = require('events').EventEmitter; // note diff to node5+
var config = null;
var uncaught = false; // handle uncaught exceptions
const tablePrefix = "dinfra_";
var landscapeConnector = null;
var resourceManager = null;
var encryptManager = null;
var writableGroup = null;
var readOnly = true; // means don't perform maint, don't log, no modify
var readableGroup = null;
var warehouseGroup = null;
var logger = dlog.logger("dinfra"); // replace this during non-legacy config
var origin = null;
var address = null;
var localAddress = null;
var shutdownExitCode = -1;
var jobsTrace = null;
const shutdownTidyStack = new denum.TidyStack();
const announcementPrefix = "/announcements/";

shutdownTidyStack.error = logger.error.bind(logger);

function shutdownSignalHandler(sig) {
    exports.shutdown(1);
}

/**
 * Add the default dinfra signal handlers - these are always added
 * by configure(), so there's generally no reason to call this function
 * directly.
 */
exports.addDefaultSignalHandlers = function () {
    for (var sig in defaultSignalHandlers) {
        process.on(sig, defaultSignalHandlers[sig]);
    }
}

/**
 * Remove the default dinfra signal handlers installed by addSignalHandlers
 * during configure().
 */
exports.removeDefaultSignalHandlers = function () {
    for (var sig in defaultSignalHandlers) {
        process.removeListener(sig, defaultSignalHandlers[sig]);
    }
}

function Configure(callback) {
    this.callback = callback;
    this.errors = [];
    this.conn = null;
    this.upgrade = null;
}

Configure.prototype._open = function () {
    var self = this;

    if (!cloud) {
        this._configureLogs();
    }
    else if (readOnly) {
        /**
         * This will configure logs without writability, which
         * means logs won't flush, but we can still follow logs.
         * Enabled with dconfig["read-only"] (cf. ddestroy.js).
         */

        this._configureLogs();
    }
    else {
        writableGroup.openConnection(function (error, conn) {
                if (error != null) {
                    self._close(error);
                }
                else {
                    self.conn = conn;
                    self.configureInitialSchemaPrivate();
                }
            });
    }
}

Configure.prototype._close = function (error) {

    const self = this;

    if (error) {
        if (error instanceof Function) {
            throw new Error("invalid call to close private: " +
                "error is function");
        }

        this.errors.push(error);
    }

    if (this.upgrade) {
        this.upgrade.close(function (error) {
                self.upgrade = null;
                self._close(error);
            });
    }
    else if (this.errors.length > 0) {
        this.callback(this.errors);
    }
    else {
        // Create shutdown handlers to flush log backends on shutdown

        exports.newShutdownHandler(function (callback) {
            return (dlog.flush(0, callback));
        });
        // exports.newShutdownHandler(function (callback) {
        //     return (dlog.flushFileBackend(callback));
        // });
        if (cloud) {
            exports.newShutdownHandler(function (callback) {
                dtopic.getEventLoggerBackend().flush(0, callback);
            });
        }

        this.callback(null); // we're good
    }
}

Configure.prototype._configureLogs = function () {

    const self = this;

    // Configure database-based default dlog backend
    dlog.getDefaultBackend().configure(
        logger, config.logging, origin, tablePrefix + "log",
        exports.writableGroup, // may actually be null ...
        readableGroup,
        null,
        function (error) {
            if (error) {
                self._close(error);
            }
            else if (cloud) {
                // Configure second database-based dlog backend, solely for
                // topic events
                dtopic.getEventLoggerBackend().configure(
                    logger, config.logging, origin,
                    tablePrefix + "topic",
                    exports.writableGroup, // may actually be null ...
                    readableGroup,
                    "TOPIC_EVENTS",
                    function (error) {
                        // dlog.configureFileBackend(origin);
                        self._close(error);
                    });
            }
            else {
                self._close();
            }
        });
}

Configure.prototype.configureMaintainSessionsOptsPrivate = function () {
    var self = this;

    /*
        Attempt to upgrade the session opts schema.
    */
    writableGroup.maintainSchema(self.upgrade.conn,
        dservice.sessionsOptsTablePrefix,
        writableGroup.getJSONSchema(), true, // upgrade!!!
        function (error, warnings) {
            // can ignore warnings in this phase
            if (error != null) { // neither undefined nor null
                self._close(error);
            }
            else {
                self.configureMaintainRSchemaPrivate();
            }
        });
}

Configure.prototype.configureMaintainScheduleArgsPrivate = function () {
    var self = this;

    /*
        Attempt to upgrade the services opts schema.
    */
    writableGroup.maintainSchema(self.upgrade.conn,
        dservice.scheduleArgsTablePrefix,
        writableGroup.getJSONSchema(), true, // upgrade!!!
        function (error, warnings) {
            // can ignore warnings in this phase
            if (error != null) { // neither undefined nor null
                self._close(error);
            }
            else {
                self.configureMaintainSessionsOptsPrivate();
            }
        });
}

Configure.prototype.configureMaintainServicesOptsPrivate = function () {
    var self = this;

    /*
        Attempt to upgrade the services opts schema.
    */
    writableGroup.maintainSchema(self.upgrade.conn,
        dservice.servicesOptsTablePrefix,
        writableGroup.getJSONSchema(), true, // upgrade!!!
        function (error, warnings) {
            // can ignore warnings in this phase
            if (error != null) { // neither undefined nor null
                self._close(error);
            }
            else {
                self.configureMaintainScheduleArgsPrivate();
            }
        });
}

Configure.prototype.configureMaintainSessionsSchemaPrivate = function () {
    var self = this;

    /*
        Attempt to upgrade the infrastructure schema:
        this time its not just an initialize.
    */
    self.upgrade.upgrade("session", require('./dsessions_schema.json'),
        function (error, warnings) {
            // can ignore warnings in this phase
            if (error != null) { // neither undefined nor null
                self._close(error);
            }
            else {
                self.configureMaintainServicesOptsPrivate();
            }
        });
}

Configure.prototype.configureMaintainScheduleSchemaPrivate = function () {
    var self = this;

    /*
        Attempt to upgrade the infrastructure schema:
        this time its not just an initialize.
    */
    self.upgrade.upgrade("schedule", require('./dschedule_schema.json'),
        function (error, warnings) {
            // can ignore warnings in this phase
            if (error != null) { // neither undefined nor null
                self._close(error);
            }
            else {
                self.configureMaintainSessionsSchemaPrivate();
            }
        });
}

Configure.prototype.configureMaintainServicesSchemaPrivate = function () {
    var self = this;

    /*
        Attempt to upgrade the infrastructure schema:
        this time its not just an initialize.
    */
    self.upgrade.upgrade("service", require('./dservices_schema.json'),
        function (error, warnings) {
            // can ignore warnings in this phase
            if (error != null) { // neither undefined nor null
                self._close(error);
            }
            else {
                self.configureMaintainScheduleSchemaPrivate();
            }
        });
}

Configure.prototype.configureMaintainSchemaPrivate = function () {
    var self = this;

    /*
        Attempt to upgrade the infrastructure schema:
        this time its not just an initialize.
    */
    self.upgrade.upgrade("", require('./dinfra_schema.json'),
        function (error, warnings) {
            // can ignore warnings in this phase
            if (error != null) { // neither undefined nor null
                self._close(error);
            }
            else {
                self.configureMaintainServicesSchemaPrivate();
            }
        });
}

Configure.prototype.configureMaintainEncryptPrivate = function () {
    var self = this;

    if (encryptManager == null) {
        self.maintainProfilesPrivate();
    }
    else {
        encryptManager.configure(this.conn, this.upgrade, function (error) {
                if (error != null) {
                    self._close(error);
                }
                else {
                    self.maintainProfilesPrivate();
                }
            });
    }
}

Configure.prototype.configureMaintainRSchemaJSONPrivate = function () {
    var self = this;

    /*
        Attempt to upgrade the resource storage schema.
    */
    writableGroup.maintainSchema(self.upgrade.conn,
        dresource.resourceMetaTablePrefix,
        writableGroup.getJSONSchema(), true, // upgrade!!!
        function (error, warnings) {
            // can ignore warnings in this phase
            if (error != null) { // neither undefined nor null
                self._close(error);
            }
            else {
                self.configureMaintainEncryptPrivate();
            }
        });
}

Configure.prototype.configureMaintainRSchemaPrivate = function () {
    var self = this;

    /*
        Attempt to upgrade the resource storage schema.
    */
    self.upgrade.upgrade("resource", resourceManager.getResourceSchema(),
        function (error, warnings) {
            // can ignore warnings in this phase
            if (error != null) { // neither undefined nor null
                self._close(error);
            }
            else {
                self.configureMaintainRSchemaJSONPrivate();
            }
        });
}

Configure.prototype.configureUpgradedSchemaPrivate = function () {
    var self = this;

    exports.openSchemaUpgrade(logger.service, tablePrefix,
        function (error, upgrade) {
            if (error != null) {
                self._close(error);
            }
            else {
                self.upgrade = upgrade;

                self.configureMaintainSchemaPrivate();
            }
        });
}

Configure.prototype.configureInitialSchemaPrivate = function () {
    var self = this;

    /*
        Ensure that at least some schema exists on
        launch - this creates enough schema to
        perform leases, which we need next ...

        Note that this currently maintains two tables that
        change very rarely: dinfra_schema and dinfra_leases.
        The general restriction of this approach is that
        tables in that dinfra_schema.json file can never be deleted.
        It is used only for core database management tables in
        essence.  The maintainSchema() call here is invoked with
        the false parameter for "upgrade", which means it will only create
        tables that do not exist: it will not modify tables - that
        is left to the proper schema upgrade that follows (and
        uses these two tables).
    */
    writableGroup.maintainSchema(this.conn, tablePrefix,
        require('./dinfra_schema.json'), false,
        function (error, warnings) {
            // can ignore warnings in this phase
            if (error != null) { // neither undefined nor null
                self._close(error);
            }
            else {
                self.configureUpgradedSchemaPrivate();
            }
        });
}

/**
 * Maintain the legacy application schema.
 */
Configure.prototype.maintainApplicationsPrivate = function () {
    var self = this;

    writableGroup.maintainSchema(this.conn, "",
        require('./applications_schema.json'), true,
        function (error, warnings) {
            // can ignore warnings in this phase
            if (error != null) { // neither undefined nor null
                self._close(error);
            }
            else {
                self._configureLogs();
            }
        });
}

Configure.prototype.maintainProfilesPrivate = function () {
    var self = this;

    /**
     * Note this JUST deals with a JSON schema - there is no
     * actual dinfra_schema table entry for it.
     */
    writableGroup.maintainSchema(this.upgrade.connection(),
        tablePrefix + "profile",
        writableGroup.getJSONSchema(), true, // upgrade!!!
        function (error, warnings) {
            for (var i = 0; i < warnings.length; i++) {
                logger.vwarning(warnings[i]);
            }

            if (error != null) {
                self._close(error);
            }
            else {
                self.maintainApplicationsPrivate();
            }
        });
}

function discoverAddress() {
    var ifaces = os.networkInterfaces();
    var chosen = null;

    for (var ifname in ifaces) {
        var iflist = ifaces[ifname];

        if (ifname !== "docker0" && ifname !== 'dinfra' && ifname.indexOf('br-') !== 0) {
            for (var ifindex = 0; ifindex < iflist.length; ifindex++) {
                var iface = iflist[ifindex];

                if ((iface.family != null) && (iface.family != "IPv4"))  {
                    // ignore
                }
                else if (iface.internal) {
                    // ignore
                }
                else if (chosen == null) {
                    chosen = iface; // choose only
                }
                else if (config && config.address) {
                    // don't bother complaining
                }
                else if (config && config.suppressInterfaceComplaints) {
                    // also don't bother complaining
                }
                else {
                    // for now, just ignore, but log it so we know
                    logger.info("multiple candidate address ignored",
                        ifname, chosen);
                }
            }
        }
    }

    var address;

    if (chosen == null) {
        address = "127.0.0.1";
    }
    else {
        address = chosen.address;
    }

    return (address);
}

function configure(aConfig, callback) {
    if (callback === undefined) { // do not match null
        return (Q.nfcall(configure, aConfig)); // shortcut to Q
    }

    if (config != null) {
        throw new denum.StateError("already configured");
    }

    if (aConfig == null) {
        throw new RangeError("expected a JSON dconfig object");
    }

    config = aConfig;
    exports.config = config;

    if (config.uncaught == true) {
        exports.uncaught(true);
    }

    if (config.origin.serviceName != null) {
        /*
            We have a default service name -- this usually means we were
            invoked by dcontrol, or something using a generated config.
            In this case, we prepend the service name to the
            default log messages.
        */
        
        logger = dlog.logger(config.origin.serviceName + "/dinfra");
    }

    origin = config.origin.landscape + "/" +
        config.origin.cluster + "/" +
        config.origin.instance;
    address = config.address;

    localAddress = discoverAddress();

    if (address == null) {
        address = localAddress;
    }

    /**
     * The IPv4 address to use for routine network operations (especially UDP).
     */
    exports.address = address;
    /**
     * If in Docker, the Docker-internal address may be different than dinfra.address.
     */
    exports.localAddress = localAddress;
    /**
     * The full origin name of this service.
     */
    exports.origin = origin;
    /**
     * The landscape name (default site/domain name).
     */
    exports.landscape = config.origin.landscape;
    /**
     * The cluster name provided through configuration.
     */
    exports.cluster = config.origin.cluster;
    exports.instance = config.origin.instance;

    if (config.paths == null) {
        logger.notice("dinfra dconfig.paths is missing: " +
            "may need to update dcontrol, or, if " +
            "a manual configuration, update it for proper operation");
    }

    // configure various general modules
    denum.configure(config);
    dresource.configure(config);
    dschema.configure(config);

    if (cloud) {
        // configure any cloud-only modules
        dlease.configure(config);
        dservice.configure(config);
    }

    /**
     * This should contain several paths for use in 
     * determining where things are on the target.
     * Note that these can be specific to a scope or cluster,
     * so don't depend on them being the same for different
     * services.  Typical values:
     * "base" - the location of the target installation (often home)
     * "data" - the location of persistent storage (ccs-cloud-storage)
     * "temp" - the location of temporary storage (ccs-cloud-storage-temp)
     * "defaultCode" - the location of the *default* scope code directory
     * (similar to ~/ccs-cloud or ~/ccs-cloud.local in many installations).
     * These paths should be fully expanded values with a leading slash.
     */
    exports.paths = config.paths;

    exports.addDefaultSignalHandlers();

    var opts = config.databases;

    readOnly = (config["read-only"] == true);

    if (opts != null) {
        var defaults = opts.defaults;
        var primary = opts.primary;
        var secondary = opts.secondary;
        var tertiary = opts.tertiary;
        var warehouse = opts.warehouse;

        landscapeConnector = dschema.newLandscapeConnector(
            opts.defaults, dlog.logger('landscape-storage'));

        exports.newShutdownHandler(function (callback) {
                return (landscapeConnector.close(callback));
            });
            
        // Database connection encryption is enabled if and only if databases.ssl is defined and
        // databases.ssl.enable is either undefined or truthy.

        if (opts.ssl && (opts.ssl.enable === undefined || opts.ssl.enable)) {
            // TLS/SSL certificate/key dir
            var dir = opts.ssl.dir || (process.env.HOME + '/.mysql-ssl');
            
            // SSL is not supported within containment due to risk of key exposure. Therefore if
            // we're in containment the directory specified by ssl.dir (passed down from the host)
            // and its keys will not exist. To guard against this we must check if we're in
            // containment, which we do so by checking if HOME contains 'guest' *and* ssl.dir's
            // non-existence (not a perfect solution).
            if (process.env.HOME && process.env.HOME.indexOf('guest') !== -1 &&
                    !fs.existsSync(dir)) {
                // Skip SSL configuration
            } else {
                // Configure SSL
                defaults = denum.configOverlay(defaults, {
                    ssl: {
                        // Certificate Authority (CA) certificate
                        ca : fs.readFileSync(getPemPath(opts.ssl.caCert, 'ca.pem')),
                        // MySQL client certificate
                        cert : fs.readFileSync(getPemPath(opts.ssl.clientCert, 'client-cert.pem')),
                        // MySQL client private key
                        key : fs.readFileSync(getPemPath(opts.ssl.clientKey, 'client-key.pem'))
                    }
                });

                // Get certificate/key filepath
                function getPemPath(pemPathOption, defaultFilename) {
                    if (pemPathOption) {
                        if (pemPathOption.charAt(0) === '/') {
                            return pemPathOption; // absolute path
                        } else {
                            return dir + '/' + pemPathOption; // relative path
                        }
                    } else {
                        return dir + '/' + defaultFilename; // no option, go with default
                    }
                }
            }
        }

        // set up writable group as: primary, then secondary.
        writableGroup = landscapeConnector.
            defineGroup(dschema.ACCESS.WRITABLE, defaults);
        // set up readable group as: tertiary, primary, then secondary.
        readableGroup = landscapeConnector.
                defineGroup(dschema.ACCESS.READABLE, defaults);
        // set up warehouse group as: just nearby warehouse db
        warehouseGroup = landscapeConnector.
                defineGroup(dschema.ACCESS.WAREHOUSE, defaults);

        exports.readableGroupProtected = readableGroup;

        if (warehouse == null) {
            if (cloud) {
                throw new Error("no warehouse specified");
            }
        }
        else {
            warehouseGroup.addCandidate('warehouse', warehouse);
        }

        if (tertiary != null) {
            readableGroup.addCandidate('tertiary', tertiary);
        }

        if (primary == null) { // either undefined or null
            if (cloud) {
                throw new Error("no primary specified in ", opts);
            }

            primary = {};
        }

        writableGroup.addCandidate('primary', primary);
        readableGroup.addCandidate('primary', primary);

        if (secondary != null) {
            writableGroup.addCandidate('secondary', secondary);
            readableGroup.addCandidate('secondary', secondary);
        }

        if (!cloud) {
            // no encrypt manager,
            // no service registration
            // no dlog_query
            exports.newService = function () {
                    throw new denum.UnsupportedError();
                };
            exports.registerService = function () {
                    throw new denum.UnsupportedError();
                };
            exports.queryServices = function () {
                    throw new denum.UnsupportedError();
                };
            exports.querySessions = function () {
                    throw new denum.UnsupportedError();
                };
            exports.getServicesCache = function () {
                    throw new denum.UnsupportedError();
                };
            exports.dlog.query = undefined;
        }
        else {
            exports.newService = dservice.newService;
            exports.registerService = dservice.registerService;
            exports.queryServices = dservice.queryServices;
            exports.querySessions = dservice.querySessions;
            exports.getServicesCache = dservice.getServicesCache;
            dservice.swapWorkaround = config.swapWorkaround;

            encryptManager = dencrypt.newEncryptManager(logger, writableGroup);

            dlog.query = require('./dlog_query').query;
            dlog.dtail = require('./dlog_query').dtail;
        }

        if (readOnly) {
            // @todo really should be protected?
            exports.writableGroup = null;
        }
        else {
            // @todo really should be protected?
            exports.writableGroup = writableGroup;
        }

        // @todo really should be protected?
        exports.readableGroup = readableGroup;
        // @todo really should be protected?
        exports.warehouseGroup = warehouseGroup;

        var dresource_type;

        if (opts.defaults.type == "mysql") {
            dresource_type = "sql";
        }
        else if (opts.defaults.type == "file") {
            dresource_type = "file";
        }
        else {
            throw new denum.UnsupportedError();
        }

        resourceManager = dresource.newResourceManager(logger,
            exports.writableGroup, readableGroup,
            encryptManager,
            {
                type: dresource_type,
            });

        exports.hasResourceVersionSupport = resourceManager.supportsVersions;

        new Configure(callback)._open();
    }
    else {
        var dschemaPresent = false;
        try {
            require.resolve("./dschema_mysql");
            dschemaPresent = true;
        }
        catch (e) {
            // always OK
        }

        if (dschemaPresent) {
            logger.warning("database support available, " +
                "but no database configured");
        }

        // Configure non-database-based default logging backend
        dlog.getDefaultBackend().configure(
            logger, config.logging, origin, null, null, null, null,
            function (error) {
                if (callback) {
                    callback(error);
                }
            });
    }
}

exports.needsConfiguration = function () {
        return (config == null);
    };

/**
 * Configures dinfra from the landscape infrastructure JSON file.
 * This file should be used only for configuring the infrastructure:
 * applications are configured separately by the deployment, since
 * they may differ for different release versions or multivariate
 * option sets.  Call configure(config, callback).  If the configuration
 * is successful, then it will have initialized its schema, started
 * database logging and flushed all pending log messages.  Then it will
 * call callback(error) in the usual way.
 * 
 * Schema initialization follows the same rules as non-dinfra schema
 * initialization (see {@link openSchemaUpgrade}), with one exception: the core
 * dinfra schema tables will always be created if they are missing, even if the
 * new schema version is less than the current schema version.
 */
exports.configure = configure;

 /**
 * Opens a writable connection and notifies of it via the callback.
 * This returns undefined.  The resulting connection must be
 * closed with close(callable) to return it to the pool.  Writable
 * connections are by default in REPEATABLE_READ transaction isolation
 * mode, but are set up to autocommit (see openWritableTX below).
 */
exports.openWritableDB = function (callback) {
        if (readOnly) {
            throw new Error("illegal state - read only config");
        }

        return (writableGroup.openConnection(callback));
    };

/**
 * Attempt to apply fn(tx, cb) under standard transaction
 * retry rules over a writable DB connection.  This is a
 * test entry point and is not really intended for caller use.
 * @protected
 */
exports.retryWritableTX = function (fn, callback) {
        var name = fn.name || "anon"; // provide a useful name if we can
        var opts = true; // use default retry rules
        var tx = dschema.executeTX(writableGroup, name, 
            function (callback) {
                return (fn(tx, callback));
            }, opts, callback);

        return (tx);
    };

exports.invokeWrapper = denum.invokeWrapper;

/**
 * This will acquire readable DB connection, and call fn(conn, cb) on it.
 * When cb(error,args...) is called, it will release the connection and 
 * then call the callback with the error and args.  Note: if you intend
 * to perform transactions, in this manner, its best to use retryWritableTX.
 */
exports.invokeWritableDB = function (fn, callback) {
        return (exports.invokeWrapper(
                exports.openWritableDB,
                fn,
                function (failure, conn, callback) {
                    // ignore underlying fn failure - reports to final callback
                    return (conn.close(callback));
                },
                callback));
    };

/**
 * This will acquire readable DB connection, and call fn(conn, cb) on it.
 * When cb(error,args...) is called, it will release the connection and 
 * then call the callback with the error and args.
 */
exports.invokeReadableDB = function (fn, callback) {
        return (exports.invokeWrapper(
                exports.openReadableDB,
                fn,
                function (failure, conn, callback) {
                    // ignore underlying fn failure - reports to final callback
                    return (conn.close(callback));
                },
                callback));
    };

/**
 * Acquires a lease on (type, name, refresh) and calls fn(lease, cb).
 * When cb(error,args...) is called, it releases the lease and calls
 * callback(error,args...).
 */
exports.invokeLease = function (type, name, refresh, fn, callback) {
        return (exports.invokeWrapper(
            exports.openLease.bind(null, type, name, refresh),
            function (lease, callback) {
                lease.register(function () {
                        lease.acknowledge();
                    });

                return (fn.apply(null, arguments));
            },
            function (failure, lease, callback) {
                // ignore underlying fn failure - reports to final callback
                return (lease.close(callback));
            },
            callback));
    };

/**
 * Opens a resource with name and opts; invokes fn(resource, cb);
 * closes the resource on cb; and then invokes callback.  This just
 * wraps up a lot of boilerplate relating to single resource processing.
 */
exports.invokeResource = function (name, opts, fn, callback) {
        return (exports.invokeWrapper(
            exports.openResource.bind(null, name, opts),
            fn,
            function (failure, resource, callback) {
                if (resource == null) {
                    return (callback());
                }

                // ignore underlying fn failure - reports to final callback
                return (resource.close(callback));
            },
            callback));
    };

/**
 * Opens a database monitor (dschema.DBMonitor) that can be used to
 * interrogate the runtime state of the database.  DBMonitor need not
 * be supported for all databases, or may only be partially supported.
 */
exports.openDBMonitor = function (callback) {
        if (readOnly) {
            return (callback(new denum.StateError("read only config")));
        }

        return (writableGroup.openDBMonitor(callback));
    };

/**
 * This should not be called from regular code - it destroys entire
 * databases.  Primarily used in development and testing.
 * tablePrefix - use '' for all tables, or just destroy some subset
 * files - list of files to load
 * callback(error, tables[], files[]) - called with tables found/destroyed
 * and files loaded.
 */
exports.resetDB = function (tablePrefix, files, callback) {
        var events = new EventEmitter();

        if (callback) {
            var tables = [];

            events.on('error', callback).
                on('table', function (table) { tables.push(table); }).
                on('file', function (file) { tables.push(file); }).
                on('end', function () { callback(null, tables, files); });
        }

        writableGroup.openConnection(function (error, conn) {
                if (error != null) {
                    events.emit('error', error);
                }
                else {
                    function perFile(conn, index) {
                        if ((files == null) || (index == files.length)) {
                            conn.close(function (error) {
                                    if (error != null) {
                                        events.emit('error', error);
                                    }
                                    else {
                                        events.emit('end');
                                    }
                                });
                        }
                        else {
                            throw new Error();
                        }
                    }

                    writableGroup.destroySchema(conn, tablePrefix,
                                function (error, tables) {
                            if (error != null) {
                                events.emit('error', error);

                                conn.close(function (error) {
                                        if (error != null) {
                                            events.emit('error', error);
                                        }
                                    });
                            }
                            else {
                                tables.forEach(function (table) {
                                        events.emit('table', table);
                                    });

                                perFile(conn, 0);
                            }
                        });
                }
            });

        return (events);
    };

/**
 * This should not be called from regular code - it destroys entire
 * databases.  Primarily used in development and testing.
 * tablePrefix - use '' for all tables, or just destroy some subset
 * callback(error, tables[]) - called with tables found/destroyed
 */
exports.destroyDB = function (tablePrefix, callback) {
    return (exports.resetDB(tablePrefix, null, callback));
}

/**
 * Delete all the records in the nominated tables.  This is intended for
 * use from dcontrol or programmatic test control code, not from
 * application code.
 */
exports.deleteFromTables = function (tables, callback) {
    tables = tables.slice(0);

    exports.openWritableDB(function (error, conn) {
            function f(error) {
                var table = tables.shift();

                if ((error != null) || !table) {
                    return (conn.close(function (error0) {
                            if (error == null) {
                                error = error0;
                            }

                            return (callback(error));
                        }));
                }

                return (conn.query("TRUNCATE `" + table + "`", f));
            }

            return (f());
        });
}

/**
 * Destroy the database records of all leases.  This is intended for
 * use from dcontrol or programmatic test control code, not from
 * application code.
 */
exports.destroyAllLeases = function (callback) {
    return (exports.deleteFromTables(["dinfra_leases"], callback));
}

/**
 * Destroy the database records of all services.  This is intended for
 * use from dcontrol or programmatic test control code, not from
 * application code.
 */
exports.destroyAllServices = function (callback) {
    return (exports.deleteFromTables([
            "dinfra_serviceregos",
            "dinfra_serviceoptsvalues",
            "dinfra_serviceoptsextends",
        ], callback));
}

/**
 * Destroy the database records of all commands.  This is intended for
 * use from dcontrol or programmatic test control code, not from
 * application code.
 */
exports.destroyAllCommands = function (callback) {
    return (exports.deleteFromTables([
            "dinfra_schedulecommand",
            "dinfra_scheduleargsvalues",
            "dinfra_scheduleargsextends",
        ], callback));
}

/**
 * Destroy the database records of all sessions.  This is intended for
 * use from dcontrol or programmatic test control code, not from
 * application code.
 */
exports.destroyAllSessions = function (callback) {
    return (exports.deleteFromTables([
            "dinfra_sessionregos",
            "dinfra_sessionoptsvalues",
            "dinfra_sessionoptsextends",
        ], callback));
}

/**
 * Destroy the database records of all topic events.  This is intended
 * for use from dcontrol or programmatic test control code, not from
 * application code.
 */
exports.destroyAllTopicEvents = function (callback) {
    return (exports.deleteFromTables([
            "dinfra_topicmessages",
            "dinfra_topicjsonvalues",
            "dinfra_topicjsonextends",
            "dinfra_topiclastevent",
            "dinfra_topicsummary"
        ], callback));
}

/**
 * Opens a connection, like openWritableDB, except that it is
 * already set up with a transaction started.  The transaction
 * is committed when you call close(callback) and the callback(error)
 * to close will let you know if the transaction was successfully committed
 * or rolled back.  In order to ensure that the transaction rolls back on
 * close rather than commits, call cancel() (no args) on the connection,
 * then call close as usual.  Cancel can be called at any time prior to close.
 * These transactions are performed in REPEATABLE_READ transaction isolation
 * level, which means that any readers accessed with openReadableDB,
 * will see only full commits. 
 */
exports.openWritableTX = function (callback) {
        if (writableGroup == null) {
            throw new Error("illegal state - no writable group configured");
        }

        return (writableGroup.openTransaction(callback));
    };
/**
 * Opens a readable connection and notifies of it via the callback.
 * This returns undefined.  The resulting connection must be
 * closed with close() to return it to the pool.  Readable connections
 * may return data that is a little older than writable
 * connections (seconds).  Readable connections are otherwise
 * configured similarly to writable connections and connect to the
 * same database, albeit at a weaker transaction isolation level.
 */
exports.openReadableDB = function (callback) {
        return (readableGroup.openConnection(callback));
    };
/**
 * Opens a readable connection and notifies of it via the callback.
 * This is similar to a regular readable DB connection, except that
 * is transactional.  This is used in those cases where you query
 * a result set incrementally, or with several selects, and yet want
 * a cohesive view of the data.  The transaction is released on close.
 */
exports.openReadableTX = function (callback) {
        return (readableGroup.openTransaction(callback));
    };
/**
 * Opens a warehouse connection and notifies of it via the callback.
 * This returns undefined.  The resulting connection must be
 * closed with close() to return it to the pool.  Warehouse connections
 * may return data that is a lot older than writable or readable
 * connections (minutes) and typically connect to seperate database
 * isntances/schemas, with very weak, or no transaction isolation.
 */
exports.openWarehouseDB = function (callback) {
        return (warehouseGroup.openConnection(callback));
    };
/**
 * openLease(service, resource, refresh, callback)
 *
 * Acquire a lease on some resource, outside of a transaction.
 * Service is the local name of the component making the
 * request, resource is the resource in question (a URL path),
 * and refresh (optional) specifies the refresh time of the lease
 * in milliseconds.  The lease is returned by callback(error, lease).
 * The lease is not properly started until lease.register(callback) is
 * called, which will periodically call callback(error, lease) to
 * ensure that the lease is still valid.  The callback should then call
 * lease.acknowledge() to register its continuing interest, unless
 * error is set.  If error is set, it usually means that the lease
 * has been forcibly broken and operations should cease.  Always call
 * lease.close(callback) when done with a lease.  Callback is optional
 * on close, but will be called callback(error) when the lease is
 * closed.  Error can occur in this case only when the lease was broken
 * in the interim, or the infrastructure cannot connect to the database.
 */
exports.openLease = function (service, resource, refresh, userInfo, callback) {

        if (!(arguments[arguments.length - 1] instanceof Function)) {
            // No callback, promisify
            return (Q.nfcall(exports.openLease, service, resource, refresh));
        }

        if (arguments.length === 4) {
            // Optional arg userInfo has been omitted, so shift arguments right
            // starting at userInfo
            callback = userInfo;
            userInfo = undefined;
        }
        else if (arguments.length === 3) {
            // Optional args refresh and userInfo have been omitted, so shift
            // arguments right starting at refresh
            callback = refresh;
            userInfo = undefined;
            refresh = undefined;
        }

        if (!(callback instanceof Function)) {
            throw new Error("illegal argument, need callback function");
        }

        var opts = null;

        if (refresh == null) { // or undefined
            // nothing further
            opts = {};
        }
        else if (typeof(refresh) == "number") {
            // OK
            opts = { refresh: refresh };
        }
        else {
            opts = refresh;
        }

        var lease = new dlease.Lease(writableGroup,
            exports.logger(service), origin, resource,
            opts.refresh,
            opts.owner,
            opts.noqueuing,
            userInfo);

        return (lease._open(callback));
    };

/**
 * openSchemaUpgrade(service, tablePrefix, callback)
 *
 * Acquires a lease on /schema/ + tablePrefix and allocates a separate
 * writable connection for operating on table schemas relating to that
 * prefix.  callback(error, upgrade) is called to return a SchemaUpgrade
 * object.  The main three methods on that are:
 * - connection() returns the connection (no callback required)
 * - version() returns the current stored version of the base schema if any
 * - upgrade(infix, schema, callback) calls dschema.maintain() to upgrade
 * the given schema against the tables tablePrefix + infix.
 * 
 * callback(error) is called when upgrade() completes.  upgrade() also updates
 * the recorded version of the specific infix subschema and records what
 * version it is being upgraded to.
 *
 * Before performing the schema upgrade, upgrade() first compares the new
 * upgrade's schema version against the current schema version and only
 * proceeds with the upgrade if the new version is:
 * - greater than or equal to the current version, if in development mode; or
 * - greater than (but not if equal to) the current version, if in production
 * mode
 * 
 * @todo cleanup these version functions.
 */
exports.openSchemaUpgrade = function (service, tablePrefix, callback) {
        if (callback === undefined) {
            return (Q.nfcall(exports.openSchemaUpgrade, service, tablePrefix));
        }

        if (cloud) {
            // get lease first, then build upgrade 
            exports.openLease(service, "/schema/" + tablePrefix, 
                function (error, lease) {
                    if (error != null) {
                        return (callback(error));
                    }

                    new dschema.SchemaUpgrade(writableGroup,
                        {
                            lease: lease, // pass lease
                            // skip table compare when in production
                            trust: exports.isProduction(),
                        },
                        service, tablePrefix, callback).
                        openConnPrivate();
                });
        }
        else {
            // don't need a lease when there is no cloud
            new dschema.SchemaUpgrade(writableGroup, null,
                service, tablePrefix, callback).openConnPrivate();
        }

        return (undefined);
    };
/**
 * This just provides access to the same database logging implementation
 * that dinfra was launched with: this is useful for capturing logs
 * as they occur.
 */
exports.dlog = dlog;
/**
 * Again, just a helpful reference to prevent additional configuration
 * annoyances.
 */
exports.djson = djson;
/**
 * This links to some internal convenience functions that we expose
 * for testing purposes.  Probably best not to use these as a consumer
 * of the API at this stage.
 */
exports.denum = denum;
/**
 * This links to some internal convenience functions that we expose
 * for testing purposes.  Probably best not to use these as a consumer
 * of the API at this stage.
 */
exports.dservice = dservice;
/**
 * This links to some internal convenience functions that we expose
 * for testing purposes.  Probably best not to use these as a consumer
 * of the API at this stage.
 */
exports.dsearch = require('./dsearch');
/**
 * Only used for testing - ignore in public API.
 */
exports.devent = devent;
/**
 * Returns the logger for the specific named service.  Generally, a
 * logger is used simply as: logger.<level>(<arg>...)
 * where <level> is one of emerg, alert, critical, error, warning,
 * notice, info, debug, fine, finer and finest.  Arguments can
 * be anything that can be passed to JSON.stringify() safely, but
 * also includes special support for Error, so that stacks and
 * frames are carefully recorded in a searchable way.  Logger
 * can be used at any time, even before dinfra has been
 * configured.  The facility and priority are optional
 * and default to dlog.FACILITY.DAEMON and dlog.PRIORITY.FINEST.
 */
exports.logger = function (service, facility, priority) {
        if (service == null) {
            if ((config != null) && (config.origin != null) &&
                    (config.origin.serviceName != null)) {
                service = dconfig.origin.serviceName;
            }
            else {
                throw new RangeError("logger service must be specified");
            }
        }

        return (dlog.logger(service, facility, priority));
    };

 /**
 * Returns the "safe" logger for the specific named service. Differs
 * from "standard" loggers in that they pass log arguments by-value
 * instead of by-reference.
 */
exports.safeLogger = function (service, facility, priority) {
    if (service == null) {
        if ((config != null) && (config.origin != null) &&
                (config.origin.serviceName != null)) {
            service = dconfig.origin.serviceName;
        }
        else {
            throw new RangeError("logger service must be specified");
        }
    }

    return (dlog.safeLogger(service, facility, priority));
};

/**
 * A shutdown job is called in reverse order of registration when
 * shutdown is called.  Each job needs to call shutdown() (with no args) 
 * at the end of its shutdown exercise.  The job function is returned
 * by this to use as a handle for any removeShutdownJob().
 */
exports.addShutdownJob = function (job) {
        if (!(job instanceof Function)) {
            throw new RangeError("job must be a function");
        }

        var tidy = shutdownTidyStack.submit(function (callback) {
                shutdownTidyStack.naive = {
                        tidy: tidy,
                        callback: callback,
                    };

                return (job());
            });

        tidy.fn = job; // override the match function for find

        return (job);
    };

/**
 * Registers a new tidy shutdown handler and returns the wrapper
 * function for the handler.  The wrapper function can be called
 * to execute the job and remove it from the shutdown stack.
 * The wrapper is called wrapper(callback) - the wrapper will multiplex
 * properly between different invokers, so it can be called many
 * times safely to invoke fn just once, at any point in time before
 * or after shutdown has started.
 *
 * Shutdown handlers themselves are called fn(callback) and it is the
 * responsibility of the implementation to invoke the callback(error) 
 * in order not to stall the shutdown process - this is entirely
 * different to a shutdown job.  Shutdown handlers cannot be
 * short-cut by calling shutdown() again either.
 *
 * Shutdown handlers cannot be removed with removeShutdownJob(fn).
 * Use wrapper.cancel() if you want to remove the handler from the
 * shutdown stack without executing it.
 */
exports.newShutdownHandler = function (fn) {
        return (shutdownTidyStack.submit(fn));
    };

/**
 * A shutdown job can be removed after it has been registered.  If
 * a job is registered multiple times, the most recent registration
 * will be removed.  Note that removeShutdownJob() does not need
 * to be called during regular shutdown.  A job will be removed before
 * it is invoked.  This function will return null if the job was not
 * in the shutdown queue, possibly because it has already been executed
 * or started execution.
 */
exports.removeShutdownJob = function (job) {
        if (shutdownTidyStack.cancel(job) != null) {
            return (job);
        }

        return (null);
    };

/**
 * Opens a {@link Resource} by name using the given options.  The Resource
 * is supplied to the caller via callback(error, resource).  Resources
 * can acquire system resources while they are open, so remember that
 * they must always be closed: you cannot rely on garbage collection to
 * properly dispose of them.  If the resource does not exist and the opts
 * do not create a new resource, then the returned resource will be null.
 *
 * @param {string} name - the full path of the resource to open
 * @param {Object} opts - options (see example section below)
 * @param {Function} callback - called to return allocation resource 
 * @example
 * dinfra.openResource("/some-service/some-dir/some-file", opts {
 *     version: "1.23.5", // to address a specific version (if versioned)
 *     latest: true, // to address the latest version (if versioned)
 *     writable: true, // to open for writing, not just reading
 *     termination: true, // allow opening branch terminations
 *     connection: conn, // use connection, do not transact internally
 *     connection: true, // alloc connection, perform single transaction
 *     create: true, // to create this resource if it is not there
 *     terminate|delete: true, // delete this resource (or terminate a branch)
 *     link: target, // to link to a target by name (need not exist)
 *     encrypt: true, // encrypt this resource (if this is a create)
 *     branch: "1.23", // to branch from a specific version when creating
 *     sparse: rid, // a sparse version based on an internal target id 
 *     sparse: true, // a sparse version based on the branching version
 *     nominal: true, // create an immutable new version with old content
 *     meta: { }, // any meta data to provide with the initial create
 *     search: Analyzer.State, // free-text search support for the create
 *     keep: false, // if true, retains desktop files (for create/destroy).
 * }, function (error, resource) { ... });
 */
exports.openResource = function (name, opts, callback) {
        if (callback === undefined) {
            return (Q.nfcall(exports.openResource, name, opts));
        }

        if (opts == null) {
            opts = { };
        }

        var dirHint = dresource.dirHintResourceName(name);

        name = dresource.normalizeResourceName(name);

        var meta = opts.meta;

        // now make a copy of the options, since we're going to
        // alter it for our own purposes:
        opts = {
                version: opts.version,
                latest: opts.latest,
                writable: opts.writable,
                executable: opts.executable,
                termination: opts.termination,
                connection: opts.connection,
                link: opts.link,
                type: opts.type,
                create: opts.create,
                delete: (opts.delete || opts.terminate),
                encrypt: opts.encrypt,
                branch: opts.branch,
                sparse: opts.sparse,
                nominal: opts.nominal,
                search: opts.search, // for search support
                keep: opts.keep,
                meta: { } // an empty meta, since we deal with this differently
            };

        if (opts.version == null) { // either undefined or null
            if (opts.latest == null) { // either undefined or null
                opts.latest = true;
                opts.version = null;
            }
            else if (opts.latest) {
                opts.version = null;
            }
            else {
                throw new Error("no version supplied and not latest");
            }
        }
        else {
            if (opts.latest == null) { // either undefined or null
                opts.latest = false;
            }
            else if (!opts.latest) {
                // all is well
            }
            else {
                throw new Error("latest and version both supplied");
            }
        }

        if (opts.create == null) { // either undefined or null
            if (opts.link != null) {
                opts.create = true; // link is an emplicit create
            }
            else if (opts.nominal) {
                opts.create = true; // nominal is an implicit create
            }
            else if (opts.delete) {
                opts.create = true; // logical delete is an implicit create
            }
            else {
                opts.create = false; // otherwise we're not creating
            }
        }

        if (opts.writable == null) { // either undefined or null
            opts.writable = opts.create; // copy from create state
        }

        if (opts.create) {
            if (!opts.writable) {
                throw new Error("create provided with non-writable");
            }
            else if (opts.type == dresource.RTYPE.LINK) {
                if (opts.link == null) {
                    throw new Error("link type with no link value");
                }
            }
            else if (opts.type != null) {
                // assume its OK if it gets this far
            }
            else if (opts.link) {
                opts.type = dresource.RTYPE.LINK;
            }
            else if (dirHint) {
                opts.type = dresource.RTYPE.DIR;
            }
            else {
                opts.type = dresource.RTYPE.FILE;
            }

            if (opts.type == dresource.RTYPE.LINK) {
                if (opts.sparse) {
                    throw new Error("sparse provided with link");
                }

                if (opts.nominal) {
                    throw new Error("nominal provided with link");
                }

                // do not provide content-type
            }
            else if (opts.type == dresource.RTYPE.FILE) {
                if (opts.sparse) {
                    if (opts.nominal) {
                        throw new Error("sparse + nominal not supported");
                    }
                }
                else if (opts.nominal) {
                    // any other checks?
                }
                else {
                    // any other checks?
                }

                if (opts.meta == null) {
                    opts.meta = { };
                }

                /* we used to to do this, but don't anymore:

                if (opts.meta.headers == null) {
                    opts.meta.headers = { };
                }

                if (opts.meta.headers["content-type"] == null) {
                    // provide a default MIME content type
                    opts.meta.headers["content-type"] =
                        "application/octet-stream";
                }
                */
            }
            else if (opts.type == dresource.RTYPE.DIR) {
                if (opts.sparse) {
                    throw new Error("sparse + dir not supported");
                }

                if (opts.nominal) {
                    throw new Error("nominal + dir not supported");
                }

                // do not provide content-type
            }
            else {
                dresource.RTYPE.ensureValid(opts.type);
            }
        }
        else if (opts.type != null) {
            throw new Error("type provided with non-create opts");
        }
        else if (meta != null) {
            throw new Error("meta provided with non-create opts");
        }
        else {
            // presumeably OK options for a plain open
        }

        if (meta != null) {
            /*
                Don't worry about doing too deep a copy,
                just shallow copy the top level, since that's
                all we'll modify.

                This is technically just an overwrite of our
                calculated results, which is why it comes at the end.
            */

            for (var key in meta) {
                opts.meta[key] = meta[key];
            }
        }

        if (opts.search != null) {
            opts.meta.search = opts.search.asSearchJSONProtected();
        }

        if (resourceManager == null) {
            throw new Error("no resource manager defined: " +
                "you may need to wait for dinfra configure to complete");
        }

        var retry = 1; // start with a retry of 1ms.
        var retryMax = 30000; // maxium retry of 30s.
        var openFunction = function (error, resource) {
                if (error == null) {
                    callback(null, resource); // resource may be null
                }
                else if (error.retry) { // we can retry this
                    retry = denum.randomExponentialBackoff(retry, 2,
                        retryMax);

                    // @todo consider using a formal retry manager for this
                    setTimeout(resourceManager.openResource.
                        bind(resourceManager, name, opts, openFunction),
                        retry);
                }
                else {
                    callback(error, null); // definitely no resource
                }
            };

        if (opts.create) {
            /*
                If the operation is a create, make sure that the
                target directory exists - we do this by looping
                back into the dinfra.openResource() rather than
                using the resourceManager.openResource() so that
                we are sure to trigger further resource hierarchy
                creates and handle retries as needed.  The resource
                manager is not responsible for those two functions.
            */

            // reliable because trailing slash has already been removed ...
            var slashIndex = name.lastIndexOf("/");

            if (slashIndex < 0) {
                resourceManager.openResource(name, opts, openFunction);
            }
            else {
                var parentName = name.substr(0, slashIndex + 1);

                exports.openResource(parentName,
                    { }, // what about branches?
                    function (error, resource) {
                        if (error != null) {
                            return (callback(error));
                        }

                        if (resource != null) {
                            // parent exists - close it and go ahead
                            return (resource.close(function (error) {
                                    if (error != null) {
                                        return (callback(error));
                                    }

                                    resourceManager.openResource(name,
                                        opts, openFunction);
                                }));
                        }

                        exports.openResource(parentName,
                            { create: true }, // what about branches?
                            function (error, resource) {
                                if (error != null) {
                                    return (callback(error));
                                }

                                if (resource == null) {
                                    return (callback(
                                        new Error("illegal state: " +
                                        parentName + " not created")));
                                }

                                // parent created - close it and go ahead
                                return (resource.close(function (error) {
                                        if (error != null) {
                                            return (callback(error));
                                        }

                                        resourceManager.openResource(name,
                                            opts, openFunction);
                                    }));
                            });
                    });
            }
        }
        else {
            resourceManager.openResource(name, opts, openFunction);
        }

        return (undefined);
    };

/**
 * Opens a public {@link Resource} resource using the given options.
 *
 * Public resources are stored in the resource tree at /public.
 *
 * This function should be to used to open public resources instead of {@link openResource} to
 * protect non-public resources from exposure.
 *
 * The Resource is supplied to the caller via callback(error, resource). Resources can acquire
 * system resources while they are open, so remember that they must always be closed: you cannot
 * rely on garbage collection to properly dispose of them.  If the resource does not exist and the
 * opts do not create a new resource, then the returned resource will be null.
 *
 * @param {string} path - the path name of the resource to open relative to /public
 * @param {Object} opts - options (see {@link openResource} for list of available options)
 * @param {Function} callback - called to return allocation resource 
 */
exports.openPublicResource = function (name, opts, callback) {

        var resourcePrefix = "/public/";
        var rpath = resourcePrefix + name;

        // Strip out '..' so that non-public folders are inaccessible. Simply removing all
        // occurrences of '..' is sufficient as later path normalization will remove any resulting
        // empty path segments.
        rpath = rpath.replace('..', '');
        
        exports.openResource(rpath, opts, function (error, resource) {
                callback(error, resource);
            }.bind(this));
    }

/**
 * Destroy a set of resources corresponding the results of a resource
 * query.  On termination, invokes callback(error, items) where items
 * are the deleted result set.  If the resourceQuery is a string,
 * then it is interpreted as a resource path prefix and all resources,
 * including versions, terminations and so forth, will be destroyed.
 */
exports.destroyResources = function (resourceQuery, callback) {
        if (typeof(resourceQuery) == "string") {
            resourceQuery = exports.queryResources().
                withNoAssumptions().
                withNamePrefix(resourceQuery);
        }

        var queue = new denum.RunQueue();
        var items = [];

        callback = denum.singleCallback(callback);

        return (resourceQuery.
            on('error', callback).
            on('result', function (result) {
                items.push(result);

                queue.submit(function (callback) {
                        return (exports.destroyResource(result.name,
                            result.version, callback));
                    });

                return (this.next());
            }).
            on('end', function () {
                return (queue.wait(function (error) {
                        return (callback(error, items));
                    }));
            }).
            next()); // start
    };

/**
 * Destroy an individual resource of a given name and version.
 */
exports.destroyResource = function (name, version, callback) {
        if (callback === undefined) {
            return (Q.nfcall(exports.destroyResource, name, version));
        }

        if (callback === null) {
            callback = function (error) {
                    if (error != null) {
                        logger.error("destroyResource failed", error);
                    }
                    else {
                        // do nothing
                    }
                };
        }

        var filter = null;
        var openOpts = {
                writable: true, // need a writable connection
                create: false, // do not create if it doesn't exist
                termination: true, // open terminations here as well
                connection: true, // allocate a single connection
            };

        if (version instanceof Function) {
            filter = version; // filter function is version
            version = null; // clear version, since its not real
            openOpts.latest = true; // choose latest, then filter
        }
        else {
            openOpts.version = version; // OK if null - choose specific/latest
        }

        exports.openResource(name, openOpts,
            function (error, resource) {
                if (error != null) {
                    callback(error);
                }
                else if (resource == null) {
                    // no such resource
                    callback(null, null);
                }
                else {
                    var versions = [];

                    resource.destroyOnClose = [];

                    if (filter == null) {
                        versions.push(resource.version);
                        resource.destroyOnClose.push(resource.id);
                    }
                    else {
                        for (var rversion in resource.versions) {
                            var record = resource.versions[rversion];

                            if (filter(record.id, resource.name,
                                    rversion)) {
                                versions.push(rversion);
                                resource.destroyOnClose.push(record.id);
                            }
                        }
                    }

                    resource.close(function (error) {
                            callback(error, versions);
                        });
                }
            });
    };

exports.writeResourceArchiveTo = function (writable, pathPrefix, opts) {
        return (resourceManager.
            writeArchiveTo(writable, pathPrefix, opts));
    };

/**
 * This can be used to direct the results of a resource query to an
 * archive of some sort.  Currently supported archives are only the
 * the content-free, meta-data-only json.gz for the non-db-based desktop
 * resource layer, with these options: { format: "file", content: false }.
 */
exports.createResourceArchiveQueryHandler = function (writable, opts) {
        return (resourceManager.
            createArchiveQueryHandler(writable, opts));
    };

/**
 * Exit immediately with a code and a console message.
 */
exports.exit = function (exitCode, reason) {
        if (reason != null) {
            console.log("exit:", exitCode, "reason:", reason);
        }

        process.exit(exitCode);
    };

/**
 * Return the time when shutdown is due to expire.  This can be used
 * to determine if shutdown has begun, and how much time there is left
 * to persist state.  Note that non-naive shutdown handlers are immune from
 * premature termination, so this value can be in the past.
 */
exports.shutdownExpires = function () {
    return (shutdownTidyStack.expires);
}

/**
 * Shut the process down gracefully.  Because of the calling parameters,
 * dinfra.shutdown can be used without wrapping in many situations,
 * since if it is called with an error as the first parameter, it
 * will automatically log the error and begin the shutdown sequence.
 * Similarly, it can be easily used as an 'end' handler, if the end
 * event expects no arguments, or the first parameter is null in the case
 * of no error.
 *
 * @param anExitCode - (optional) 0 for normal, 1 for failure.
 * @param message... - (optional) log message; assume failure without anExitCode
 */
exports.shutdown = function () {    
    var anExitCode = arguments[0];
    var argFrom = 0;

    if (arguments.length == 0) {
        anExitCode = 0;
    }
    else if (anExitCode == null) {
        anExitCode = 0;
        argFrom = 1;
    }
    else if (typeof(anExitCode) != "number") {
        anExitCode = 1;
    }
    else {
        argFrom = 1;
    }

    if (argFrom < arguments.length) {
        var args = ["shutdown"];
        var argi = argFrom;

        while (argi < arguments.length) {
            args.push(arguments[argi++]);
        }

        if (anExitCode == 0) {
            logger.notice.apply(logger, args);
        }
        else {
            logger.critical.apply(logger, args);
        }
    }

    if (anExitCode > shutdownExitCode) {
        shutdownExitCode = anExitCode;
    }

    /*
        If this is the first time that shutdown has been called,
        then set up an interval timer to let the user know what's
        going on.  If the shutdown takes too long and the current
        job is a naive one, then terminate with a process exit,
        otherwise just indicate that its taking longer than expected.
    */
    if (shutdownTidyStack.interval == null) {
        var expires = Date.now() + SHUTDOWN_TIMEOUT;
        var delay = 5000;
        var shutdownReports = false;

        if (shutdownReports) {
            console.log("shutting down", SHUTDOWN_TIMEOUT / 1000, "s");
        }

        shutdownTidyStack.expires = expires;
        shutdownTidyStack.interval = setInterval(function () {
                var now = Date.now();

                if (now < expires) {
                    if (shutdownReports) {
                        console.log("shutting down",
                            Math.floor((expires - now) / 1000), "s");
                    }
                }
                else if (shutdownTidyStack.naive == null) {
                    console.log("shutting down",
                        Math.floor((now - expires) / 1000), "s", "overdue");
                }
                else {
                    console.log("shutdown timeout exceeded");
                    process.exit(1);
                }
            }, delay);
    }

    var naive = shutdownTidyStack.naive;

    if (naive != null) {
        /*
            When naive is not null, it means that an old-style shutdown
            job has been started.  Its only way of indicating that it
            has finished is to call shutdown() again, with or without
            an error or exit code.  This worked well in that multiple
            ctrl-c's would for example, enable each stage of the
            shutdown stack to execute even if a job had stalled.

            The only way that naive can be non-null is if shutdown has
            already started, which means we can safely assume that the
            new style shutdownTidyStack.complete() function has been
            called.

            So when this happens, we clear the naive property, and
            invoke its callback so that it enables the rest of the
            shutdown to run.
        */
        shutdownTidyStack.naive = null;

        return (naive.callback(arguments[argFrom]));
    }

    /*
        It is possible that complete() will be invoked more than
        once, but that is safe for tidy stack.  The exit procedure
        is synchronous and terminates the process, so even if
        multiple calls have been queued, only one will get executed.
    */
    return (shutdownTidyStack.complete(function () {
            exports.exit(shutdownExitCode, null);
        }));
}

/** 
 * Returns true if shutdown() has been called.  This doesn't necessarily
 * mean that a shutdown() is continuing as it should, but it does at least
 * state that it has been initiated.
 */
exports.isShuttingDown = function () {
    return (shutdownExitCode >= 0);
}

/**
 * legacy configuration uses the nominated location of the
 * ccs_cloud/_environment/config dir for bootstrapping database. 
 */
exports.configureLegacy = function (legacyConfigPrefix, legacyLandscape,
            callback) {
        if (callback === undefined) {
            return (Q.nfcall(exports.configureLegacy, legacyConfigPrefix,
                    legacyLandscape));
        }

        var legacyObfusc = require("./legacy-obfusc.json");

        if (legacyLandscape == null) { // either undefined or null
            legacyLandscape = process.env.SITE_NAME;

            if (legacyLandscape == "") {
                legacyLandscape = null;
            }

            if (legacyLandscape == null) { // either undefined or null
                throw new Error("either pass the legacy landscape name or " +
                    "set the SITE_NAME environment variable");
            }

            if (legacyLandscape == "default") {
                throw new Error("to avoid accidentally writing to M0, " +
                    "default is not allowed as a landscape name");
            }
        }

        var legacyConfigPath = legacyConfigPrefix + legacyLandscape + ".json";
        var legacyConfig;

        try {
            require.resolve(legacyConfigPath);
        }
        catch (error) {
            legacyConfigPath = legacyConfigPrefix + "default.json";
        }

        legacyConfig = require(legacyConfigPath);

        if (legacyConfig.database == null) { // either undefined or null
            // do that again, but use default and issue loud and clear warning
            legacyConfig = require(legacyConfigPrefix + "default.json");

            logger.warning("legacy configuration points to M0 database");
        }

        var decipher = function (text, fallback) {
                var result = "";

                if (text == null) {
                    result = fallback;
                }
                else {
                    var cipher = crypto.createDecipher(legacyObfusc.alg,
                        legacyObfusc.key);

                    result += cipher.update(text, legacyObfusc.encoding,
                        legacyObfusc.charset);

                    result += cipher.final(legacyObfusc.charset);
                }

                return (result);
            };
        var osHost = os.hostname();
        var osUser = process.env.USER;
        var legacyDBHost = decipher(legacyConfig.database.host, osHost);
        /*
            Generate the infrastructure configuration from the
            legacy database config, the landscape name and some
            execution environment.
        */
        var config = {
                "origin": {
                    "landscape": legacyLandscape,
                    "cluster": "legacy",
                    "instance": osHost
                },
                "databases": {
                    "defaults": {
                        "type": "mysql",
                        "user": decipher(legacyConfig.database.user,
                            osUser),
                        "password": decipher(legacyConfig.database.password,
                            "password"),
                        "database": decipher(legacyConfig.database.database,
                            "ticloudtools"),
                    },
                    "primary": {
                        "host": legacyDBHost
                    },
                    "secondary": {
                        "host": legacyDBHost
                    },
                    "tertiary": {
                        "host": legacyDBHost
                    },
                    "warehouse": {
                        "host": legacyDBHost
                    }
                }
            };

        function hint(text) {
            var i = 0;
            var l = text.length;
            var r = "";

            while (i < l) {
                if ((i == 0) || (i == l - 1)) {
                    r += text[i];
                }
                else {
                    r += "*";
                }

                i++;
            }

            return (r);
        }

        var moduleName = require.main.filename;
        var workingPath = process.cwd();

        if (moduleName.indexOf(workingPath + "/") == 0) {
            moduleName = moduleName.substr(workingPath.length + 1);
        }

        logger.info("legacy infrastructure",
            {
                directory: workingPath,
                module: moduleName,
                database: {
                    user: config.databases.defaults.user,
                    host: config.databases.primary.host,
                    "password-hint": hint(config.databases.defaults.password),
                    database: config.databases.defaults.database,
                },
            });
                
        configure(config, callback);
    };

/**
 * Generates a legacy configuration stub for use in
 * dinfra testing only - not intended for users.
 */
exports.generateLegacy = function (aConfig) {
        if (aConfig == null) {
            aConfig = config;
        }

        var legacyObfusc = require("./legacy-obfusc.json");

        var encipher = function (text, fallback) {
                var result = "";

                if (text == null) {
                    text = fallback;
                }

                var cipher = crypto.createCipher(legacyObfusc.alg,
                    legacyObfusc.key);

                result += cipher.update(text, legacyObfusc.charset,
                    legacyObfusc.encoding);

                result += cipher.final(legacyObfusc.encoding);

                return (result);
            };
        var osHost = os.hostname();
        var osUser = process.env.USER;

        return ({
                "database": {
                    user: encipher(aConfig.databases.defaults.user, osUser),
                    password: encipher(aConfig.databases.defaults.password,
                        "password"),
                    database: encipher(aConfig.databases.defaults.database,
                        "ticloudtools"),
                    host: encipher(aConfig.databases.primary.host,
                        osHost)
                },
            });
    };

util.inherits(Jobs, EventEmitter);

function Jobs(opts) {
    EventEmitter.call(this);

    if (opts == null) {
        opts =  {};
    }

    this.running = [];
    this.maxRunning = 0;
    this.queue = [];
    this.maxQueue = 0;
    this.started = Date.now();
    this.jobsStarted = 0;
    this.jobsCompleted = 0;
    this.jobsElapsed = 0;
    this.errors = [];
    this.limit = 1 * (opts.limit != null ? opts.limit : 10);
    this.accept = true; // accept jobs

    var trace = jobsTrace;

    if (trace) { // trace
        var self = this;

        ["error", "warning", "running", "completed", "blocking", "drained"].
            forEach(function (event) {
                self.on(event, function () {
                        trace("job event", event, {
                                running: this.running.length,
                                queue: this.queue.length,
                                limit: this.limit,
                            });
                    });
            });
    }
}

Jobs.prototype.quiesce = function (callback) {
    this.accept = false; // do not run or accept new jobs

    while (this.queue.length > 0) {
        this.failPrivate(this.queue.splice(this.queue.length - 1)[0]);
    }

    this.drain(callback);
}

Jobs.prototype.drain = function (callback) {
    if (callback == null) {
        // just ignore
    }
    else if (this.running.length == 0) {
        callback();
    }
    else {
        this.once('drained', callback);
    }
}

Jobs.prototype.failPrivate = function (job) {
    this.emit('failing', job.fn);

    if (job.callback != null) {
        job.callback(new Error("failed"));
    }
}

Jobs.prototype.runPrivate = function (job) {
    this.running.push(job);

    if (this.running.length > this.maxRunning) {
        this.maxRunning = this.running.length;
    }

    this.jobsStarted++;

    var self = this;
    var started = Date.now();

    this.emit('running', job.fn);

    if (job.callback != null) {
        job.callback();
    }

    job.fn(function (error) {
            var index = self.running.indexOf(job);

            if (index < 0) {
                var message = "job called back more than once";

                self.emit('warning', message);
            }
            else {
                var elapsed = Date.now() - started;

                self.jobsCompleted++;
                self.jobsElapsed += elapsed;

                // remove job from running
                self.running.splice(index, 1);

                self.emit('completed', job.fn, error, elapsed);

                if (error != null) {
                    self.quiesce(null); // do not accept new jobs
                    self.errors.push(error);
                    self.emit('error', error);

                    if (self.running.length == 0) {
                        self.emit('drained', true);
                    }
                }
                else if (self.queue.length > 0) {
                    if (self.queue.length == 1) {
                        self.emit('blocking', false);
                    }

                    self.runPrivate(self.queue.splice(0, 1)[0]);
                }
                else {
                    if (self.running.length == 0) {
                        self.emit('drained', true);
                    }
                }
            }
        });
}

Jobs.prototype.submit = function (fn, callback) {
    var job = {
            fn: fn,
            callback: callback,
        };

    if (!this.accept) {
        this.failPrivate(job);
    }
    else if (this.running.length < this.limit) {
        this.runPrivate(job);
    }
    else {
        if (this.queue.length == 0) {
            this.emit('blocking', true);
        }

        this.queue.push(job);

        if (this.queue.length > this.maxQueue) {
            this.maxQueue = this.queue.length;
        }
    }
}

Jobs.prototype.generateStats = function () {
    var elapsed = Date.now() - this.started;

    if (elapsed == 0) {
        elapsed = 1;
    }

    return ({
            elapsed: { value: elapsed, measure: "ms" },
            jobs: { value: this.jobsCompleted, measure: "" },
            maxRunning: { value: this.maxRunning, measure: "" },
            maxQueue: { value: this.maxQueue, measure: "" },
            jobsElapsed: { value: this.jobsElapsed },
            averageRun: { value: ((this.jobsCompleted > 0) ? 
                (this.jobsElapsed / this.jobsCompleted) : 0), measure: "ms" },
            runRate: { value: Math.floor(this.jobsCompleted /
                (elapsed / 1e3)), measure: "/s" },
        });
}

exports.Jobs = Jobs;

function uncaughtExceptionHandler(error) {
    try {
        logger.critical("uncaught exception",
            {
                cwd: process.cwd(),
                exe: process.execPath,
                platform: process.platform,
                args: process.argv,
                memory: process.memoryUsage()
            },
            error);
    }
    finally {
        exports.shutdown(1); // graceful shutdown
    }
}

/**
 * uncaught(yes) determines whether dinfra should inject an uncaught exception
 * handler into the node.js v8 runtime.
 * If false, nothing is done and uncaught exceptions will normally halt the
 * process.  However, if yes is true, an exception handler
 * will be injected to handle uncaught exceptions which will instead log
 * the exception and perform a graceful shutdown.  Note that if yes is
 * not provided, it defaults to true, so uncaught() is equivalent to
 * uncaught(true).  It can be safely called multiple times without
 * injecting additional handlers.
 */
exports.uncaught = function (yes) {
    if ((yes === null) || (yes === undefined)) {
        yes = true; // behave as though true, not false
    }

    if ((uncaught == true) != (yes == true)) {
        uncaught = yes;

        if (uncaught) {
            process.addListener('uncaughtException',
                uncaughtExceptionHandler);
        }
        else {
            process.removeListener('uncaughtException',
                uncaughtExceptionHandler);
        }
    }
}

exports.registerStatusResponder = function (name, version) {
        var dstatus = require('./dstatus');

        return (new dstatus.StatusResponder(name, version));
    };

exports.newResourceService = function (root, opts) {
        var drservice = require('./drservice');

        return (new drservice.ResourceService(root, opts));
    };

exports.parseVersion = denum.parseVersion;
exports.compareVersions = denum.compareVersions;
exports.incrementVersion = denum.incrementVersion;

["loadGZJSONPath", "saveGZJSONPath", "loadJSONStream", "saveJSONStream"].
    forEach(function (name) {
        exports[name] = djson[name];
    });

exports.origin = null; // origin we calculate during configuration
exports.address = null; // address we calculate during configuration
exports.discoverAddress = discoverAddress;
exports.queryResources = function () {
        return (resourceManager.newResourceQuery());
    };
exports.dschema = dschema; // make direct schema easy to find/DEBUG
exports.Q = Q; // make it easy to find
exports.registerService = null; // only valid in cloud environment
exports.topicEmitter = null; // only valid in cloud environment
exports.hasResourceVersionSupport = false;
exports.queryServices = null; // only valid in cloud environment
exports.querySessions = null; // only valid in cloud environment
exports.FileTreeStepper = dfile.FileTreeStepper;
/**
 * opts: {
 *     batcher: { ... }, // see newResourceBatcher() for option details
 *     // if batcher is missing or null, batching is not used
 * }
 */
exports.newResourceImporter = function (localTreePath, resourcePrefix, opts) {
        return (resourceManager.newResourceImporter(localTreePath,
            resourcePrefix, opts));
    };
/**
 * opts: {
 *     opBatchSize: 512, // number of operations per operation batch
 *     contentBatchSize: 16, // number of buffers per content batch
 * }
 */
exports.newResourceBatcher = function (opts) {
        return (resourceManager.newResourceBatcher(opts));
    };

/**
 * DControl will manage this declaratively from the dcontrol configuration
 * files and command line.  This uses the shell environment variable NODE_ENV,
 * which is specific to "express" in fact (not node.js generally).  As
 * an approach this is quite flawed, because it makes it difficult to
 * ensure the consistency of the configuration, due to unknown
 * interactions with the shell environment on the target system.
 *
 * This can mean that this is quite unreliable in development where
 * the process can be launched outside of dcontrol.  So in production,
 * this will always be true due to the wrappers that we use and the
 * declarations in the various files.  However in development its value
 * is not necessarily determined by configuration.
 *
 * When true, this shortcuts the startup of various elements of the
 * system; switches on certain scalable processing features, and
 * switches off certain development preferred behaviour.  Similar
 * changes should be exhibited by the express module, if used.  Also note
 * that this question will be invalid before dinfra configuration and
 * it will be an error to call it until configuration has started.
 */
exports.isProduction = function () {
        return (exports.getMode() == "production");
    };

/**
 * This returns the mode from which isProduction() is derived.
 * Its best to use isProduction(), since that gives you namespace safety.
 * This is guaranteed to return a valid non-empty string value.
 * It is mostly used internally.  Note that the internal implementation
 * of this may change so that is driven purely through a single-source
 * declarative origin, rather than working from the express NODE_ENV,
 * so do not rely on NODE_ENV to reflect the required mode.  Also note
 * that this value will be invalid before dinfra configuration and
 * it will be an error to call it until configuration has started.
 */
exports.getMode = function () {
        var mode = process.env["NODE_ENV"];

        if ((mode == "") || (mode == null)) {
            mode = "development";
        }

        return (mode);
    };

/**
 * Different versions of node support getting the port from an
 * address in different ways, so wrap up the ability to this into
 * a simple function, given the server object.
 */
exports.getServerPort = function (server) {
        // @todo fix this for later versions of node than 0.10?
        return (server.address().port);
    };

/**
 * getBasePort(offset) interacts with the configuration to allow an
 * application to bind to a well-known port, with an explicit base.
 * The offset is typically the protocol default port number (for example,
 * 80 for HTTP).  The offset is added to the configured base port
 * (defaulting to 8000), resulting in for example: 8080 for HTTP.
 * Since the base port is configuration driven, this allows
 * dcontrol to deploy multiple instances of services that need
 * to bind to well known ports on the same IP address.
 */
exports.getBasePort = function (offset) {
        if (config == null) {
            throw new Error("can only be called after dinfra.configure");
        }

        var port = config.origin.basePort;

        if (!port) {
            port = 8000; // base port defaults to 8000 always.
        }

        if (offset == null) {
            // port remains the same
        }
        else {
            port += offset;
        }

        port = Math.floor(1 * port); // coerce to a number

        if (Number.isNaN(port)) {
            throw new Error('invalid configuration or offset');
        }

        return (port);
    };

/**
 * getHardPort(offset) interacts with the configuration to allow an
 * application to bind to an emphemeral port by default (ie. port 0),
 * but be able to be easily overridden from the dcontrol command line
 * to bind to a specific port under certain circumstances.  For hard
 * ports, the conventional offset is zero (or no parameter).  Setting
 * the hard port is commonly used in debugging, for example:
 *
 * dcontrol run -H 4000 pinmux
 *
 * If pinmux called getHardPort() to get the port number parameter to
 * use for listen() calls, then this would launch pinmux with a listener
 * on port 4000.  However, if the "-H 4000" arguments were missing from
 * the command line, getHardPort() would return zero, and thus the listen()
 * would bind to an ephemeral port instead.
 *
 * So getHardPort() is used mostly to support convenient debugging when
 * iterating invocations of an application (which would otherwise result
 * in binding to random ports, requiring browser URL changes).
 */
exports.getHardPort = function (offset) {
        if (config == null) {
            throw new Error("can only be called after dinfra.configure");
        }

        var port = config.origin.hardPort;

        if (!port) {
            port = 0; // always return zero to bind to an empheral port
        }
        else if (offset == null) {
            // port remains the same
        }
        else {
            port += offset;
        }

        port = Math.floor(1 * port); // coerce to a number

        if (Number.isNaN(port)) {
            throw new Error('invalid configuration or offset');
        }

        return (port);
    };

exports.newResourceStepper = function (resourcePrefix) {
        return (new dresource.ResourceStepper(resourceManager,
            resourcePrefix));
    };

/**
 * Causes error events sent to non-listening EventEmitters
 * to be logged with information about the target object and
 * call stack location, as well as the original error.  This
 * should not be used in production code - its intended for
 * debugging the origin of missing error listeners.
 */
exports.interceptEmitterErrors = function () {
        if (EventEmitter.zemit == null) {
            EventEmitter.prototype.zemit = EventEmitter.prototype.emit;
            EventEmitter.prototype.emit = function (name, error) {
                    if ((name == "error") && !this.listeners(name).length) {
                        logger.error('missing error event listener', {
                                target: this,
                                emitter: new Error(),
                                error: error,
                            });
                    }

                    this.zemit.apply(this, arguments);
                }
        }
    };


/**
 * Returns true if time (usually from the DB or a peer), is "reasonably"
 * within a begin ... end range (typically a transaction).  In this case,
 * "reasonably" means within about a four second range, biased slightly
 * towards delayed.  Whether time is synchronized is important for 
 * landscape management.
 */
exports.timeSynchronized = function (begin, time, end) {
        return ((time >= begin - 1500) && (time <= end + 2500));
    };

/**
 * Copies the current configuration and returns the copy for
 * subsequent modification - usually used for invoking new
 * services in separate processes.
 */
exports.copyConfig = function () {
        var result;

        if (config == null) {
            result = null;
        }
        else {
            result = JSON.parse(JSON.stringify(config));
        }

        return (result);
    };

/**
 * Call openContainment to create a Containment object for
 * resource mount support and application containment.
 * @method
 * @param {Object} opts - options that govern control location
 * @see {@link Containment} for details.
 */
exports.openContainment = dcontain && dcontain.openContainment;
exports.newWorkspace = dworkspace && dworkspace.newWorkspace;
exports.DockerService = dockerService && dockerService.DockerService
exports.newDockerServer = dockerServer && dockerServer.newDockerServer;
exports.newDockerClient = dockerServer && dockerServer.newDockerClient;
exports.newDockerRequestServer = dockerServer && dockerServer.newDockerRequestServer;
exports.newDockerRequestClient = dockerServer && dockerServer.newDockerRequestClient;
exports.TopicEmitter = dtopic && dtopic.TopicEmitter;

exports.newQueryExprFactory = function () { 
        return (new dschema.QueryExprFactory());
    };

exports.newResourceFS = function (prefix, opts) { 
        return (resourceManager.newResourceFS(prefix, opts));
    };

/**
 * Write a raw dump of the collection to the given stream - this
 * is only intended for debugging purposes, not backups etc.
 * Also, only works on LevelDB right now.
 */
exports.rawCollectionDump = function (stream, collection, callback) {
        return (readableGroup.rawCollectionDump(stream, collection, callback));
    };

var junkCounter = 0;

exports.openJunkDir = function (opts, callback) {
        var dir = "/var/tmp/junk-" + process.pid + "-" + Date.now() + "-" +
            (junkCounter++);

        return (fs.mkdir(dir, opts, function (error) {
                if (error != null) {
                    return (callback(error));
                }

                return (callback(error, dir));
            }));
    };

exports.invokeOverJunkDir = function (opts, fn, callback) {
        if ((opts instanceof Function) && (arguments.length == 2)) {
            callback = fn;
            fn = opts;
            opts = { "mode": ((6 << 6) | (6 << 3) | 6) };
        }

        return (denum.invokeWrapper(exports.openJunkDir.bind(exports, opts),
            fn,
            function (failure, dir, callback) {
                return (denum.removeAllFiles(dir, {}, callback));
            },
            callback));
    };

/**
 * Takes a file path name, like ../test/<base>.js and
 * returns a name like "test/<base>-t<ms>-p<pid>" that can be used
 * as a unique name for loggers and services in test code.  It has
 * the added advantage of marking the time started and the process.
 */
exports.uniqueTestName = function (filePathName) {
        return ("test/" +
            filePathName.replace(/^(.*\/)?([^\/]*)\.js$/, "$2") +
            "-t" + Date.now() +
            "-p" + process.pid);
    };

/**
 * Simple string argument processor: if the arg is null, undefined or "default"
 * then the result is def; if the arg is parseable JSON,
 * it is intrepreted as the parsed result; otherwise, this returns the
 * arg string.
 */
exports.defaultArg = function (arg, def) {
        var result;

        if (arg == null) {
            result = def;
        }
        else if (arg == "default") {
            result = def;
        }
        else {
            try {
                result = JSON.parse(arg);
            }
            catch (e) {
                // ignore parse errors completely, and treat result as string
                result = arg;
            }
        }

        return (result);
    };

/**
 * Reads the next argument from the args list or uses the default.
 * Reports the action taken with the given name to console.
 */
exports.reportArg = function (name, args, def, units) {
        var result = exports.defaultArg(args.shift(), def);
        var report = "reportArg " + name + "=" + result;

        if (def !== undefined) {
            if (result !== def) {
                report += " (overrides " + def + ")";
            }
            else {
                report += " (default)";
            }
        }

        if (units != null) {
            report += " " + units;
        }

        console.log(report);

        return (result);
    };

/**
  * Store landscape release information in database
  * @param {object} infoJSON - JSON contain landscape name, release and 
  *        product information (all fields are mandatory). 
  * @param {Function} callback - called to return code 0 if successfully 
  *        write/update to database
  * @example input JSON
  *        {
  *              landscape: "ccs.ti.com", 
  *              release: "v1.6.0.2018-01-01", 
  *              product: "18.01.08"
  *        }
  */
exports.landscapeReleaseInfoUpdate = function (infoJSON, callback) {
    var releaseInfoResPrefix = "/landscapeReleases/";

    if (!infoJSON || typeof(infoJSON) != 'object') {
        return (callback(new RangeError("invalid input: " + infoJSON)));
    } else if (!infoJSON.landscape) {
        return (callback(new RangeError("missing landscape name: " 
                                            + infoJSON)));
    } else if (!infoJSON.release) {
        return (callback(new RangeError("missing release version: " 
                                            + infoJSON)));
    } else if (!infoJSON.product) {
        return (callback(new RangeError("missing product version: " 
                                            + infoJSON)));
    } 
        
    var path = releaseInfoResPrefix + infoJSON.landscape + '/' + infoJSON.release;
    
    // using resource API create a resource with landscape/releaseVersion 
    // and save release information JSON as its meta data
    exports.openResource(path, {
            create: true,
        }, function (error, resource) {
            if (error != null) {
                return (callback(error));
            }
            
            resource.setMeta("releaseVersion", infoJSON.release);
            resource.setMeta("productVersion", infoJSON.product);
            resource.setMeta("packageDate", Date.now());

            return (resource.close(function (error) {
                if (error != null) {
                    return (callback(error));
                }

                callback(null, 0);
            }));
        });
}

/**
  * Query landscape release information in database
  * @param {object} query - landscape name and how many last records to query 
  *         (landscape name is mandatory, last has default value 1)
  * @example output JSON
  *  {
  *      "releaseVersion": "v1.6.0.2018-01-01_01",
  *      "productVersion": "18.01.01",
  *      "packageDate": "2018-02-02T14:48:45.909Z"
  *  }
  */
exports.landscapeReleaseInfoQuery = function (query, callback) {
    var queryLandscape = null;
    var nRecords = null;
    var retIsArray = true; 
    var releaseInfoResPrefix = "/landscapeReleases/";

    // check query input is a JSON or string
    if (typeof(query) === "string") {
        queryLandscape = query;
        nRecords = 1;
        retIsArray = false; // return JSON instead of JSON array
    } else if (typeof(query) === 'object') {
        if (query.landscape == null) {
            return callback(new RangeError("missing query landscape name: " 
                                                + query));
        } else {
            queryLandscape = query.landscape;

            if (query.last == null) {
                nRecords = 1;
            } else {
                if (query.last < 1 ) {
                    return (callback(new RangeError("need to query" + 
                                " at least one record")));
                }
                nRecords = query.last;
            }
        }
    } else {
        return (callback(new RangeError("illegal query input: " + query)));
    }

    var path = releaseInfoResPrefix + queryLandscape + '/';
    var resultList = [];

    exports.queryResources().
        withNoAssumptions().
        withNamePrefix(path).
        withOrderByName().
        on('result', function (result) {
            if (result.meta == null) {
                // ignore
            }
            else {
                resultList.push(result.meta);
            }

            this.next();
        }).
        on('end', function () {
            if (resultList.length == 0) {
                return (callback(new Error("No existing records found")));
            } else if (nRecords > resultList.length) {
                nRecords = resultList.length;
            } else if (retIsArray == false) {
                // expect only the latest record
                return (callback(null, resultList[resultList.length-1]));
            }
            
            var recordArray = [];

            for (var i = resultList.length - 1; 
                    i > (resultList.length - nRecords - 1); i--) {
                recordArray.push(resultList[i]);
            }

            return (callback(null, recordArray));
        }).
        next();
}

/**
 * Serves a public resource through a http server response.
 *
 * Public resources are located in the resource tree at /public.
 *
 * @param {http.ServerResponse} response - the http server response
 * @param {string} path - the path of the public resource to serve, relative to /public;
 *        e.g. given path 'some/resource', resource /public/some/resource will be served.
 * @param {Function} callback - callback(error)
 */
exports.servePublicResource = function (response, path, callback) {

    exports.openPublicResource(path, undefined,
        function (error, resource) {
            function sendError(response, code, message, err) {
                response.writeHead(code, {"Content-type": "application/json"});
                response.end(JSON.stringify({ message: message }));

                const newError = new Error(message);
                newError.httpCode = code;
                newError.cause = err;
                callback(newError);
            }

            if (error) {
                return sendError(response, 500, "could not load resource: " + path, error);
            }
            else if (resource == null) {
                return sendError(response, 404, "could not find resource: " + path);
            }

            const mime = {
                json: 'application/json',
                xml: 'application/xml',
                avif: 'image/avif',
                bmp: 'image/bmp',
                gif: 'image/gif',
                jpeg: 'image/jpeg',
                jpg: 'image/jpeg',
                png: 'image/png',
                svg: 'image/svg+xml',
                tif: 'image/tiff',
                tiff: 'image/tiff',
                webp: 'image/webp',
                css: 'text/css',
                csv: 'text/csv',
                htm: 'text/html',
                html: 'text/html',
                js: 'text/javascript',
                txt: 'text/plain'
            };

            const type = mime[require('path').extname(path).slice(1)] ||
                'application/octet-stream';
            response.writeHead(200, {"Content-type": type});

            const done = denum.singleCallback(function (error) {
                resource.close();

                if (error) {
                    return sendError(response, 500, "error reading resource: " + path, error);
                }
                
                response.end();
                callback();
            });

            resource.openReadable().
                on('error', done).
                pipe(response).
                on('error', done).
                on('finish', done);
        });
}

/**
  * update containment image meta in database
  * @param {object} infoJSON - JSON contain container image name, sha1sum and
  *        label information (all fields are mandatory).
  * @param {Function} callback - return error if update failed
  * @example input JSON
  *        {
  *            name: "default-chroot.dd",
  *            sha1sum: "1f023f9f3e16e54b8ea432feef99c357bb158c13",
  *            label: "v1.0.0.2022-01-22"
  *        }
  */
exports.containerImageMetaUpdate = function (infoJSON, callback) {
    var resPrefix = "/snapshot/os/";

    if (!infoJSON || typeof(infoJSON) != 'object') {
        return (callback(new RangeError("invalid input: " + infoJSON)));
    } else if (!infoJSON.name) {
        return (callback(new RangeError("missing image name: " + infoJSON)));
    }

    var path = resPrefix + infoJSON.name;

    exports.openResource(path, {
            create: true,
        }, function (error, resource) {
            if (error) {
                return (callback(error));
            }
            resource.setMeta("name", infoJSON.name);

            if (infoJSON.sha1sum) {
                resource.setMeta("sha1sum", infoJSON.sha1sum);
            }

            if (infoJSON.label) {
                resource.setMeta("label", infoJSON.label);
            }

            return resource.close(callback);
        });
}

/**
  * Retrieve container image metadata from database
  * @param {object} imageName - image name to query
  * @example output JSON
  *  {
  *      name: "default-chroot.dd",
  *      sha1sum: "1f023f9f3e16e54b8ea432feef99c357bb158c13",
  *      label: "v1.0.0.2022-01-22"
  *  }
  */
exports.containerImageMetaQuery = function (imageName, callback) {
    var resPrefix = "/snapshot/os/";

    if (typeof(imageName) != "string") {
        return (callback(new RangeError("illegal query input: " + query)));
    }

    var path = resPrefix + imageName;
    var ret = null;

    exports.queryResources().withName(path).
        on('result', function (result) {
            if (result.meta) {
                ret = result.meta;
            }

            this.next();
        }).
        on('end', function () {
            if (ret === null) {
                return (callback(new Error("No existing records found")));
            }

            return (callback(null, ret));
        }).
        next();
}

function isIsoDate(str) {
    return /\d{4}-\d{2}-\d{2}T\d{2}:\d{2}:\d{2}.\d{3}Z/.test(str)
            && (new Date(str)).toISOString() === str;
}

/**
  * Set a announcement message for the landscape
  * @param {object} messageInfo - a JSON contains mandatory fields:
  *                        landscape name, startTime, endTime, message
  *                 optional fields:
  *                        type, title, service
  * @param {Function} callback - called when successfully write/update database
  * @description JSON input specification
  * {
  *     "type": "info" | "warning" | "error",
  *     "landscape": string,
  *     "startTime": number, // used to filter the message
  *     "endTime": number,
  *     "title": ISOstring,
  *     "message": ISOstring,
  *     "service": string array[]
  * }
  *  Support ISO 8601 datetime format like: 2022-02-07T21:20:54.385Z
  */
exports.setAnnouncement = function (messageInfo, callback) {
    if (!messageInfo || typeof(messageInfo) != 'object') {
        return (callback(new RangeError("invalid input: " + messageInfo)));
    } else if (!messageInfo.landscape) {
        return (callback(new RangeError("missing landscape: " + messageInfo)));
    } else if (!messageInfo.startTime) {
        return (callback(new RangeError("missing start time: " + messageInfo)));
    } else if (!messageInfo.endTime) {
        return (callback(new RangeError("missing end time: " + messageInfo)));
    } else if (!messageInfo.message) {
        return (callback(new RangeError("missing message: " + messageInfo)));
    }

    // validate date string
    if (!isIsoDate(messageInfo.startTime)) {
        return (callback(new RangeError("startTime is not in ISO 8601 format")));
    } else if (!isIsoDate(messageInfo.endTime)) {
        return (callback(new RangeError("endTime is not in ISO 8601 format")));
    } else if (Date.parse(messageInfo.endTime) < Date.now()) {
        return (callback(new RangeError("endTime should be later than now")));
    } else if (Date.parse(messageInfo.endTime) < Date.parse(messageInfo.startTime)) {
        return (callback(new RangeError("endTime should be greater than startTime")));
    }

    const path = announcementPrefix + messageInfo.landscape + '/' + Date.parse(messageInfo.startTime);

    // Create a resource with landscape/timestamp and save JSON as its meta data
    exports.openResource(path, {
            create: true,
        }, function (error, resource) {
            if (error) {
                return (callback(error));
            }
            
            resource.setMeta("type", messageInfo.type);
            resource.setMeta("startTime", messageInfo.startTime);
            resource.setMeta("endTime", messageInfo.endTime);
            resource.setMeta("message", messageInfo.message);
            resource.setMeta("service", messageInfo.service);
            if (messageInfo.title) {
                resource.setMeta("title", messageInfo.title);
            }

            return resource.close(callback);
        });
}

/**
  * Get announcement messages for the landscape
  * @param {object} queryLandscape - landscape name
  * @description JSON output example
  *   [
  *     {
  *       "type": "info" | "warning" | "error",
  *       "landscape": string, 
  *       "startTime": number, // used to filter the message
  *       "endTime": number,
  *       "title": ISOstring,
  *       "message": ISOstring,
  *       "service": string array[]
  *     },
  *   ]
  */
exports.getAnnouncement = function (queryTarget, callback) {
    var service = null
    var queryLandscape = null
    
    if (typeof queryTarget === "object") {
        service = queryTarget.service
        queryLandscape = queryTarget.landscape
    } else {
        service = undefined
        queryLandscape = queryTarget
    }

    // check query input is a JSON or string
    if (typeof(queryLandscape) !== "string") {
        return (callback(new RangeError("illegal landscape: " + queryLandscape)));
    }

    // If a service argument was provided, 
    // it will be used to filter out all announcements not meant for that service
    if (typeof(service) === "string") {
        service = [service]
    } else if (service === undefined && config.origin && config.origin.serviceName) {
        // If the function is being called by a service (as opposed to dcontrol),
        // And that service has not been updated to explicitly provide a "service" argument (=== undefined),
        // We should make an assumption and generate a default "service" argument
        service = [config.origin.serviceName.split('/').pop()]
    } else if (!!service && !Array.isArray(service)) {
        return (callback(new RangeError("illegal service: " + service)));
    }

    const path = announcementPrefix + queryLandscape + '/';
    var results = [];

    exports.queryResources().
        withNoAssumptions().
        withNamePrefix(path).
        withOrderByName().
        on('result', function (result) {
            if (result.meta != null) {
                results.push(result.meta);
            }

            this.next();
        }).
        on('end', function () {
            if (results.length == 0) {
                return (callback(new Error("No existing records found")));
            }

            var announcements = [];
            var current = Date.now();

            for (var i = 0; i < results.length; i++) {
                if (Date.parse(results[i].endTime) >= current && 
                            Date.parse(results[i].startTime) <= current) {
                    results[i].landscape = queryLandscape;
                    // Filter out the announcement based on the service filter array if one exists
                    // If the announcement does not specify any services, it appears for all services
                    if (!!service) {
                        var found = !results[i].service || results[i].service.length == 0
                        if (!found) {
                            for (var j = 0; j < service.length; j++) {
                                if (results[i].service.indexOf(service[j]) >= 0) {
                                    found = true;
                                    break;
                                }
                            }
                        }
                        if (!found) {
                            continue;
                        }
                    }
                    announcements.push(results[i]);
                }
            }

            return (callback(null, announcements));
        }).
        next();
}

/**
 * stringCompare(left, right) will compare strings using the
 * same collating order as the storage abstraction, with the
 * exception that nulls compare as equal, and undefineds are
 * also treated as nulls.  Nulls compare as "greater" than
 * non-nulls.  The storage abstraction collating order is
 * to treat strings as sequences of unicode code-points and
 * to compare them by code-point value.
 */
exports.stringCompare = denum.stringCompare;
exports.stringSort = denum.stringSort;
exports.stringSearch = denum.stringSearch;
exports.binarySort = denum.binarySort;
exports.binarySearch = denum.binarySearch;
exports.danalytics = cloud && require('./danalytics');
exports.analytics = cloud && exports.danalytics.analytics;
exports.migrateOneWorkspace = cloud && dworkspace.migrateOneWorkspace;
exports.migrateAllWorkspaces = cloud && dworkspace.migrateAllWorkspaces;
exports.normalizeResourceName = dresource.normalizeResourceName;

exports.maintDB = dlog.maintDB;
