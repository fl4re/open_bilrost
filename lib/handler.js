/**
* Copyright (C) 2015-2018 Starbreeze AB All Rights Reserved.
*/

// handler
'use strict';

const request_accepts_json = accepts => {
    if (accepts && accepts.length) {
        return accepts.indexOf('application/json') !== -1;
    }
};
const get_bilrost_content_type = bilrost_type => "application/vnd.bilrost." + bilrost_type + "+json";
const get_error_message = function (error) {
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
const get_error_status_code = function (error) {
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

var Handler = function (req, res, next) {
    this.accepts_json = request_accepts_json(req.headers && req.headers.accept);
    this.res = res;
    this.next = next;

    res.setHeader('Cache-Control', 'no-store, no-cache, must-revalidate');
    res.setHeader('access-control-allow-origin', '*');
    if (this.accepts_json) {
        res.setHeader('Content-Type', 'application/json');
    } else {
        res.setHeader('Content-Type', 'text/plain');
    }
};

Handler.prototype.handleError = function (error) {
    const message = get_error_message(error);
    const statusCode = get_error_status_code(error);

    this.res.writeHead(statusCode);
    this.res.end(JSON.stringify(message));
    this.next();
};

Handler.prototype.redirect = function (whereto) {
    this.res.writeHead(302, {
        'Location': whereto
    });
    this.res.end();
    this.next();
};

Handler.prototype.sendJSON = function (result, statusCode, bilrost_type) {
    if (result instanceof Error) {
        return this.handleError(result);
    }

    if (bilrost_type && this.accepts_json) {
        this.res.setHeader('Content-Type', get_bilrost_content_type(bilrost_type));
    }
    this.res.writeHead(statusCode || 200);
    this.res.end(JSON.stringify(result));
    this.next();
};

module.exports = Handler;
