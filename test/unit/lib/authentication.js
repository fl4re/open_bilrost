/**
* Copyright (C) 2015-2018 Starbreeze AB All Rights Reserved.
*/

'use strict';
const assert = require('assert');
const sinon = require('sinon');
const authentication = require('../../../authentication');
const restify = require('restify');
const PORT = require('../../util/port_factory')();

describe('Authentication', function() {
    var server;
    // backend is a complete fake of the bilrost used in this test
    var backend = {
        get: () => {}
    };
    before('create server', function(done) {
        server = restify.createServer({});
        server.use(restify.queryParser());
        server.use(restify.bodyParser());
        authentication(server, backend);
        server.listen(PORT, done);
        server.server.setTimeout(10);
    });
    after('remove server', function(done) {
        this.timeout(10000);
        server.close(done);
    });
    describe('#GET /auth/access_token without access code', function() {
        before(function() {
            backend.get = function(path, callback) {
                assert.equal('/auth/access_code', path);
                const res = {
                    statusCode: 302,
                    headers: {
                        location: 'github'
                    }
                };
                callback(null, {}, res, {});
            };
        });

        it('redirects to github', function(done) {
            var client = restify.createJSONClient({url: 'http://localhost:' + PORT});
            client.get('/auth/access_token', function(err, req, res) {
                assert.ifError(err);
                assert.equal(302, res.statusCode);
                assert.equal('github', res.headers.location);
                done();
            });
        });

    });

    describe('#GET /auth/access_token with access code', function() {
        before(function() {
            backend.get = function(path, callback) {
                assert.equal('/auth/access_token?code=1234', path);
                callback(null, {}, {}, {
                    session_id: 'authenticated_session_id',
                    user_name: 'test_user_name',
                    message: "Hi, " + 'test_user_name'
                });
            };
        });

        it('returns and access token', function(done) {
            var client = restify.createJSONClient({url: 'http://localhost:' + PORT});
            client.get('/auth/access_token?code=1234', function(err, req, res) {
                assert.ifError(err);
                assert.equal(200, res.statusCode);
                assert.equal(res.body.includes('test_user_name'), true);
                done();
            });
        });
    });


    describe('#GET /auth/whoami', function() {
        before(function() {
            backend.get = function(path, callback) {
                assert.equal('/rest3d/user', path);
                callback(null, {}, { statusCode: 200 }, {
                    displayName: "foo",
                    email: "foo@bar.com"
                });
            };
        });

        it('returns and access token', function(done) {
            var client = restify.createJSONClient({url: 'http://localhost:' + PORT});
            client.get('/auth/whoami', function(err, req, res, obj) {
                assert.ifError(err);
                assert.equal(200, res.statusCode);
                assert.equal('foo', obj.displayName);
                assert.equal('foo@bar.com', obj.email);
                done();
            });
        });
    });

    describe('#PUT /auth/session', function() {

        it('returns and access token', function(done) {
            var client = restify.createJSONClient({url: 'http://localhost:' + PORT});
            backend.set_session_id = sinon.stub();
            client.put('/auth/session', { id: '1234' }, function(err, req, res, obj) {
                assert.ifError(err);
                assert.equal(200, res.statusCode);
                assert.equal('Ok', obj);
                assert(backend.set_session_id.calledWith('1234'));
                done();
            });
        });
    });


});
