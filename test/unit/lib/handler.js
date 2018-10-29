/**
* Copyright (C) 2015-2018 Starbreeze AB All Rights Reserved.
*/

'use strict';

const assert = require('assert');
const sinon = require('sinon');
const http = require('http');

describe('handler', function() {
    const create_handler = require('../../../lib/handler');
    const req = {};
    const res = new http.ServerResponse({});
    const next = sinon.spy();

    it('can be created', () => {
        const handler = create_handler(req, res, next);
        assert(handler);
    });

    it('has a sendJSON method', () => {
        const handler = create_handler(req, res, next);
        assert.equal('function', typeof handler.sendJSON);
    });

    it('has a sendError method', () => {
        const handler = create_handler(req, res, next);
        assert.equal('function', typeof handler.sendError);
    });

    it('has a redirect method', () => {
        const handler = create_handler(req, res, next);
        assert.equal('function', typeof handler.redirect);
    });

    describe('sendJSON', () => {
        let req, res, next;
        const handler = () => create_handler(req, res, next);
        beforeEach(() => {
            req = {};
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
            it('sets content type to json', () => {
                handler().sendJSON(obj);
                assert.equal('application/json', res._headers['content-type']);
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


    describe('sendText', () => {
        let req, res, next;
        const handler = () => create_handler(req, res, next);
        beforeEach(() => {
            req = {};
            res = new http.ServerResponse({});
            next = sinon.spy();
        });

        describe('(text)', () => {
            const output = 'one';
            it('sets response', () => {
                res = {setHeader: sinon.spy(), writeHead: sinon.spy(), end: sinon.spy()};
                handler().sendText(output);
                assert(res.setHeader.called);
                assert(res.writeHead.called);
                assert(res.end.calledWith(output));
            });
            it('sets status code to 200', () => {
                handler().sendText(output);
                assert.equal(200, res.statusCode);
            });
            it('calls next', () => {
                handler().sendText(output);
                assert(next.called);
            });
            it('sets content type to plain/text', () => {
                handler().sendText(output);
                assert.equal('text/plain', res._headers['content-type']);
            });
        });
        describe('(text, status_code)', () => {
            const output = 'one';
            it('sets status code', () => {
                handler().sendText(output, 233);
                assert.equal(233, res.statusCode);
            });
        });
    });

    describe('sendHTML', () => {
        let req, res, next;
        const handler = () => create_handler(req, res, next);
        beforeEach(() => {
            req = {headers: {accept: ['application/json']}};
            res = new http.ServerResponse({});
            next = sinon.spy();
        });

        describe('(html)', () => {
            const html = '<body></body>';
            it('sets response', () => {
                res = {setHeader: sinon.spy(), writeHead: sinon.spy(), end: sinon.spy()};
                handler().sendHTML(html);
                assert(res.setHeader.called);
                assert(res.writeHead.called);
                assert(res.end.calledWith(html));
            });
            it('sets status code to 200', () => {
                handler().sendHTML(html);
                assert.equal(200, res.statusCode);
            });
            it('calls next', () => {
                handler().sendHTML(html);
                assert(next.called);
            });
            it('sets content type to json', () => {
                handler().sendHTML(html);
                assert.equal('text/html', res._headers['content-type']);
            });
        });
        describe('(html, status_code)', () => {
            const html = '<body></body>';
            it('sets status code', () => {
                handler().sendHTML(html, 233);
                assert.equal(233, res.statusCode);
            });
        });
    });

    describe('sendError', () => {
        let req, res, next;
        const handler = () => create_handler(req, res, next);
        beforeEach(() => {
            req = {headers: {accept: ['application/json']}};
            res = new http.ServerResponse({});
            next = sinon.spy();
        });

        describe('(Error)', () => {
            const error = new Error("Test error message");
            it('sets response to error stack', () => {
                res = {setHeader: sinon.spy(), writeHead: sinon.spy(), end: sinon.spy()};
                handler().sendError(error);
                assert(res.setHeader.called);
                assert(res.writeHead.called);
                assert(res.end.calledWith(JSON.stringify(error.stack)));
            });
            it('sets status code to 500', () => {
                handler().sendError(error);
                assert.equal(500, res.statusCode);
            });
            it('calls next', () => {
                handler().sendError(error);
                assert(next.called);
            });
            it('sets content type to json', () => {
                handler().sendError(error);
                assert.equal('application/json', res._headers['content-type']);
            });
        });
        describe('({message, statusCode})', () => {
            const error = {message: "Test error message", statusCode: 533};
            it('sets response to message', () => {
                res = {setHeader: sinon.spy(), writeHead: sinon.spy(), end: sinon.spy()};
                handler().sendError(error);
                assert(res.setHeader.called);
                assert(res.writeHead.called);
                assert(res.end.calledWith(JSON.stringify(error.message)));
            });
            it('renders error statusCode', () => {
                handler().sendError(error);
                assert.equal(533, res.statusCode);
            });
        });
        describe('(string)', () => {
            const error = "Test error message";
            it('sets response to string', () => {
                res = {setHeader: sinon.spy(), writeHead: sinon.spy(), end: sinon.spy()};
                handler().sendError(error);
                assert(res.setHeader.called);
                assert(res.writeHead.called);
                assert(res.end.calledWith(JSON.stringify(error)));
            });
            it('ignores status code', () => {
                handler().sendError(error, 533);
                assert.equal(500, res.statusCode);
            });
        });
    });
});
