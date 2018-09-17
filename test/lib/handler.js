/**
* Copyright (C) 2015-2018 Starbreeze AB All Rights Reserved.
*/

'use strict';

const assert = require('assert');
const sinon = require('sinon');
const http = require('http');

describe('handler', function() {
    const Handler = require('../../lib/handler');
    const req = {headers: {accept: ['application/json']}};
    const res = new http.ServerResponse({});
    const next = sinon.spy();

    it('can be created', () => {
        const handler = new Handler(req, res, next);
        assert(handler);
    });

    it('has a sendJSON method', () => {
        const handler = new Handler(req, res, next);
        assert.equal('function', typeof handler.sendJSON);
    });

    it('has a handleError method', () => {
        const handler = new Handler(req, res, next);
        assert.equal('function', typeof handler.handleError);
    });

    it('has a redirect method', () => {
        const handler = new Handler(req, res, next);
        assert.equal('function', typeof handler.redirect);
    });

    describe('sendJSON', () => {
        let req, res, next;
        const handler = () => new Handler(req, res, next);
        beforeEach(() => {
            req = {headers: {accept: ['application/json']}};
            res = new http.ServerResponse({});
            next = sinon.spy();
        });

        describe('(object)', () => {
            const obj = {one: 1};
            it('sets response', () => {
                res = {setHeader: sinon.spy(), writeHead: sinon.spy(), end: sinon.spy()};
                handler().sendJSON(obj);
                assert(res.setHeader.called);
                assert(res.writeHead.called);
                assert(res.end.calledWith(JSON.stringify(obj)));
            });
            it('sets status code to 200', () => {
                handler().sendJSON(obj);
                assert.equal(200, res.statusCode);
            });
            it('calls next', () => {
                handler().sendJSON(obj);
                assert(next.called);
            });
            it('sets cache control headers', () => {
                handler().sendJSON(obj);
                assert(res._headers['cache-control']);
            });
            it('allows CORS', () => {
                handler().sendJSON(obj);
                assert(res._headers['access-control-allow-origin']);
            });
            it('sets content type to json', () => {
                handler().sendJSON(obj);
                assert.equal('application/json', res._headers['content-type']);
            });
        });
        describe('(Error)', () => {
            const error = new Error("Test error");
            it('renders error statusCode', () => {
                handler().sendJSON(error);
                assert.equal(500, res.statusCode);
            });
            it('calls next', () => {
                handler().sendJSON(error);
                assert(next.called);
            });
        });
        describe('(object, status_code)', () => {
            const obj = {one: 1};
            it('sets status code', () => {
                handler().sendJSON(obj, 233);
                assert.equal(233, res.statusCode);
            });
        });
        describe('(object, status_code, mime_type)', () => {
            const obj = {one: 1};
            it('sets content-type to bilrost', () => {
                handler().sendJSON(obj, 200, 'whatever');
                assert.equal('application/vnd.bilrost.whatever+json', res._headers['content-type']);
            });
        });
    });
    describe('sendError', () => {
        let req, res, next;
        const handler = () => new Handler(req, res, next);
        beforeEach(() => {
            req = {headers: {accept: ['application/json']}};
            res = new http.ServerResponse({});
            next = sinon.spy();
        });

        describe('(Error)', () => {
            const error = new Error("Test error message");
            it('sets response to error stack', () => {
                res = {setHeader: sinon.spy(), writeHead: sinon.spy(), end: sinon.spy()};
                handler().handleError(error);
                assert(res.setHeader.called);
                assert(res.writeHead.called);
                assert(res.end.calledWith(JSON.stringify(error.stack)));
            });
            it('sets status code to 500', () => {
                handler().handleError(error);
                assert.equal(500, res.statusCode);
            });
            it('calls next', () => {
                handler().handleError(error);
                assert(next.called);
            });
            it('sets cache control headers', () => {
                handler().handleError(error);
                assert(res._headers['cache-control']);
            });
            it('allows CORS', () => {
                handler().handleError(error);
                assert(res._headers['access-control-allow-origin']);
            });
            it('sets content type to json', () => {
                handler().handleError(error);
                assert.equal('application/json', res._headers['content-type']);
            });
        });
        describe('({message, statusCode})', () => {
            const error = {message: "Test error message", statusCode: 533};
            it('sets response to message', () => {
                res = {setHeader: sinon.spy(), writeHead: sinon.spy(), end: sinon.spy()};
                handler().handleError(error);
                assert(res.setHeader.called);
                assert(res.writeHead.called);
                assert(res.end.calledWith(JSON.stringify(error.message)));
            });
            it('renders error statusCode', () => {
                handler().handleError(error);
                assert.equal(533, res.statusCode);
            });
        });
        describe('(string)', () => {
            const error = "Test error message";
            it('sets response to string', () => {
                res = {setHeader: sinon.spy(), writeHead: sinon.spy(), end: sinon.spy()};
                handler().handleError(error);
                assert(res.setHeader.called);
                assert(res.writeHead.called);
                assert(res.end.calledWith(JSON.stringify(error)));
            });
            it('ignores status code', () => {
                handler().handleError(error, 533);
                assert.equal(500, res.statusCode);
            });
        });
    });
});
