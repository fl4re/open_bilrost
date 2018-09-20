/**
* Copyright (C) 2015-2018 Starbreeze AB All Rights Reserved.
*/

/*
    Asset manager
    version 2.0.0
 */
'use strict';

const minimatch = require('minimatch');
const Path = require('path').posix;
const resource_ref_regexp = /resources\/(.*)$/;
const asset_ref_regexp = /assets\/(.*)$/;

const has_last_slash = ref => ref[ref.length - 1] === '/';

const get_utilities = get_internal_file_path => {

    const rename_namespaces = (path, operation) => {
        if (path[0] === '/') {
            path = path.slice(1);
        }
        const is_namespace = path[path.length - 1] === '/';
        const path_without_root = Path.relative(get_internal_file_path('assets'), path) + (is_namespace ? '/' : '');
        const splitted_path = path_without_root.split('/');
        const renamed_path = splitted_path
            .map((filename, index) => {
                if (filename) {
                    const is_file = index === splitted_path.length - 1;
                    if (is_file) {
                        return filename;
                    } else {
                        if (operation === "format") {
                            return '$' + filename;
                        } else {
                            return filename.split('$').join('');
                        }
                    }
                } else {
                    return '';
                }
            }).join('/');
        return Path.join(get_internal_file_path('assets'), renamed_path);
    };

    const is_asset_path = path => path.startsWith(get_internal_file_path('assets'));

    const utilities = {

        get_asset_basename (asset_ref) {
            return asset_ref.replace(/^.*\//, '');
        },

        filter_by_meta_ref_property (list, name_filter) {
            return list.filter(function(el) {
                let name;
                if(el.meta && el.meta.ref) {
                    name = utilities.get_asset_basename(el.meta.ref);
                }
                return minimatch(name || '', name_filter || '*');
            });
        },

        format_namespaces (path) {
            return rename_namespaces(path, 'format');
        },

        unformat_namespaces (path) {
            return rename_namespaces(path, 'unformat');
        },

        ref_to_relative_path (ref) {
            if (ref.startsWith('/assets/')) {
                return utilities.format_namespaces(get_internal_file_path(ref));
            } else if (ref.startsWith('/resources/')) {
                return ref.slice(11);
            }
            return null;
        },

        relative_path_to_ref (path) {
            path = path.replace(/\\/g, '/');
            if (is_asset_path(path)) {
                path = utilities.unformat_namespaces(path);
                return Path.join('/', Path.relative(get_internal_file_path(), path));
            } else {
                if (path.startsWith(get_internal_file_path())) {
                    // path points to an identify file
                    return Path.join('/', Path.relative(get_internal_file_path(), path));
                } else {
                    // path points to a resource
                    return Path.join('/resources', path);
                }
            }
        },

        //get all allowed asset versions
        get_asset_versions () {
            return require('./asset.config.json').versions;
        },

        // Get extension from path
        substr_ext (path) {
            return Path.extname(path).split('.').join('');
        },

        absolute_path_to_ref (path, workspace_path) {
            const relative_path = Path.relative(workspace_path, path);
            return utilities.relative_path_to_ref(relative_path);
        },

        ref_to_absolute_path (ref, workspace_path) {
            if (ref.startsWith('/assets/')) {
                let path = ref.match(asset_ref_regexp)[1];
                return Path.join(workspace_path, path);
            } else if (ref.startsWith('/resources/')) {
                let path = ref.match(resource_ref_regexp)[1];
                return Path.join(workspace_path, path);
            }
            return null;
        },

        resource_url_to_ref (url, workspace_path) {
            try {
                return Path.join("/resources", url.split(workspace_path)[1]);
            } catch (error) {
                return undefined;
            }
        },

        is_asset_ref (ref) {
            return asset_ref_regexp.test(ref);
        },

        is_resource_ref (ref) {
            return resource_ref_regexp.test(ref);
        },

        is_asset_and_not_namespace (ref) {
            return utilities.is_asset_ref(ref) && !has_last_slash(ref);
        },

        is_asset_namespace (ref) {
            return utilities.is_asset_ref(ref) && has_last_slash(ref);
        },

        is_dependency (ref, main, dependencies) {
            return ref === main || dependencies.indexOf(ref) !== -1;
        },

        map_resource_identity_path (path) {
            return path.split(get_internal_file_path('resources')).join('');
        },

        resource_path_to_identity_path (resource_path) {
            return get_internal_file_path(Path.join('resources', resource_path));
        },

        resource_ref_to_identity_path (resource_ref) {
            let resource_path = resource_ref.match(resource_ref_regexp)[1];
            return utilities.resource_path_to_identity_path(resource_path);
        }

    };

    return utilities;

};

module.exports = get_utilities;
