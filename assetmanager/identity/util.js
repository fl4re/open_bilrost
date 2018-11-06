/**
* Copyright (C) 2015-2018 Starbreeze AB All Rights Reserved.
*/

'use strict';

const _path = require('path').posix;

module.exports = workspace_util => {
    const resource_path_to_identity_path = resource_path => workspace_util.get_internal_file_path(_path.join('resources', resource_path));
    const resource_ref_to_identity_path = resource_ref => {
        const relative_path = workspace_util.ref_to_relative_path(resource_ref);
        return resource_path_to_identity_path(relative_path);
    };
    const identity_path_to_resource_ref = path => {
        const relative_path = _path.relative(_path.join(workspace_util.get_internal_file_path('resources')), path);
        return workspace_util.relative_path_to_ref(relative_path);
    };
    return {
        resource_path_to_identity_path,
        resource_ref_to_identity_path,
        identity_path_to_resource_ref
    };
};
