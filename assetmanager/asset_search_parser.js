/**
* Copyright (C) 2015-2018 Starbreeze AB All Rights Reserved.
*/

'use strict';

const search_parser = require('search_parser');
const search_macro_regex = /^(ref|tag|comment|main|dependency|created|modified|author|version):(<=?|>=?|\.\.)?$/;

const apply_logic_operator = function (operator, reference_value, value_to_compare) {
    let boolean;
    switch (operator) {
        case "<":
            boolean = new Date(reference_value) < new Date(value_to_compare);
            break;
        case "<=":
            boolean = new Date(reference_value) <= new Date(value_to_compare);
            break;
        case ">":
            boolean = new Date(reference_value) > new Date(value_to_compare);
            break;
        case ">=":
            boolean = new Date(reference_value) >= new Date(value_to_compare);
            break;
        case "..":
            let split = value_to_compare.split("..");
            reference_value = new Date(reference_value);
            boolean = new Date(split[0]) < reference_value && reference_value < new Date(split[1]);
            break;
        default:
            throw "Operator not defined";
    }
    return boolean;
};
const filter = function (MHQL_query, asset) {
    let boolean;
    switch (MHQL_query.type) {
        case "word":
            boolean = asset.meta.ref.includes(MHQL_query.value);
            break;
        case "tag":
            boolean = asset.tags.indexOf(MHQL_query.value) !== -1;
            break;
        case "comment":
            boolean = asset.comment.includes(MHQL_query.value);
            break;
        case "main":
            boolean = asset.main === MHQL_query.value;
            break;
        case "dependency":
            boolean =  asset.dependencies.indexOf(MHQL_query.value) !== -1;
            break;
        case "author":
            boolean =  asset.meta.author.includes(MHQL_query.value);
            break;
        case "created":
            boolean = apply_logic_operator(MHQL_query.operator, asset.meta.created, MHQL_query.value);
            break;
        case "modified":
            boolean = apply_logic_operator(MHQL_query.operator, asset.meta.modified, MHQL_query.value);
            break;
        case "version":
            boolean = asset.meta.version === MHQL_query.value;
            break;
        case "or":
            boolean = MHQL_query.values.reduce(function (previous, current, index) {
                if (index === 1) {
                    previous = filter(previous, asset);
                }
                return previous || filter(current, asset);
            });
            break;
        case "and":
            boolean = MHQL_query.values.reduce(function (previous, current, index) {
                if (index === 1) {
                    previous = filter(previous, asset);
                }
                return previous && filter(current, asset);
            });
            break;
        case "not":
            boolean = !filter(MHQL_query.values[0], asset);
            break;
        default:
            throw "undefined type in search query representation";
    }
    return boolean;
};

const asset_search_parser = function (query) {
    const query_json = search_parser(query, search_macro_regex);
    return {
        filter: (asset) => filter(query_json, asset)
    };
};

module.exports = asset_search_parser;
