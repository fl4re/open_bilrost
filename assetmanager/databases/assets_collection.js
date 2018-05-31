/**
* Copyright (C) 2015-2018 Starbreeze AB All Rights Reserved.
*/

'use strict';

const loki = require('./lokijs');
const Path = require('path');

const deep_clone = obj => JSON.parse(JSON.stringify(obj));

const assets_collection = guid => {
    const meta_keys = ["author", "version", "ref", "created", "modified", "type"];

    const format_asset_subset = asset => {
        if (asset.meta) {
            Object.keys(asset.meta).forEach(key => {
                asset[key] = asset.meta[key];
            });
            delete asset.meta;
        }
        return asset;
    };

    const format_asset_to_document = asset => {
        let ref = asset.meta.ref;
        let split = ref.split('/');
        split.pop();

        Object.keys(asset.meta).forEach(key => {
            asset[key] = asset.meta[key];
        });
        delete asset.meta;
        asset.namespace = Path.dirname(ref) + '/';
        asset.namespaces = [];
        split.reduce((previous, value) => {
            const namespace = previous + "/" + value;
            asset.namespaces.push(namespace + "/");
            return namespace;
        });
        return asset;
    };

    const format_document_to_asset = asset => {
        if (asset.$loki) {
            delete asset.$loki;
        }
        if (asset.namespace) {
            delete asset.namespace;
        }
        if (asset.namespaces) {
            delete asset.namespaces;
        }
        asset.meta = {};
        Object.keys(asset).forEach(key => {
            if (~meta_keys.indexOf(key)) {
                asset.meta[key] = asset[key];
                delete asset[key];
            }
        });

        return asset;
    };

    const database = loki(guid);
    const collection = database.get_collection('assets');

    const output = {
        total_docs: collection.total_docs,
        flush: collection.flush,
        remove: collection.remove,
        get: ref => collection.get(ref)
            .then(doc => format_document_to_asset(doc)),
        add: asset => collection.add(format_asset_to_document(deep_clone(asset))),
        add_batch: assets => Promise.all(assets.map(asset => output.add(asset))),
        search: (query, options) => collection
            .search(query, options)
            .then(res => {
                res.items = res.items
                    .map(doc => format_document_to_asset(doc));
                return res;
            }),
        update: (ref, asset) => collection.update(ref, format_asset_subset(deep_clone(asset))),
        get_adapter: database.get_adapter,
        get_collection: database.get_collection,
        close: collection.close
    };

    return output;
};

module.exports = assets_collection;
