/**
* Copyright (C) 2015-2018 Starbreeze AB All Rights Reserved.
*/

'use strict';

const path = require('path');
const fs = require('fs');
const Handler = require('./lib/handler');

module.exports = function (server, bilrost_client) {

    const get_access_token = function get_access_token(access_code, handler) {
        bilrost_client.get("/auth/access_token?code=" + access_code, function (err, req, res, obj) {
            if (err) {
                server.log.error(err);
                handler.handleError(err);
            } else {
                fs.readFile(path.join(__dirname, '..', 'static', 'login.html'), (err, data) => {
                    if (err) {
                        handler.next(err);
                        return;
                    }
                    data = data.toString();
                    data = data.replace(/__name__/, obj.user_name);
                    data = data.replace(/__message__/, obj.message);
                    handler.res.setHeader('Content-Type', 'text/html');
                    handler.res.writeHead(200);
                    handler.res.end(data);
                    handler.next();
                });
            }
        });
    };

    const get_access_code = function get_access_code(handler) {
        bilrost_client.get("/auth/access_code", function (err, req, res, obj) {
            if (err) {
                server.log.error(err);
                handler.handleError(err);
            } else if (res.statusCode !== 302) {
                handler.handleError("Internal error. Backend should return redirect and returned " + res.statusCode);
            } else {
                handler.redirect(res.headers.location);
            }
        });
    };

    const get_user_info = handler => {
        bilrost_client.get("/bilrost/user", function (err, req, res, obj) {
            if (err) {
                server.log.error(err);
                handler.handleError(err);
            } else if (res.statusCode !== 200) {
                handler.handleError("Internal error. Backend should return 200 and returned " + res.statusCode);
            } else {
                handler.sendJSON(obj);
            }
        });
    };

    const is_valid = function is_valid(access_code) {
        return /^[\x21-\x7E]+$/.test(access_code);
    };

    server.get('/auth/access_token', function (req, res, next) {
        var handler = new Handler(req, res, next);
        // Oauth can return an error parameter if something went wrong
        if (req.query.error) {
            server.log.error(req.query.error);
            return handler.handleError(req.query.error);
        }

        var access_code = req.query.code;
        if (access_code && is_valid(access_code)) {
            get_access_token(access_code, handler);
        } else  {
            get_access_code(handler);
        }
        next();
    });

    server.get('/auth/whoami', function (req, res, next) {
        var handler = new Handler(req, res, next);
        get_user_info(handler);
        next();
    });

    server.put('/auth/session', function (req, res, next) {
        var handler = new Handler(req, res, next);
        const id = req.body.id;
        bilrost_client.set_session_id(id);
        handler.sendJSON('Ok');
        next();
    });

    server.del('/auth/access_token', function (req, res, next) {
        var handler = new Handler(req, res, next);
        bilrost_client.reset();
        handler.sendJSON({ok: 'Logget out'});
        next();
    });
};
