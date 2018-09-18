/**
* Copyright (C) 2015-2018 Starbreeze AB All Rights Reserved.
*/

'use strict';

// Print stack trace for debugging
global.debug = true;

const path = require('path');
const should = require('should');
const Test_util = require('../util/test_util');
const bilrost = require('../util/bilrost');

let client, test_util;

describe('Run Workspace related functional tests for the API', function() {

    let name, err, req, res;
    const bilrost_client = {
        get: (url, callback) => callback(err, req, res, test_util.get_example_project())
    };

    before("Starting a Content Browser server", async () => {
        client = await bilrost.start({
            bilrost_client,
            protocol: 'ssh'
        });
        test_util = new Test_util("branch", "good_repo", client);
        name = test_util.get_example_project().name;
    });

    before("Creating fixtures", function(done) {
        this.timeout(5*this.timeout()); // = 5 * default = 5 * 2000 = 10000
        client
            .post('/assetmanager/workspaces')
            .send({
                file_uri: test_util.get_carol_file_uri(),
                from_repo: true,
                name: name,
                description: test_util.get_example_project().description.comment,
                organization: test_util.get_example_project().owner.login,
                project_name: test_util.get_example_project().name,
                branch: 'good_repo'
            })
            .set("Content-Type", "application/json")
            .set("Accept", 'application/json')
            .expect(200)
            .end((err, res) => {
                if (err) {
                    return done({ error: err.toString(), status: res.status, body: res.body });
                }
                let obj = test_util.get_favorite().search(test_util.get_carol_file_uri());

                obj.should.be.an.Object;
                should.equal(test_util.does_workspace_exist('new_workspace_v2'), true);
                done();
            });
    });

    after('Delete a workspace', function(done) {
        this.timeout(this.timeout * 3);
        client
            .delete(path.join('/assetmanager/workspaces/', name))
            .send()
            .set("Accept", 'application/json')
            .set("Content-Type", "application/json")
            .expect(200)
            .end((err, res) => {
                if (err) {
                    return done({ error: err.toString(), status: res.status, body: res.body });
                }
                test_util.get_favorite().search(test_util.get_carol_file_uri()).should.equal(false);
                should.equal(test_util.does_workspace_exist('new_workspace_v2'), false);
                done();
            });
    });

    it('Get branch name', function(done) {
        client
            .get('/contentbrowser/workspaces/' + name + '/branch')
            .expect(200)
            .set('Accept', 'application/json')
            .end((err, res) => {
                if (err) {
                    return done({ error: err.toString(), status: res.status, body: res.body });
                }
                res.body.should.equal('good_repo');
                done();
            });
    });

    it('Get branch names', function(done) {
        client
            .get('/contentbrowser/workspaces/' + name + '/branches')
            .expect(200)
            .set('Accept', 'application/json')
            .end((err, res) => {
                if (err) {
                    return done({ error: err.toString(), status: res.status, body: res.body });
                }
                res.body.totalRemotes.should.above(2);
                done();
            });
    });

    it('Create a branch', function(done) {
        client
            .put('/assetmanager/workspaces/' + name + '/branch/test')
            .send()
            .set('Accept', 'application/json')
            .expect(201)
            .end((err, res) => {
                if (err) {
                    return done({ error: err.toString(), status: res.status, body: res.body });
                }
                should.equal(res.body, 'created');
                done();
            });
    });

    it('Change to existing branch', function(done) {
        this.timeout(4000);
        client
            .post('/assetmanager/workspaces/' + name + '/branch/good_repo/change')
            .send()
            .set('Accept', 'application/json')
            .expect(200)
            .end((err, res) => {
                if (err) {
                    return done({ error: err.toString(), status: res.status, body: res.body });
                }
                should.equal(res.body, 'Ok');
                done();
            });
    });

    it('Delete a branch', function(done) {
        client
            .del('/assetmanager/workspaces/' + name + '/branch/test')
            .send()
            .expect(200)
            .set('Accept', 'application/json')
            .end((err, res) => {
                if (err) {
                    return done({ error: err.toString(), status: res.status, body: res.body });
                }
                should.equal(res.body, 'removed');
                done();
            });
    });

    it('Fail to create already existing branch', function(done) {
        client
            .put('/assetmanager/workspaces/' + name + '/branch/good_repo')
            .send()
            .set('Accept', 'application/json')
            .expect(500)
            .end((err, res) => {
                should.exist(res.body.indexOf('"Repo manager" encoutered an unexpected failure'));
                done();
            });
    });

    it('Fail to change to an unknown branch', function(done) {
        this.timeout(10000);
        client
            .post('/assetmanager/workspaces/' + name + '/branch/uknown/change')
            .send()
            .set('Accept', 'application/json')
            .expect(500)
            .end((err, res) => {
                should.exist(res.body.indexOf('"Repo manager" encoutered an unexpected failure'));
                done();
            });
    });

});
