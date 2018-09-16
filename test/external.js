/**
* Copyright (C) 2015-2018 Starbreeze AB All Rights Reserved.
*/

"use strict";
const external_service = require("../externals/models/external.js");
const fs = require("fs-extra");
const path = require("path");
var should = require('should');

const fixtures_path = path.join(process.cwd(), 'tmp', 'fixtures', 'external');

const sync_external_path = path.join(fixtures_path, "sync.js");
const sync_relative_path = path.join('tmp', 'fixtures', 'external', 'sync.js');
const sync_external = external_service.create(sync_relative_path);
const sync_log_message = "Hello world!";
const sync_script = 'console.log("'+ sync_log_message +'");';

const async_external_path = path.join(fixtures_path, "async.js");
const async_relative_path = path.join('tmp', 'fixtures', 'external', 'async.js');
const async_external = external_service.create(async_relative_path);
const async_script = 'process.stdin.resume();';

describe('Externals', function() {

    before("Create synchronous external script", done => {
        fs.outputFile(sync_external_path, sync_script, err => {
            if (err) {
                return err;
            }
            done();
        });
    });

    before("Create asynchronous external script", done => {
        fs.outputFile(async_external_path, async_script, err => {
            if (err) {
                return err;
            }
            done();
        });
    });

    it("Start a 'synchronous' external", done => {
        const test_external = sync_external.start();
        should.equal(test_external.status.get_state(), "RUNNING");
        test_external.on('close', () => {
            test_external.pid.should.type("number");
            should.equal(sync_relative_path, test_external.relative_path);
            should.equal(test_external.status.get_info("stdout"), sync_log_message+"\n");
            should.equal(test_external.status.get_state("stdout"), "CLOSED");
            done();
        });
    });

    it("Stop a 'asynchronous' external", done => {
        const test_external = async_external.start();
        should.equal(test_external.status.get_state(), "RUNNING");
        async_external.stop();
        should.equal(test_external.status.get_state(), "CLOSED");
        done();
    });

    it("Don't start same external twice", done => {
        try {
            async_external.start();
            async_external.start();
        } catch (err) {
            should.equal(err, async_relative_path+" external process is already running!");
            done();
        }
    });

});
