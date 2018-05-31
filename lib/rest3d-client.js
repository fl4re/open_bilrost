/**
* Copyright (C) 2015-2018 Starbreeze AB All Rights Reserved.
*/

'use strict';
const restify = require('restify');
const path = require('path').posix;

const low = require('lowdb');
const FileSync = require('lowdb/adapters/FileSync');

module.exports = function(url, settingsBasePath) {
    const adapter = new FileSync(path.join(settingsBasePath, '.session.json'));
    const db = low(adapter);
    
    const current_session = db.get('session').value();

    var that = restify.createJsonClient({
        url: url
    });
    that._get = that.get;
    that._post = that.post;

    var session_id;
    that.get_session_id = (() => session_id);
    that.set_session_id = function (new_id) {
        session_id = new_id;
        db.set('session', session_id).write();
        that.headers['x-session-id'] = session_id;
        return session_id;
    };
    var sync_session_id = function sync_session_id(res) {
        var new_session_id = res.headers['x-session-id'];

        if (new_session_id) {
            if (new_session_id !== session_id) {
                that.set_session_id(new_session_id);
            }
        } else {
            throw("meh!\nResponse has NO session id. Don't know what to do.");
        }
    };
    that.get = function get(url, callback) {
        that._get(url, function (err, req, res, obj) {
            if (!err) {
                sync_session_id(res);
            }
            callback(err, req, res, obj);
        });
    };
    that.post = function (url, object, callback) {
        that._post(url, object, function (err, req, res, obj) {
            if (!err) {
                sync_session_id(res);
            }
            callback(err, req, res, obj);
        });
    };
    that.reset = function () {
        session_id = undefined;
        db.unset('session').write();
        delete that.headers['x-session-id'];
        return session_id;
    };
    
    if (current_session) {
        that.set_session_id(current_session);
    }
    return that;
};