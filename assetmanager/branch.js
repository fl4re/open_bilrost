/**
* Copyright (C) 2015-2018 Starbreeze AB All Rights Reserved.
*/

'use strict';

const _error_outputs = require('../lib/errors')("Branch");

const transform_error = err => {
    this.error = _error_outputs.INTERNALERROR(err);
    throw this;
};

module.exports = (git_repo_manager, reset_workspace) => {

    const get_name = () => git_repo_manager.get_current_branch()
        .catch(transform_error);

    const get_names = () => git_repo_manager.get_branch_list()
        .catch(transform_error);

    const change = branch => git_repo_manager.change_branch(branch)
        .then(reset_workspace)
        .catch(transform_error);

    const create = branch => git_repo_manager.create_branch(branch)
        .catch(transform_error);

    const del = branch => git_repo_manager.delete_branch(branch)
        .catch(transform_error);

    return {
        get_name: get_name,
        get_names: get_names,
        change: change,
        create: create,
        del: del
    };
};
