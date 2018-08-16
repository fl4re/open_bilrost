/**
* Copyright (C) 2015-2018 Starbreeze AB All Rights Reserved.
*/

'use strict';

const should = require('should');
const fs = require('fs-extra');
const config = require('../../lib/config');

const CONFIG_DIRECTORY_PATH = './tmp/config';
const CONFIG_FILE_PATH = './tmp/config/config.json';

describe('Check config', function () {

    before('Setup test directory', () => fs.mkdirSync(CONFIG_DIRECTORY_PATH));

    after('Remove test directory', () => fs.removeSync(CONFIG_DIRECTORY_PATH));

    it('check default configuration is well stored', done => {
        const conf = config({ foo: 1 }, CONFIG_DIRECTORY_PATH);
        should.equal(1, conf.foo);
        should.deepEqual({ foo: 1 }, fs.readJsonSync(CONFIG_FILE_PATH));
        fs.removeSync(CONFIG_FILE_PATH);
        done();
    });

    it('check old configuration has an higher priority than default', done => {
        let conf = config({ foo: 1 }, CONFIG_DIRECTORY_PATH);
        should.equal(1, conf.foo);
        should.deepEqual({ foo: 1 }, fs.readJsonSync(CONFIG_FILE_PATH));
        conf = config({ foo: 0 }, CONFIG_DIRECTORY_PATH);
        should.equal(1, conf.foo);
        should.deepEqual({ foo: 1 }, fs.readJsonSync(CONFIG_FILE_PATH));
        fs.removeSync(CONFIG_FILE_PATH);
        done();
    });

    it('check envs have an higher priority than default/old configuration but not persisted', done => {
        let conf = config({ foo: 1 }, CONFIG_DIRECTORY_PATH, { foo: 2 });
        should.equal(2, conf.foo);
        should.deepEqual({ foo: 1 }, fs.readJsonSync(CONFIG_FILE_PATH));
        fs.removeSync(CONFIG_FILE_PATH);
        done();
    });

    it('check cli arguments have an higher priority than default/old/envs configuration but not persisted', done => {
        let conf = config({ foo: 1 }, CONFIG_DIRECTORY_PATH, { foo: 2 }, { foo: 3 });
        should.equal(3, conf.foo);
        should.deepEqual({ foo: 1 }, fs.readJsonSync(CONFIG_FILE_PATH));
        fs.removeSync(CONFIG_FILE_PATH);
        done();
    });

});
