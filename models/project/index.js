/**
* Copyright (C) 2015-2018 Starbreeze AB All Rights Reserved.
*/

'use strict';

const errors = require('../../lib/errors')('Project');
const _path = require('path').posix;

const model = require('./model');
const branch = require('../branch/model');
const asset = require('../asset/model');
const identity = require('../identity/model');

const ROOT_URL_PATH = "/contentbrowser/projects";

const arrange_result = (obj, formatter) => {
    if (obj.items) {
        return obj.items.map(formatter);
    } else {
        return [formatter(obj)];
    }
};

module.exports = bilrost_client => {

    let redirect_to_bilrost = (url, options) => {
        if (!options) {
            options = {};
        }
        if (!options.start) {
            options.start = 0;
        }
        if (!options.maxResults) {
            options.maxResults = 100;
        }
        return new Promise((resolve, reject) => {
            let query_parameters = '?';
            if (options.filterName) {
                query_parameters += `name=${options.filterName}&`;
            }
            query_parameters += `start=${options.start}`;
            query_parameters += `&maxResults=${options.maxResults}`;
            try {
                bilrost_client.get(
                    url + query_parameters,
                    (err, req, res, obj) => {
                        if (err) {
                            reject(errors.MOCK(res.body, res.statusCode));
                        } else {
                            resolve(obj);
                        }
                    }
                );
            } catch (err) {
                reject(errors.INTERNALERROR(err));
            }
        });
    };
    return {
        list: async (org = '/', project = '', options) => {
            const url = _path.join(ROOT_URL_PATH, org, project);
            const res = await redirect_to_bilrost(url, options);
            return arrange_result(res, model);
        },
        branches: async (repo, branch_name = '/', options) => {
            const url = _path.join(ROOT_URL_PATH, `${repo}/`, branch_name);
            const res = await redirect_to_bilrost(url, options);
            return arrange_result(res, branch);
        },
        contents: async (org, name, branch_name, ref, options) => {
            const url = _path.join(ROOT_URL_PATH, org, name, branch_name, ref);
            const res = await redirect_to_bilrost(url, options);
            if (ref.startsWith('assets')) {
                return arrange_result(res, asset);
            } else {
                return arrange_result(res, ({ ref, kind, mime, hash }) => identity(ref, kind, mime, hash));
            }
            
        }
    };
};
