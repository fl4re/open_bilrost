/**
* Copyright (C) 2015-2018 Starbreeze AB All Rights Reserved.
*/

'use strict';

const should = require('should');
const error = require('../../lib/errors')('test');

describe('Check we output a readable internal error', function () {

    it('<Error>', done => {
        const err = new Error('This is an error');
        const output = error.INTERNALERROR(err);
        should.equal(output.message, '"test" encoutered an unexpected failure: This is an error');
        done();
    });

    it('bilrost <Object>', done => {
        const err = {
            status: 501,
            message: 'This is an error'
        };
        const output = error.INTERNALERROR(err);
        should.equal(output.message, '"test" encoutered an unexpected failure: This is an error');
        done();
    });

    it('unkwown <Object>', done => {
        const err = {
            allo: 'This is an error'
        };
        const output = error.INTERNALERROR(err);
        should.equal(output.message, '"test" encoutered an unexpected failure: {"allo":"This is an error"}');
        done();
    });

    it('<String>', done => {
        const err = 'This is an error';
        const output = error.INTERNALERROR(err);
        should.equal(output.message, '"test" encoutered an unexpected failure: This is an error');
        done();
    });

});
