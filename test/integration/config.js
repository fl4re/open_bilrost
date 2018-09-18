/**
* Copyright (C) 2015-2018 Starbreeze AB All Rights Reserved.
*/

'use strict';
const assert = require('assert');
const config = require('../../config');
const restify = require('restify');
const PORT = require('../util/port_factory')();

const sample = { foo: 1, bar: 1 };

const mock_config = {
    get_all: () => sample,
    del: key => {
        delete sample[key];
    }
};

Object.defineProperty(mock_config, 'foo', {
    get: () => sample.foo,
    set: (key, new_value) => {
        sample.foo = new_value;
    }
});

Object.defineProperty(mock_config, 'bar', {
    get: () => sample.bar,
    set: new_value => {
        sample.bar = new_value;
    }
});

describe('Authentication', function() {
    var server;
    before('create server', function(done) {
        server = restify.createServer({});
        server.use(restify.queryParser());
        server.use(restify.bodyParser()); // POST mapped in req.params, req.body
        config(server, mock_config);
        server.listen(PORT, done);
        server.server.setTimeout(10);
    });
    after('remove server', function(done) {
        this.timeout(10000);
        server.close(done);
    });
    it('#GET /config', function(done) {
        var client = restify.createJSONClient({url: 'http://localhost:' + PORT});
        client.get('/config', function(err, req, res, obj) {
            assert.ifError(err);
            assert.equal(200, res.statusCode);
            assert.equal(Object.keys(obj).length, 2);
            assert.deepEqual(obj, sample);
            done();
        });
    });
    it('#GET /config/:key', function(done) {
        var client = restify.createJSONClient({url: 'http://localhost:' + PORT});
        client.get('/config/foo', function(err, req, res, obj) {
            assert.ifError(err);
            assert.equal(200, res.statusCode);
            assert.deepEqual(obj, sample.foo);
            done();
        });
    });
    it('#PUT /config/:key', function(done) {
        var client = restify.createJSONClient({url: 'http://localhost:' + PORT});
        client.put('/config/bar', { value: 2 }, function(err, req, res) {
            assert.ifError(err);
            assert.equal(204, res.statusCode);
            client.get('/config/bar', function(err, req, res, obj) {
                assert.ifError(err);
                assert.equal(200, res.statusCode);
                assert.deepEqual(obj, sample.bar);
                assert.deepEqual(obj, 2);
                done();
            });
        });
    });
    it('#DELETE /config/:key', function(done) {
        var client = restify.createJSONClient({url: 'http://localhost:' + PORT});
        client.del('/config/bar', function(err, req, res) {
            assert.ifError(err);
            assert.equal(204, res.statusCode);
            client.get('/config/bar', function(err, req, res, obj) {
                assert.ifError(err);
                assert.equal(200, res.statusCode);
                assert.deepEqual(obj, 'N/A');
                assert.deepEqual(undefined, sample.bar);
                done();
            });
        });
    });
});
