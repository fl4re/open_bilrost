/**
* Copyright (C) 2015-2018 Starbreeze AB All Rights Reserved.
*/

'use strict';
const assert = require('assert');
const PORT = require('./../util/port_factory')();
const path = require('path').posix;

describe('rest3d-client', function () {
    let rest3d_client = require('../../lib/rest3d-client')('http://localhost:' + PORT, path.join(process.cwd(), 'tmp'));

    describe('sets session id from server', function () {
        var server;
        before('create server', function (done) {
            const restify = require('restify');
            server = restify.createServer({});
            server.use(function (req, res, next) {
                res.setHeader('x-session-id', 'blahblahblah');
                res.setHeader('content-type', 'application/json');
                next();
            });
            server.get('/success', function (req, res, next) {
                res.end(JSON.stringify({ok: 'ok'}));
                next();
            });
            server.get('/fail', function (req, res, next) {
                next(new restify.UnauthorizedError("Failed."));
            });
            server.listen(PORT, done);
            server.server.setTimeout(40);
        });

        it('sets session', function (done) {
            rest3d_client.get('/success', (err, req, res, obj) => {
                if (err) {return done(err);}
                assert.equal('blahblahblah', rest3d_client.get_session_id());
                assert.equal('ok', obj.ok);
                done();
            });
        });
        it('changes session', function (done) {
            rest3d_client.set_session_id('1234');
            rest3d_client.get('/success', (err, req, res, obj) => {
                if (err) {return done(err);}
                assert.equal('blahblahblah', rest3d_client.get_session_id());
                done();
            });
        });
        it('sets session even if response failed', function (done) {
            rest3d_client.get('/fail', (err, req, res, obj) => {
                assert.equal('blahblahblah', rest3d_client.get_session_id());
                if (err) {return done();}
                done("should have failed");
            });
        });
        it("deletes session", function (done) {
            rest3d_client.reset();
            assert.equal(null, rest3d_client.get_session_id());
            rest3d_client.get('/success', function (err, req, res, obj) {
                assert.equal('blahblahblah', rest3d_client.get_session_id());
                done();
            });
        });
        after('remove setting', function (done) {
            server.close(done);
        });
    });
    describe("persistance in file system", function () {

    });
});
