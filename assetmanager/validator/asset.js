/**
* Copyright (C) 2015-2018 Starbreeze AB All Rights Reserved.
*/

'use strict';

const sanitize = require("sanitize-filename");
const status_config = require('./../status.config.json');

var Validator = require('jsonschema');

Validator = new Validator.Validator();

Validator.attributes.is_date = instance => {
    if (typeof instance === 'string') {
        let date = Date.parse(instance);
        if (isNaN(date)) {
            return 'The date is invalid';
        }
    } else {
        if (instance !== null) {
            return;
        }
    }
};

Validator.attributes.is_ref = instance => {
    if (typeof instance !== 'string') {
        return 'ref should be typed of String';
    }
    if (!/^\/(assets)\/.*/.test(instance)) {
        return 'Ref is invalid as it doesnt start with "/assets/" suffix';
    }
    instance.split('/').forEach(value => {
        let result = sanitize(value);
        if( result !== value ) {
            return value+' is invalid, '+result+' would be accepted instead';
        }
    });

};

// json schema for project object in workspace resources
var project_schema = {
    "id": "/projects",
    "type": "object",
    "properties": {
        "name": {
            "type":"string",
            "pattern": /^[[\w\/\.-]{0,100}$/
        },
        "full_name": {
            "type":"string",
            "pattern": /^[[\w\/\.-].*$/
        },
        "url": {
            "type":"string"
        },
        "branch": {
            "type":"string",
            "pattern": /^[[\w\/\.-]{0,100}$/
        }
    },
    required: ["name", "full_name", "url", "branch"]
};

const meta_schema = {
    "id": "/meta",
    "type": "object",
    "properties": {
        "ref": {
            "type":"string",
            "is_ref": ""
        },
        "created": {
            "type": "string",
            "is_date": ""
        },
        "modified": {
            "type": "string",
            "is_date": ""
        },
        "author": {
            "type": "string",
            "pattern": /^[[\w\/\.-]{0,100}$/
        },
        "version": {
            "type": "string",
            "pattern": /^(\d+\.)?(\d+\.)?(\*|\d+)$/
        }
    },
    "required" : ["ref", "created", "version", "author"]
};

const assets_schema_1_1_0 = {
    "id": "/assets",
    "type": "object",
    "properties": {
        "meta": {"$ref": "/meta"},
        "comment": {
            "type": "string"
        },
        "tags": {
            "type": "array",
            "uniqueItems": true
        },
        "main": {
            "type": "string",
            "pattern": /^$|^\/resources\/.*/
        },
        "dependencies": {
            "type": "array",
            "uniqueItems": true
        },
        "semantics": {
            "type": "array",
            "uniqueItems": true
        }
    },
    "required": ["meta"]
};

const resource = require('./resource');

Validator.addSchema(meta_schema, '/meta');
Validator.addSchema(project_schema, '/projects');

function Asset(workspace) {

    this.adapter = workspace.adapter;
    this.database = workspace.database;

    this.is_invalid_reference = reference => {

        let invalid;
        if (!/^\/(assets)\/.*/.test(reference)) {
            invalid = "Ref doesn't start with '/assets/' suffix";
        }
        reference.split('/').forEach(value => {
            let result = sanitize(value);
            if( result !== value ) {
                invalid = value;
            }
        });
        return invalid;
    };

    this.is_valid_schema = asset => Validator.validate(asset, assets_schema_1_1_0);

    this.is_invalid_paths_in_data = asset => {
        let ref, deps;
        const is_invalid_ref = ref => {
            if (workspace.utilities.is_resource_ref(ref)) {
                return this.adapter.access(workspace.utilities.ref_to_relative_path(ref));
            } else if (workspace.utilities.is_asset_ref(ref)) {
                return this.database.search({ ref: ref })
                    .then(results => {
                        if (!results.items.length) {
                            throw ref + " not found in the database";
                        }
                    });
            } else {
                return Promise.resolve();
            }
        };

        ref = asset.main;
        deps = asset.dependencies ? asset.dependencies : [];
        const promises = deps.map(value => is_invalid_ref(value));
        promises.push(is_invalid_ref(ref));
        return Promise.all(promises);
    };

    this.search_asset = ref => this.database.search({ ref: ref })
        .then(results => {
            if (!results.totalItems) {
                throw ref + " is not found";
            }
            if (results.totalItems > 1) {
                throw ref + " asset is duplicated";
            }
            return [results.items[0]];
        });

    this.search_in_namespace = (ref, options) => {
        let query;
        if (!options.recursive) {
            query = { namespace: ref };
        } else {
            query = { namespaces: { '$contains': ref }};
        }
        return this.database.search(query)
            .then(results => results.items);
    };

    this.search_by_ref = (ref, options) => {
        const is_asset = workspace.utilities.is_asset_and_not_namespace(ref);
        const is_asset_namespace = workspace.utilities.is_asset_namespace(ref);

        if (is_asset) {
            return this.search_asset(ref);
        } else if (is_asset_namespace) {
            return this.search_in_namespace(ref, options);
        } else {
            return Promise.reject(ref + ' is not a valid asset ref');
        }
    };

    this.check_version = version => new Promise((resolve, reject) => {
        const is_version_valid = workspace.utilities.get_asset_versions().indexOf(version) !== -1;
        if (!version || !is_version_valid) {
            reject(version + ' version number is not supported');
        } else {
            resolve();
        }
    });

    this.check_schema = asset => {
        const valid = this.is_valid_schema(asset);
        if (valid.errors.length) {
            return Promise.reject(valid.errors);
        } else {
            return Promise.resolve();
        }
    };

    const search_main_in_database = main => this.database.search({ main: main });

    const search_dep_in_database = dep => this.database.search({ dependencies: { '$contains': dep }});

    this.check_main_dep_bare = main => {
        if (!main) {return Promise.resolve();}

        return search_main_in_database(main);
    };

    this.check_main_dep_full = main => {
        if (!main) {
            return Promise.resolve();
        }

        if (main.startsWith('/assets/')) {
            return search_main_in_database(main);
        } else if (main.startsWith('/resources/')) {
            return resource(this.adapter, workspace.utilities)
                .run_full_validation(main);
        }
    };

    this.check_deps_bare = deps =>  Promise.all(deps.map(dep => {
        if (dep.startsWith('/assets/')) {
            return search_dep_in_database(dep);
        } else if (dep.startsWith('/resources/')) {
            return Promise.resolve();
        }
    }));

    this.check_deps_full = deps => Promise.all(deps.map(dep => {
        if (dep.startsWith('/assets/')) {
            return search_dep_in_database(dep);
        } else if (dep.startsWith('/resources/')) {
            return resource(this.adapter, workspace.utilities)
                .run_full_validation(dep);
        }
    }));

    this.run_bare_validation = (ref, options) => {
        if (!options) {
            options = {};
        }

        return this.search_by_ref(ref, options)
            .then(items => Promise.all(items.map(asset => {
                const output = {
                    ref: asset.meta.ref
                };
                const version = asset.meta.version;
                const handle_error = err => {
                    output.state = status_config.integrity.INVALID;
                    output.error = err;
                    return output;
                };
                const handle_success = () => {
                    if (output.state !== status_config.integrity.INVALID) {
                        output.state = status_config.integrity.VALID;
                    }
                    return output;
                };
                output.version = version;
                return Promise.all([
                    this.check_schema(asset),
                    this.check_main_dep_bare(asset.main)
                        .then(results => {
                            if (results && results.totalItems !== 1) {
                                return Promise.reject("Main ref defined " + results.totalItems + " times instead of only once");
                            }
                        }),
                    this.check_version(version),
                    this.check_deps_bare(asset.dependencies)
                ]).then(handle_success).catch(handle_error);
            })));
    };

    this.run_full_validation = (ref, options) => {
        if (!options) {
            options = {};
        }
        return this.search_by_ref(ref, options)
            .then(items => Promise.all(items.map(asset => {
                const output = {
                    ref: asset.meta.ref
                };
                const version = asset.meta.version;
                const handle_error = err => {
                    output.state = status_config.integrity.INVALID;
                    output.error = err;
                    return Promise.resolve(output);
                };
                const handle_success = () => {
                    if (output.state !== status_config.integrity.INVALID) {
                        output.state = status_config.integrity.VALID;
                    }
                    return output;
                };
                output.version = version;
                return Promise.all([
                    this.check_version(version),
                    this.check_schema(asset),
                    this.check_main_dep_full(asset.main).then(results => {
                        if (results && results.totalItems !== 1) {
                            return Promise.reject("Main ref defined " + results.totalItems + " times instead of only once");
                        }
                    }),
                    this.check_deps_full(asset.dependencies)
                ]).then(() => this.is_invalid_paths_in_data(asset))
                .then(handle_success)
                .catch(handle_error);
            })));
    };
}

module.exports = Asset;
