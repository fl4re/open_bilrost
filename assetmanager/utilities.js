/**
* Copyright (C) 2015-2018 Starbreeze AB All Rights Reserved.
*/

/*
    Asset manager
    version 2.0.0
 */
'use strict';

const utilities = {

    //Workspace output to send with request response
    object_list_presenter (ItemstoWrap, api_name, namespacesToWrap) {
        let result = { kind : api_name+"-list", items : ItemstoWrap };
        if(namespacesToWrap && namespacesToWrap.length){
            result.namespaces = namespacesToWrap;
        }
        return result;
    },

    unique (array) {
        return Array.from(new Set(array));
    },

    flatten (arr) {
        return arr.reduce((acc, val) => acc.concat(Array.isArray(val) ? utilities.flatten(val) : val), []);
    },

    includes (str, to_find) {
        return !!+~str.indexOf(to_find);  // jshint ignore:line
    },

    //Convert file url to a node js readable path. This is cross platform
    convert_file_uri_to_path (url) {
        let returnString = url.split('file:///').join('');
        const is_win = /^win/.test(process.platform);
        //Need to add extra slash if windows
        if (!is_win) {
            returnString = '/' + returnString;
        }
        //disk letter on upper case for windows
        if ((returnString[1] === ':' || returnString[1] === '|')  && is_win) {
            returnString = returnString[0].toUpperCase() + returnString.substr(1);
        }
        return decodeURI(returnString);
    }

};

module.exports = utilities;
