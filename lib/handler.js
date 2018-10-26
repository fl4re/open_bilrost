/**
* Copyright (C) 2015-2018 Starbreeze AB All Rights Reserved.
*/

// handler
'use strict';

const get_bilrost_content_type = bilrost_type => "application/vnd.bilrost." + bilrost_type + "+json";
const get_error_message = error => {
    let message;
    if (error instanceof Error) {
        message = error.stack || error.message || "internal error";
    } else if (typeof error === "object") {
        message = error.message || (error.error && error.error.message) || "internal error";
    } else {
        message = error;
    }
    return message;
};
const get_error_status_code = error => {
    let status_code;
    if (error instanceof Error) {
        status_code = 500;
    } else if (typeof error === "object") {
        status_code = error.statusCode || (error.error && error.error.statusCode) || 500;
    } else {
        status_code = 500;
    }
    return status_code;
};

module.exports = (req, res, next) => ({
    sendError: error => {
        const message = get_error_message(error);
        const statusCode = get_error_status_code(error);
        res.setHeader('Content-Type', 'application/json');
        res.writeHead(statusCode);
        res.end(JSON.stringify(message));
        next();
    },
    redirect: whereto => {
        res.writeHead(302, {
            'Location': whereto
        });
        res.end();
        next();
    },
    sendJSON: (result, statusCode, bilrost_type) => {
        if (bilrost_type) {
            res.setHeader('Content-Type', get_bilrost_content_type(bilrost_type));
        } else {
            res.setHeader('Content-Type', 'application/json');
        }
        res.writeHead(statusCode || 200);
        res.end(JSON.stringify(result));
        next();
    },
    sendHTML: (result, statusCode) => {
        res.setHeader('Content-Type', 'text/html');
        res.writeHead(statusCode || 200);
        res.end(result);
        next();
    },
    sendText: (result, statusCode) => {
        res.setHeader('Content-Type', 'text/plain');
        res.writeHead(statusCode || 200);
        res.end(result);
        next();
    }
});
