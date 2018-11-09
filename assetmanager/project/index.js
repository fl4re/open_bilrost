/**
* Copyright (C) 2015-2018 Starbreeze AB All Rights Reserved.
*/

'use strict';

const _path = require('path');

const model = require('./model');
const constants = require('../constants');
const _error_outputs = require('../lib/errors')("Project factory");


const transform_error = err => {
    this.error = _error_outputs.INTERNALERROR(err);
    throw this;
};

const project_path = _path.join(constants.WORKSPACE_INTERNAL_FOLDER_PATH, 'project');

module.exports = ifs_adapter => ({
    get: () => ifs_adapter.readJson(project_path)
        .then(model, transform_error)
});
