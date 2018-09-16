/**
* Copyright (C) 2015-2018 Starbreeze AB All Rights Reserved.
*/

'use strict';

const should = require('should');
const _path = require('path').posix;

const utilities = require('../../../assetmanager/workspace_utilities')(path => _path.join('.bilrost', path ? path : '/'));

describe('Format namespaces', function() {

    it('/assets/', done => {
        const formatted_path = utilities.format_namespaces('.bilrost/assets/');
        should.equal(formatted_path, '.bilrost/assets/');
        done();
    });

    it('/assets/foo', done => {
        const formatted_path = utilities.format_namespaces('.bilrost/assets/foo');
        should.equal(formatted_path, '.bilrost/assets/foo');
        done();
    });

    it('/assets/foo/bar', done => {
        const formatted_path = utilities.format_namespaces('.bilrost/assets/foo/bar');
        should.equal(formatted_path, '.bilrost/assets/$foo/bar');
        done();
    });

    it('/assets/foo/foo/bar', done => {
        const formatted_path = utilities.format_namespaces('/.bilrost/assets/foo/foo/bar');
        should.equal(formatted_path, '.bilrost/assets/$foo/$foo/bar');
        done();
    });

});

describe('Unformat namespaces', function() {

    it('/assets/', done => {
        const formatted_path = utilities.unformat_namespaces('.bilrost/assets/');
        should.equal(formatted_path, '.bilrost/assets/');
        done();
    });

    it('/assets/foo', done => {
        const formatted_path = utilities.unformat_namespaces('.bilrost/assets/foo');
        should.equal(formatted_path, '.bilrost/assets/foo');
        done();
    });

    it('/assets/foo/bar', done => {
        const formatted_path = utilities.unformat_namespaces('.bilrost/assets/$foo/bar');
        should.equal(formatted_path, '.bilrost/assets/foo/bar');
        done();
    });

    it('/assets/foo/foo/bar', done => {
        const formatted_path = utilities.unformat_namespaces('.bilrost/assets/$foo/$foo/bar');
        should.equal(formatted_path, '.bilrost/assets/foo/foo/bar');
        done();
    });

});
