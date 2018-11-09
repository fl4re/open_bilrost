/**
* Copyright (C) 2015-2018 Starbreeze AB All Rights Reserved.
*/

/*
    Workspace manager for content browser
    version 2.0.0
 */
'use strict';

const model = require('./model');
const WORKSPACE_INTERNAL_FOLDER_PATH = require('../constant').WORKSPACE_INTERNAL_FOLDER_PATH;
const _path = require('path');
const properties_relative_path = _path.join(WORKSPACE_INTERNAL_FOLDER_PATH, 'properties');

module.exports = ifs_adapter => {
    const get = async () => {
        const { description, guid, subscriptions, stage, status } = await ifs_adapter.readJson(properties_relative_path);
        return model(description, guid, subscriptions, stage, status);
    };
    const create = async description => {
        const properties = model(description);
        await ifs_adapter.outputJson(properties_relative_path, properties);
        return properties;
    };
    const save = async (subscriptions, stage, status) => {
        const properties = Object.assign(await get(), { subscriptions, stage, status });
        await ifs_adapter.outputJson(properties_relative_path, properties);
        return properties;
    };
    return {
        get,
        create,
        save
    };
};
