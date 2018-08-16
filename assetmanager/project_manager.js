/**
* Copyright (C) 2015-2018 Starbreeze AB All Rights Reserved.
*/

/*
    Project manager
    version 2.1.0
 */
'use strict';
const errors = require('../lib/errors')('Project');
const Path = require('path').posix;

module.exports = context => {

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
                query_parameters += 'name='+ options.filterName +'&';
            }
            query_parameters += 'start='+ options.start;
            query_parameters += '&maxResults='+ options.maxResults;
            try {
                context.bilrost_client.get(
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
        get : function (identifier, options) {
            let url = Path.join("/contentbrowser", "projects", identifier);
            return redirect_to_bilrost(url, options);
        },
        branches : function (repo, branch_name, options) {
            let url = Path.join("/contentbrowser", "projects", repo, branch_name);
            return redirect_to_bilrost(url, options);
        },
        assets : function (identifier, repo, branch_name, options) {
            let url = Path.join("/contentbrowser", "projects", repo, branch_name, identifier);
            return redirect_to_bilrost(url, options);
        }
    };
};
