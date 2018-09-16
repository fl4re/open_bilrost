/**
* Copyright (C) 2015-2018 Starbreeze AB All Rights Reserved.
*/

/*
    common error handler
*/
'use strict';

module.exports = function(api_name) {
    function add_stack(object) {
        if (global.debug) {
            object.stack = new Error().stack;
        }
        return object;
    }
    return {
        MOCK (message, statusCode) {
            return add_stack({
                message: message,
                statusCode: statusCode
            });
        },
        NOTFOUND (element_not_found) {
            return add_stack({
                message: api_name+'(s) not found, '+ element_not_found,
                statusCode: 404
            });
        },
        APINOTSUPPORTED (element_not_supported) {
            return add_stack({
                message: api_name+' not found, "'+ element_not_supported +'" is not supported yet',
                statusCode: 501
            });
        },
        FILETYPENOTSUPPORTED () {
            return add_stack({
                message: "File type not supported.",
                statusCode: 400
            });
        },
        CORRUPT (element_not_valid) {
            return add_stack({
                message: api_name+' corrupted, "'+element_not_valid+'" cannot be found or is invalid',
                statusCode: 400
            });
        },
        URLNOTVALID (url) {
            return add_stack({
                message: api_name+' file url not valid, make sure "'+url+'" respect conventional url scheme',
                statusCode: 404
            });
        },
        IDENTIFIERNOTVALID (identifier) {
            return add_stack({
                message: api_name+' identifier not valid, "'+identifier+'" must match either /^[a-zA-Z0-9]{40}$/ or /^[[w/.-]*$/ regular expressions for ids or names',
                statusCode: 409
            });
        },
        INTERNALERROR (error) {
            if (error instanceof Error) {
                const err = error.toString();
                error = err.replace(/Error: /, '');
            } else if (error !== null && typeof error === 'object') {
                error = error.message ? error.message : JSON.stringify(error);
            }
            return add_stack({
                message: `"${api_name}" encoutered an unexpected failure: ${error}`,
                statusCode: 500
            });
        },
        RESTRICTED (what, info) {
            return add_stack({
                message: what +' is restricted. ' + info ? info : "",
                statusCode: 403
            });
        },
        ALREADYEXIST (what) {
            return add_stack({
                message: what +' already exist',
                statusCode: 403
            });
        },
        PRECONDITIONFAILED (what) {
            return add_stack({
                message: what +' precondition failed',
                statusCode: 412
            });
        }
    };
};
