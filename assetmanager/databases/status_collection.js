/**
* Copyright (C) 2015-2018 Starbreeze AB All Rights Reserved.
*/

'use strict';

const loki = require('./lokijs');

const status_collection = guid => {

    const format_document_to_status = document => {
        if (document) {
            const status = JSON.parse(JSON.stringify(document));
            delete status.$loki;
            delete status.meta;
            return status;
        }
    };

    const format_status_to_document = status => {
        return JSON.parse(JSON.stringify(status));
    };

    const database = loki(guid);
    const collection = database.get_collection('statuses');

    const output = {
        total_docs: collection.total_docs,
        flush: collection.flush,
        remove: collection.remove,
        get: ref => collection.get(ref)
            .then(doc => format_document_to_status(doc)),
        add: status => collection.add(format_status_to_document(status)),
        add_batch: statuses => Promise.all(statuses.map(status => output.add(status))),
        search: (query, options) => collection
            .search(query, options)
            .then(res => {
                res.items = res.items
                    .map(doc => format_document_to_status(doc));
                return res;
            }),
        update: (ref, status) => collection.update(ref, format_status_to_document(status)),
        get_adapter: database.get_adapter,
        get_collection: database.get_collection,
        close: collection.close
    };
    
    return output;
};

module.exports = status_collection;
