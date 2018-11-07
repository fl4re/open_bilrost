/**
* Copyright (C) 2015-2018 Starbreeze AB All Rights Reserved.
*/

'use strict';

module.exports = ({ ref, kind, mime, hash, assets, fileSize, createdDate, modifiedDate, fileExtension, path, etag, name }) => ({
    ref,
    kind,
    mime,
    hash,
    name,
    assets,
    fileSize,
    createdDate,
    modifiedDate,
    fileExtension,
    path,
    etag
});
