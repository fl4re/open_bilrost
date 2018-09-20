/**
* Copyright (C) 2015-2018 Starbreeze AB All Rights Reserved.
*/

'use strict';

module.exports = asset => {
    const meta = Object.assign({
        ref: "",
        created: new Date().toISOString(),
        modified: new Date().toISOString(),
        version: "1.1.0",
        author: ""
    }, asset.meta);
    delete asset.meta;
    const new_asset = Object.assign({
        comment: "",
        tags: [],
        main: "",
        dependencies: [],
        semantics: []
    }, asset);
    new_asset.meta = meta;
    return new_asset;
};
