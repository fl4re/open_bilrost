/**
* Copyright (C) 2015-2018 Starbreeze AB All Rights Reserved.
*/

/*
    asset manager
    version 2.0.0
*/

/* jshint expr: true */

'use strict';

const utilities = require('./utilities');
const _error_outputs = require('../lib/errors')("Asset");
const asset_search_parser = require('./asset_search_parser');
const repo_manager = require('./repo_manager');
const commit_manager = require('./commit_manager');
const Asset_validator = require('./validator/asset');

const filter_error = err => {
    let that = {};
    if (err.statusCode && err.message) {
        that = err;
    } else if (err.error) {
        that = err.error;
    } else if (err instanceof Error) {
        that = _error_outputs.INTERNALERROR(err.toString());
    } else {
        that = _error_outputs.INTERNALERROR(err);
    }
    throw that;
};

const run_full_validation_and_reduce_errors = (validator, ref) => {
    return validator.run_full_validation(ref)
        .then(result => {
            result.forEach(item => {
                if (item.error) {
                    throw _error_outputs.CORRUPT(item.error);
                }
            });
        })
        .catch(error => {
            throw _error_outputs.INTERNALERROR(error);
        });
};

const apply_logic_operator = function (operator, reference_value, value_to_compare) {
    let boolean;
    switch (operator) {
        case "<":
            boolean = new Date(reference_value) < new Date(value_to_compare);
            break;
        case "<=":
            boolean = new Date(reference_value) <= new Date(value_to_compare);
            break;
        case ">":
            boolean = new Date(reference_value) > new Date(value_to_compare);
            break;
        case ">=":
            boolean = new Date(reference_value) >= new Date(value_to_compare);
            break;
        case "..":
            let split = value_to_compare.split("..");
            reference_value = new Date(reference_value);
            boolean = new Date(split[0]) < reference_value && reference_value < new Date(split[1]);
            break;
        default:
            throw "Operator not defined";
    }
    return boolean;
};
const filter = function (MHQL_query, asset) {
    let boolean;
    switch (MHQL_query.type) {
        case "word":
            boolean = asset.meta.ref.includes(MHQL_query.value);
            break;
        case "tag":
            boolean = asset.tags.indexOf(MHQL_query.value) !== -1;
            break;
        case "comment":
            boolean = asset.comment.includes(MHQL_query.value);
            break;
        case "main":
            boolean = asset.main === MHQL_query.value;
            break;
        case "dependency":
            boolean =  asset.dependencies.indexOf(MHQL_query.value) !== -1;
            break;
        case "author":
            boolean =  asset.meta.author.includes(MHQL_query.value);
            break;
        case "created":
            boolean = apply_logic_operator(MHQL_query.operator, asset.meta.created, MHQL_query.value);
            break;
        case "modified":
            boolean = apply_logic_operator(MHQL_query.operator, asset.meta.modified, MHQL_query.value);
            break;
        case "version":
            boolean = asset.meta.version === MHQL_query.value;
            break;
        case "or":
            boolean = MHQL_query.values.reduce(function (previous, current, index) {
                if (index === 1) {
                    previous = filter(previous, asset);
                }
                return previous || filter(current, asset);
            });
            break;
        case "and":
            boolean = MHQL_query.values.reduce(function (previous, current, index) {
                if (index === 1) {
                    previous = filter(previous, asset);
                }
                return previous && filter(current, asset);
            });
            break;
        case "not":
            boolean = !filter(MHQL_query.values[0], asset);
            break;
        default:
            throw "undefined type in search query representation";
    }
    return boolean;
};

let asset_model;

const find_asset = (workspace, ref, options) => {
    if (workspace.utilities.is_asset_and_not_namespace(ref)) {
        return asset_model(workspace)
            .get_one(ref, options);
    } else if (workspace.utilities.is_asset_namespace(ref)) {
        return asset_model(workspace)
            .get_list(ref, options);
    } else {
        return Promise.reject(_error_outputs.CORRUPT(ref));
    }
};

asset_model = workspace => {

    const finder = (ref, options) => find_asset(workspace, ref, options);
    const validator = new Asset_validator(workspace);
    const workspace_utilities = workspace.utilities;
    const repomanager = repo_manager.create({
        host_vcs: 'git',
        cwd: workspace.adapter.path,
        utilities: workspace_utilities
    });
    const asset_reader = (ref, options) => repomanager.read(ref, options);
    const commitmanager = commit_manager(workspace, repomanager, finder, asset_reader);
    const get_relative_path = ref => workspace_utilities.format_namespaces(workspace.get_internal_file_path(ref));

    const get_one = (ref, options) => {

        const get_asset = () => workspace.database.search({ ref: ref }, options)
            .then(search_result => search_result.items)
            .then(items => {
                if (items.length === 0) {
                    throw _error_outputs.NOTFOUND(ref);
                }
                if (items.length > 1) {
                    throw _error_outputs.INTERNALERROR('same ref ' + ref + ' found many times');
                }
                return { output: items[0] };
            });

        return get_asset().catch(filter_error);
    };

    const get_list = (ref, options) => {

        if (!options) {
            options = {};
        }
        if (!options.start) {
            options.start = 0;
        }
        if (!options.maxResults) {
            options.maxResults = 100;
        }

        const get_assets_in_namespace = () => {
            const search_assets = workspace.database.search({ namespace : ref }, options)
                    .then(search_results => {
                        if (!search_results.items.length) {
                            throw _error_outputs.NOTFOUND(ref);
                        }
                        return search_results;
                    });

            const search_namespaces = workspace.adapter.getDirectories(get_relative_path(ref))
                .then(directory_paths => {
                    const search_results = {};
                    search_results.items = directory_paths.map(directory_path => {
                        // insert final slash to tell to unformat well final file name because this is a directory name
                        directory_path = `${directory_path}/`;
                        const ref = `${workspace_utilities.relative_path_to_ref(directory_path)}/`;
                        return {
                            url: `/contentbrowser/workspaces/${workspace.get_name()}${ref}`,
                            ref
                        };
                    });
                    search_results.totalItems = search_results.items.length;
                    return search_results;
                });

            return Promise.all([
                    search_assets,
                    search_namespaces
                ])
                .then(res => {
                    const asset_results = res[0];
                    const namespace_results = res[1];
                    let assets = asset_results.items;
                    let total_items = asset_results.totalItems;
                    if (options.filterName) {
                        assets = workspace_utilities.filter_by_meta_ref_property(assets, options.filterName);
                        total_items = assets.length;
                    }
                    const response = {};
                    response.output = utilities.object_list_presenter(assets, "asset");
                    if (options.start + assets.length < total_items) {
                        response.indexOfMoreResults = options.start + assets.length;
                    }
                    response.output.totalItems = total_items;
                    response.output.namespaces = namespace_results.items;
                    response.output.totalNamespaces = namespace_results.totalItems;
                    return response;
                });
        };

        const search_assets_in_namespace = (query) => {

            const search_in_namespace = (start) => {
                return workspace.database.search(
                    { namespaces : { '$contains': ref } },
                    { start: start }
                )
                    .then(search_results => {
                        if (!search_results.items.length) {
                            throw _error_outputs.NOTFOUND(ref);
                        }
                        return search_results;
                    });
            };
            const parse_database_output = search_result => {
                let result;
                let items = search_result.items;
                result = items.filter(asset => asset_search_parser(query).filter(asset));
                if (items.length === search_result.totalItems) {
                    return result;
                } else {
                    return search_in_namespace(items.length)
                        .then(parse_database_output)
                        .then(partial_result => result.concat(partial_result));
                }
            };
            const cook_response = result => {
                const response = {};
                response.output = utilities.object_list_presenter(result, "asset");
                if (options.start + result.length < result.length) {
                    response.indexOfMoreResults = options.start + options.maxResults;
                }
                response.output.totalItems = result.length;
                return response;
            };
            return search_in_namespace()
                .then(parse_database_output)
                .then(cook_response);
        };

        if (options.q) {
            return search_assets_in_namespace(options.q).catch(filter_error);
        } else {
            return get_assets_in_namespace().catch(filter_error);
        }

    };

    const create = (ref, asset) => asset_model.find_asset_by_ref(workspace, ref)
        .then(() => {
            throw _error_outputs.ALREADYEXIST(ref);
        },
        () => {
            asset = Object.assign({
                dependencies: [],
                tags: [],
                main: "",
                comment: ""
            }, asset);
            asset.meta = {
                ref: ref,
                created: new Date().toISOString(),
                modified: new Date().toISOString(),
                author: 'unknown',
                version: '1.1.0'
            };

            let invalid_reference = validator.is_invalid_reference(ref);
            if (invalid_reference) {
                throw _error_outputs.CORRUPT(invalid_reference);
            }

            let valid_asset = validator.is_valid_schema(asset);
            if (valid_asset.errors.length) {
                throw _error_outputs.CORRUPT(valid_asset.errors);
            }

            return validator.is_invalid_paths_in_data(asset)
                .then(() => {
                    if (asset.dependencies && asset.dependencies.length) {
                        asset.dependencies.sort();
                    }
                    if (asset.tags && asset.tags.length) {
                        asset.tags.sort();
                    }
                    return asset.main ? workspace.database.search({ main: asset.main }) : Promise.resolve({ items: [] });
                })
                .catch(err => { throw _error_outputs.CORRUPT(err); })
                .then(search_results => {
                    if (search_results.items.length !== 0) {
                        throw _error_outputs.CORRUPT(asset.main +" main already defined by another asset");
                    }
                })
                .then(() => Promise.all([
                    workspace.adapter.outputFormattedJson(get_relative_path(ref), asset),
                    workspace.database.add(asset)
                ]))
                .then(() => run_full_validation_and_reduce_errors(validator, ref))
                .then(() => asset.meta);
        })
        .catch(error => filter_error(error));

    const rename = (ref, new_ref, modified) => asset_model.find_asset_by_ref(workspace, ref)
        .then(asset => asset.output)
        .then(asset => {
            if (new Date(asset.meta.modified).getTime() !== new Date(modified).getTime()) {
                throw _error_outputs.PRECONDITIONFAILED('Last-Modified');
            }

            let invalid_reference = validator.is_invalid_reference(new_ref);
            if( invalid_reference ) {
                throw _error_outputs.CORRUPT(invalid_reference);
            }

            const rename_asset_dependencies = () => {
                return workspace.database.search({ dependencies: { '$contains': ref } })
                    .then(search_result => {
                        return Promise.all(search_result.items.map(found_asset => {
                            const index = found_asset.dependencies.indexOf(ref);
                            if (~index) {
                                found_asset.dependencies[index] = new_ref;
                                found_asset.modified = new Date().toISOString();
                                return workspace.adapter.outputFormattedJson(get_relative_path(found_asset.meta.ref), found_asset)
                                    .then(() => workspace.database.remove(found_asset.meta.ref))
                                    .then(() => workspace.database.add(found_asset));
                            }
                        }));
                    });
            };

            const write_and_index_asset = () => {
                asset.meta.ref = new_ref;
                asset.meta.modified = new Date().toISOString();
                return workspace.adapter.outputFormattedJson(get_relative_path(new_ref), asset)
                    .then(() => workspace.database.remove(ref))
                    .then(() => workspace.database.add(asset));

            };

            const remove_old_asset = () => workspace.adapter.removeFile(get_relative_path(ref));

            return Promise.all([
                    write_and_index_asset(),
                    remove_old_asset(),
                    rename_asset_dependencies()
                ])
                .then(() => run_full_validation_and_reduce_errors(validator, new_ref))
                .then(() => asset.meta);
        })
        .catch(error => filter_error(error));

    const replace = (ref, new_asset, modified) => asset_model.find_asset_by_ref(workspace, ref)
        .then(asset => {
            asset = asset.output;
            if (new Date(asset.meta.modified).getTime() !== new Date(modified).getTime()) {
                throw _error_outputs.PRECONDITIONFAILED('Last-Modified');
            }
            new_asset.meta = new_asset.meta || asset.meta;
            new_asset.meta.modified = new Date().toISOString();

            //
            new_asset.dependencies && new_asset.dependencies.sort();
            new_asset.tags && new_asset.tags.sort();

            let valid_asset = validator.is_valid_schema(new_asset);
            if (valid_asset.errors.length) {
                throw _error_outputs.CORRUPT(valid_asset.errors);
            }
            return validator.is_invalid_paths_in_data(new_asset)
                .catch(err => { throw _error_outputs.CORRUPT(err); })
                .then(() => Promise.all([
                    workspace.adapter.outputFormattedJson(get_relative_path(ref), new_asset),
                    workspace.database.update(ref, new_asset)
                ]))
                .then(() => run_full_validation_and_reduce_errors(validator, ref))
                .then(() => new_asset);
        })
        .catch(error => filter_error(error));

    const del = ref => workspace.database.search({
           '$or': [
                {
                    dependencies: {
                        '$contains': ref
                    }
                },
                {
                    main : ref
                }
            ]
        })
        .then(search_results => {
            if (search_results.items.length !== 0) {
                search_results = search_results.items.map(asset => asset.meta.ref);
                throw _error_outputs.ALREADYEXIST(ref + " reference defined by other assets " + search_results);
            }
            return Promise.all([
                workspace.adapter.removeFile(get_relative_path(ref)),
                workspace.database.remove(ref)
            ]);
        })
        .catch(error => filter_error(error));

    return {
        validator: validator,
        repo_manager: repomanager,
        commit_manager: commitmanager,
        get_one: get_one,
        get_list: get_list,
        create: create,
        delete: del,
        replace: replace,
        rename: rename,
        find_asset_by_ref: finder
    };
};

asset_model.find_asset_by_ref = find_asset;

module.exports = asset_model;
