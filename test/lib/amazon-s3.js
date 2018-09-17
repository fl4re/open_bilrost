/**
* Copyright (C) 2015-2018 Starbreeze AB All Rights Reserved.
*/

'use strict';

const fs = require('fs-extra');
const path = require('path');
const crypto = require('crypto');
const should = require('should');

const promisify = require('../../util/promisify');
const start_bilrost_client = require('../util/local_bilrost_client');
const amazon_client = require('../../lib/amazon-client');
const amazon_s3 = require('../../lib/amazon-s3');
const external_service = require("../../externals/models/external");

const test_path = path.join(process.cwd(), 'tmp', 'amazon-s3');
const cache_path = path.join(test_path, 'cache');

const cache = require('../../lib/cache')(cache_path);

const generate_string = (size, char_code) => {
    if (char_code) {
        return new Array(size).join(String.fromCharCode(char_code));
    } else {
        const get_random_string = () => String.fromCharCode(parseInt(Math.random() * 255, 10));
        let content = new Array(size - 3).join(get_random_string());
        content += get_random_string();
        content += get_random_string();
        content += get_random_string();
        return content;
    }
};
const sha256 = content => crypto.createHash('sha256').update(content).digest('hex');

const key_file_to_download = 'c0535e4be2b79ffd93291305436bf889314e4a3faec05ecffcbb7df31ad9e51a';

const external_relative_path = path.join('externals', 'scripts', 'test_amazon_s3.js');

const KB = 1024;
const MB = 1024 * KB;

describe('DO_NOT_RUN amazon-s3', function() {

    let amazon;
    before('Init bilrost', function(done) {
        this.timeout(20000);
        start_bilrost_client()
            .then(bilrost_client => {
                bilrost_client.set_session_id("1234");
                const amz_client = amazon_client(bilrost_client);
                amazon = amazon_s3(amz_client,
                    cache,
                    {
                        up_coefficient: 1.1,
                        nb_workers: 3
                    });
                done();
            });
    });

    describe('-- Exists', function() {

        it('Exists', function(done) {
            amazon.exists(key_file_to_download)
                .then(() => {
                    done();
                }).catch(done);
        });

        it("Doesn't exist", function(done) {
            amazon.exists('1234')
                .then(() => {
                    done("This resource shouldn't exist!");
                }).catch(() => {
                    done();
                });
        });

    });

    describe('-- Simple upload', function() {

        const filename = 's3_file_to_simple_upload.txt';
        const file_to_upload_path = path.join(test_path, filename);
        let file_key;

        before('Create file to upload', done => {
            const content = generate_string(1 * MB);
            file_key = sha256(content);
            fs.outputFile(file_to_upload_path, content, done);
        });

        it('Simple upload', function(done) {
            this.timeout(1000000);
            const size = fs.statSync(file_to_upload_path).size;
            const upload = amazon.simple_upload(file_to_upload_path, file_key, size);
            upload.start()
                .then(() => {
                    done();
                }).catch(done);
        });

    });

    describe('-- Download', function() {

        const filename = 's3_downloaded_file.txt';
        const download_location = path.join(test_path, filename);

        it('Download', function(done) {
            this.timeout(1000000);
            amazon.download(key_file_to_download, download_location)
                .then(() => {
                    fs.readFile(download_location, (err, content) => {
                        if (err) {
                            done(err);
                        }
                        should.equal(content, 'Hello world!');
                        done();
                    });
                }).catch(done);
        });

    });

    describe('-- Multipart upload', function() {

        const alice_filename = 'alice_file_to_multipart_upload.txt';
        const alice_file_to_upload_path = path.join(test_path, alice_filename);
        let alice_file_key;

        before('Create alice file', done => {
            const content = generate_string(1 * KB);
            alice_file_key = sha256(content);
            fs.outputFile(alice_file_to_upload_path, content, done);
        });

        const kevin_filename = 'kevin_file_to_multipart_upload.txt';
        const kevin_file_to_upload_path = path.join(test_path, kevin_filename);
        let kevin_file_key;

        const kevin_downloaded_filename = 'kevin_downloaded_file.txt';
        const download_location = path.join(test_path, kevin_downloaded_filename);

        before('Create kevin file', done => {
            const content = generate_string(7 * MB);
            kevin_file_key = sha256(content);
            fs.outputFile(kevin_file_to_upload_path, content, done);
        });

        it('Dont multipart upload too small file', function(done) {
            const size = fs.statSync(alice_file_to_upload_path).size;
            try {
                amazon.multipart_upload(alice_file_to_upload_path, alice_file_key, size);
            } catch (err) {
                err.code.should.equal(1);
                done();
            }
        });

        it('Multipart upload', function(done) {
            this.timeout(1000000);
            const size = fs.statSync(kevin_file_to_upload_path).size;
            const upload = amazon.multipart_upload(kevin_file_to_upload_path, kevin_file_key, size);
            upload.start()
                .then(() => amazon.exists(kevin_file_key))
                .then(() => amazon.download(kevin_file_key, download_location))
                .then(() => promisify(fs.readFile)(download_location))
                .then(content => {
                    const new_key = sha256(content);
                    should.equal(new_key, kevin_file_key);
                    done();
                })
                .catch(() => {
                    upload.abort()
                        .then(() => {
                            done();
                        });
                });
        });

    });

    describe('-- Abort multipart upload', function() {

        const john_filename = 'john_file_to_multipart_upload.txt';
        const john_file_to_upload_path = path.join(test_path, john_filename);
        let john_file_key;

        before('Create john file', done => {
            const content = generate_string(7 * MB);
            john_file_key = sha256(content);
            fs.outputFile(john_file_to_upload_path, content, done);
        });

        it('Abort multipart upload', function(done) {
            this.timeout(1000000);
            let is_aborted = false;
            let call_begin_part_only_once_flag = false;
            const size = fs.statSync(john_file_to_upload_path).size;
            const upload = amazon.multipart_upload(john_file_to_upload_path, john_file_key, size);
            upload.start()
                .then(() => {
                    done('This promise shouldnt resolve!');
                })
                .catch(() => {
                    should.equal(is_aborted, true);
                    done();
                });

            upload.on('begin_part', () => {
                if (!call_begin_part_only_once_flag) {
                    call_begin_part_only_once_flag = true;
                    upload.abort()
                        .then(() => {
                            is_aborted = true;
                        })
                        .catch(done);
                }
            });
        });

    });

    describe('-- Multipart upload progress', function() {

        const scrievner_filename = 'scrievner_file_to_multipart_upload.txt';
        const scrievner_file_to_upload_path = path.join(test_path, scrievner_filename);
        let scrievner_file_key;

        before('Create scrievner file', done => {
            const content = generate_string(7 * MB);
            scrievner_file_key = sha256(content);
            fs.outputFile(scrievner_file_to_upload_path, content, done);
        });

        it('Multipart upload progress', function(done) {
            this.timeout(1000000);
            let call_progress_only_once_flag = false;
            const size = fs.statSync(scrievner_file_to_upload_path).size;
            const upload = amazon.multipart_upload(scrievner_file_to_upload_path, scrievner_file_key, size);
            upload.start()
                .then(() => {
                    done();
                })
                .catch(() => {
                    upload.abort()
                        .then(() => {
                            done();
                        });
                });
            upload.on('progress', info => {
                if (!call_progress_only_once_flag) {
                    call_progress_only_once_flag = true;
                    info.loaded.should.be.aboveOrEqual(900 * KB);
                    should.equal(info.total + 1, 7 * MB);
                }
            });
        });

    });

    describe('-- Resume multipart upload', function() {

        const matt_filename = 'matt_file_to_multipart_upload.txt';
        const matt_file_to_upload_path = path.join(test_path, matt_filename);
        let matt_file_key;

        before('Create matt file', done => {
            const content = generate_string(19 * MB, 4);
            matt_file_key = sha256(content);
            fs.outputFile(matt_file_to_upload_path, content, done);
        });

        it('Resume multipart upload', function(done) {
            this.timeout(1000000);
            const size = fs.statSync(matt_file_to_upload_path).size;
            const upload = amazon.multipart_upload(matt_file_to_upload_path, matt_file_key, size);
            const external = external_service.create(external_relative_path).start();
            should.equal(external.status.get_state(), "RUNNING");
            external.stream.stdout.on('data', data => {
                if (~data.indexOf('Uploaded')) {
                    external.stop();
                    external.on('close', () => {
                        upload.start()
                            .then(() => amazon.exists(matt_file_key))
                            .then(() => {
                                done();
                            })
                            .catch(err => {
                                upload.abort()
                                    .then(() => {
                                        done(err);
                                    });
                            });
                    });
                }
            });
        });

    });

    describe('-- Upload decider', function() {

        const stephen_filename = 'stephen_file_to_decide_upload.txt';
        const stephen_file_to_upload_path = path.join(test_path, stephen_filename);
        let stephen_file_key;

        before('Create stephen file', done => {
            const content = generate_string(1 * KB);
            stephen_file_key = sha256(content);
            fs.outputFile(stephen_file_to_upload_path, content, done);
        });

        const helen_filename = 'helen_file_to_decide_upload.txt';
        const helen_file_to_upload_path = path.join(test_path, helen_filename);
        let helen_file_key;

        before('Create helen file', done => {
            const content = generate_string(7 * MB);
            helen_file_key = sha256(content);
            fs.outputFile(helen_file_to_upload_path, content, done);
        });

        it('Decide to simple upload', function(done) {
            amazon.upload(stephen_file_to_upload_path, stephen_file_key)
                .then(output => {
                    should.equal(output.id, 'simple');
                    done();
                });
        });

        it('Decide to multipart upload', function(done) {
            amazon.upload(helen_file_to_upload_path, helen_file_key)
                .then(output => {
                    should.equal(output.id, 'multipart');
                    done();
                });
        });

    });

});
