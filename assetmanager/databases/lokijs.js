/**
* Copyright (C) 2015-2018 Starbreeze AB All Rights Reserved.
*/

'use strict';

const Lokijs = require("lokijs");
const _error_outputs = require('../../lib/errors')("Locki");
let adapter_map = {};

const filter_error = err => {
    let error;
    if (err.statusCode && err.message) {
        error = err;
    } else if (err instanceof Error) { 
        error = _error_outputs.INTERNALERROR(err.toString());
    } else {
        error = _error_outputs.INTERNALERROR(JSON.stringify(err));
    }
    throw error;
};

const loki = workspace_guid => {
    if (!adapter_map[workspace_guid]) {
        adapter_map[workspace_guid] = new Lokijs(workspace_guid);
    }
    const db = adapter_map[workspace_guid];

    const get_adapter = () => Promise.resolve(db);

    const get_collection = col_name => {
        let that = db.getCollection(col_name, { clone: true });
        if (!that) {
            that = db.addCollection(col_name, { clone: true });
        }
        const is_ready = () => Promise.resolve();

        const close = () => is_ready()
            .then(() => {
                db.close();
                delete adapter_map[workspace_guid];
            });

        const flush = () => is_ready()
            .then(() => db.listCollections().forEach(col => db.getCollection(col.name).findAndRemove()));

        const _search = (query, options) => {
            if (!options) {
                options = {};
            }
            return is_ready()
                .then(() => that.find(query))
                .then(search_results => {
                    const total = search_results.length;
                    if (options.maxResults) {
                        const start = options.start ? options.start : 0;
                        search_results = search_results.slice(start, start + options.maxResults);
                    }
                    return {
                        items: search_results,
                        totalItems: total
                    };
                });
        };

        const search = (query, options) => _search(query, options)
            .catch(filter_error);

        const get = ref => {
            const query = {
                'ref': ref
            };
            return is_ready()
                .then(() => that.findOne(query));
        };

        const add = asset => is_ready()
            .then(() => {
                that.insert(asset);
            });

        const add_batch = assets => Promise.all(assets.map(asset => add(asset)));

        const remove = ref => {
            const query = { ref: ref };
            return is_ready()
                .then(() => {
                    const res_count = that.find(query).length;
                    if (res_count === 0) {
                        throw _error_outputs.NOTFOUND(ref + ' to remove is not found!');
                    }
                })
                .then(() => that.findAndRemove(query));
        };

        const update = (ref, doc_subset) => {
            const query = { ref: ref };
            return is_ready()
                .then(() => that.findAndUpdate(query, doc => {
                    doc = Object.assign(doc, doc_subset);
                }));            
        };

        const total_docs = () => is_ready()
            .then(() => that.find().length);

        return {
            search: search,
            get: get,
            add: add,
            add_batch: add_batch,
            remove: remove,
            update: update,
            total_docs: total_docs,
            flush: flush,
            close: close
        };
    };
    
    return {
        get_adapter: get_adapter,
        get_collection: get_collection
    };
};

module.exports = loki;
