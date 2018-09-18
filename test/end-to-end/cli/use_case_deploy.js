/**
* Copyright (C) 2015-2018 Starbreeze AB All Rights Reserved.
*/

'use strict';

const should = require('should');
const path = require('path').posix;
const exec = require('child_process').exec;

const external_service = require('../../../externals/models/external');

const bilrost_path = 'index.js';
const bilrost_server_path = 'node_modules/open_bilrost_server/index.js';

const is_win = /^win/.test(process.platform);
const bilrost_cli_path = path.join(__dirname.replace(/\\/g, '/'), '../../../cli');

let bilrost_external, bilrost_server_external;

describe('Integration tests --DO_NOT_RUN', function() {

    beforeEach("Start bilrost", function(done) {
        this.timeout(40000);
        bilrost_external = external_service.create(bilrost_path).start();
        should.equal(bilrost_external.status.get_state(), "RUNNING");
        const log_trigger = "Bilrost started";
        bilrost_external.stream.stdout.on('data', data => {
            const log = data.toString('utf8');
            // eslint-disable-next-line no-console
            console.log(log);
            if(~log.indexOf(log_trigger)) {
                done();
            }
        });
        const err_trigger = "already running!";
        bilrost_external.stream.stderr.on('data', data => {
            const log = data.toString('utf8');
            // eslint-disable-next-line no-console
            console.log(log);
            if(~log.indexOf(err_trigger)) {
                done();
            }
        });
    });

    beforeEach("Start bilrost server", function(done) {
        this.timeout(40000);
        bilrost_server_external = external_service.create(bilrost_server_path).start();
        should.equal(bilrost_server_external.status.get_state(), "RUNNING");
        const log_trigger = "Running on port 3000";
        bilrost_server_external.stream.stdout.on('data', data => {
            const log = data.toString('utf8');
            // eslint-disable-next-line no-console
            console.log(log);
            if(~log.indexOf(log_trigger)) {
                done();
            }
        });
    });

    afterEach("Kill all processes", done => {
        bilrost_external.stop({ pid: bilrost_external.pid });
        bilrost_external.on('close', () => {
            bilrost_server_external.stop({ pid: bilrost_server_external.pid });
            bilrost_server_external.on('close', () => done());
        });
    });

    it('Deploy use case', function(done) {
        this.timeout(1000 * 1000);
        const command = is_win ? 'use_case_deploy.bat' : 'sh use_case_deploy.sh';
        exec(command, { cwd: bilrost_cli_path, readBuffer: 1024 * 1024 * 10 }, (error, stdout, stderr) => {
            should.not.exist(error);
            // eslint-disable-next-line no-console
            console.log(stderr);
            should.equal(stdout.match(/success/gi).length, 15);
            done();
        });
    });

});
