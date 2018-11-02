/**
* Copyright (C) 2015-2018 Starbreeze AB All Rights Reserved.
*/

'use strict';

const mime = require('mime');

const build_mime = path => mime(path);

module.exports = (ifs_adapter, utilities, list_assets) => ({ ref, kind, mime, path }) => {
    const get_ref = () => ref ? ref : utilities.identity_path_to_resource_ref(path, ifs_adapter.path);
    const get_path = () => path ? path : utilities.resource_ref_to_identity_path(get_ref());
    const get_kind = () => kind;
    const get_mime = () => mime ? mime : build_mime(path || ref);
    const get_assets = async () => {
        await list_assets(get_ref());
    };
    const get_hash = async () => (await ifs_adapter.readJson(get_path())).hash;
    const set_hash = async hash => {
        if (!hash) {
            const assets = await get_assets();
            if (assets.length <= 1) {
                await ifs_adapter.removeFile(get_path());
            }
        } else {
            await ifs_adapter.outputFormattedJson(get_path(path), { hash });
        }
    };
    return {
        get_kind,
        get_ref,
        get_mime,
        get_assets,
        get_hash,
        set_hash,
        get: async () => ({
            kind: get_kind(),
            ref: get_ref(),
            mime: get_mime(),
            assets: await get_assets(),
            hash: await get_hash()
        })
    };
};
