/**
* Copyright (C) 2015-2018 Starbreeze AB All Rights Reserved.
*/

'use strict';

const spawn = require('child_process').spawn;
const should = require('should');
const readline = require('readline');
const supertest = require('supertest');
const fs = require('fs-extra');
const Path = require('path');

const Test_util = require('../util/test_util');
const test_util = new Test_util("integration__db_sync", "good_repo");

describe('Check database behaviors', function() {

    const sample_asset = {
        "meta":{
            "ref": "/assets/sync_test.level",
            "type": "application/vnd.bilrost.level+json",
            "created": "2016-03-16T14:41:10.384Z",
            "modified": "2016-03-18T10:54:05.870Z",
            "version":"1.1.0",
            "author": ""
        },
        "comment": "",
        "tags": [],
        "main": "/resources/test/test",
        "dependencies": [],
        "semantics": []
    };

    describe('Verify synchronisation', function() {
        let server;

        before('Start node server', function(done) {
            server = spawn('node', ['index']);
            readline.createInterface({input: server.stdout}).on('line', line => {
                let msg;
                try {
                    msg = JSON.parse(line).msg;
                } catch(e) {
                    // eslint-disable-next-line no-console
                    console.log(line.toString());
                }
                if (msg === 'Listening at port: 9224') {
                    test_util.client = supertest('http://localhost:9224');
                    done();
                }
            });
        });

        it('Add an asset to fs and retrieve it from the database by searching', function(done) {
            this.timeout(5*this.timeout()); // = 5 * default = 5 * 2000 = 10000
            const path = Path.join(test_util.get_eloise_path(), '.bilrost', 'assets', 'sync_test.level');
            test_util.create_eloise_fixtures()
                .then(() => test_util.create_eloise_workspace_project_file())
                .then(() => test_util.create_eloise_workspace_properties_file())
                .then(() => {
                    fs.outputJsonSync(path, sample_asset);
                })
                .then(() => test_util.add_eloise_to_favorite())
                .then(() => {
                    test_util.client
                        .get('/contentbrowser/workspaces/' + test_util.get_workspace_name() + '/assets/')
                        .set("Content-Type", "application/json")
                        .set("Accept", 'application/json')
                        .expect("Content-Type", "application/json")
                        .expect(200)
                        .end((err, res) => {
                            let obj = res.body;
                            if (err) {
                                return done({ error: err.toString(), status: res.status, body: obj });
                            }
                            should.equal(obj.totalItems, 2);
                            should.equal(obj.totalNamespaces, 2);
                            done();
                        });
                })
                .catch(done);
        });
        after('Stop node server', function(done) {
            server.on('close', () => done());
            server.kill('SIGINT');
        });

    });

    describe('Verify database persistence', function() {
        let server;

        before('Start node server', function(done) {
            server = spawn('node', ['index']);
            readline.createInterface({input: server.stdout}).on('line', line => {
                let msg;
                try {
                    msg = JSON.parse(line).msg;
                } catch(e) {
                    // eslint-disable-next-line no-console
                    console.log(line.toString());
                }

                if (msg === 'Bilrost started') {
                    test_util.client = supertest('http://localhost:9224');
                    done();
                }
            });
        });

        it('List persisted asset', function(done){
            test_util.client
                .get('/contentbrowser/workspaces/' + test_util.get_workspace_name() + '/assets/')
                .set("Content-Type", "application/json")
                .set("Accept", 'application/json')
                .expect("Content-Type", "application/json")
                .expect(200)
                .end((err, res) => {
                    let obj = res.body;
                    if (err) {
                        return done({ error: err.toString(), status: res.status, body: obj });
                    }
                    should.equal(obj.totalItems, 2);
                    should.equal(obj.totalNamespaces, 2);
                    done();
                });
        });

        after("Removing fixtures", done => {
            this.timeout(3*this.timeout()); // = 3 * default = 3 * 2000 = 6000
            test_util.remove_fixtures(done);
        });

        after('Stop node server', function(done) {
            server.on('close', () => done());
            server.kill('SIGINT');
        });

    });

});
