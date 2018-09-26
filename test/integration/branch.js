/**
* Copyright (C) 2015-2018 Starbreeze AB All Rights Reserved.
*/

'use strict';

// Print stack trace for debugging
global.debug = true;

const should = require('should');
const fixture = require('../util/fixture')('integration_asset');
const workspace = require('../util/workspace')('carol', fixture);
const bilrost = require('../util/server');

let client, encoded_file_uri = workspace.get_encoded_file_uri();

describe('Run Workspace related functional tests for the API', function() {

    let err, req, res;
    const bilrost_client = {
        get: (url, callback) => callback(err, req, res, workspace.get_project_resource())
    };

    before("Starting a Content Browser server", async () => {
        client = await bilrost.start({
            bilrost_client,
            protocol: 'ssh'
        });
    });

    before("Creating fixtures", async function () {
        this.timeout(4000)
        await workspace.create('good_repo');
        await workspace.create_workspace_resource();
        await workspace.create_project_resource();
    });
    after("Removing fixtures", () => workspace.remove());

    it('Get branch name', function(done) {
        client
            .get(`/contentbrowser/workspaces/${encoded_file_uri}/branch`)
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
            .get(`/contentbrowser/workspaces/${encoded_file_uri}/branches`)
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
            .put(`/assetmanager/workspaces/${encoded_file_uri}/branch/test`)
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
            .post(`/assetmanager/workspaces/${encoded_file_uri}/branch/good_repo/change`)
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
            .del(`/assetmanager/workspaces/${encoded_file_uri}/branch/test`)
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
            .put(`/assetmanager/workspaces/${encoded_file_uri}/branch/good_repo`)
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
            .post(`/assetmanager/workspaces/${encoded_file_uri}/branch/unknown/change`)
            .send()
            .set('Accept', 'application/json')
            .expect(500)
            .end((err, res) => {
                should.exist(res.body.indexOf('"Repo manager" encoutered an unexpected failure'));
                done();
            });
    });

});
