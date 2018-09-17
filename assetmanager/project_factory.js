/**
* Copyright (C) 2015-2018 Starbreeze AB All Rights Reserved.
*/

'use strict';

const project = require('./project');

const _error_outputs = require('../lib/errors')("Project factory");

const transform_error = err => {
    this.error = _error_outputs.INTERNALERROR(err);
    throw this;
};

let Project_factory = {
    get_project: workspace => {
        return workspace.adapter.readJson(workspace.get_internal_file_path('project'))
            .then(project, transform_error);
    }
};

module.exports = Project_factory;