/**
* Copyright (C) 2015-2018 Starbreeze AB All Rights Reserved.
*/

'use strict';

const should = require('should');

const fixture = require('../util/fixture')('integration_populate_workspace');
const workspace = require('../util/workspace')('carol', fixture);
const bilrost = require('../util/server')(fixture);

let client;

describe('Run Workspace related functional tests for the API', function() {
    /* faking bilrost-client
       we define a bilrost_client that simply calls the callback with
       the predefined parameters.
       These parameters are only declared here, and they are set in
       a before clause according to what we want to test.
     */
    let err, req, res, obj;
    const bilrost_client = {
        get: (url, callback) => callback(err, req, res, obj)
    };

    before("Starting a Content Browser server", async () => {
        client = await bilrost.start({
            bilrost_client,
            protocol: 'ssh',
            config_path: fixture.get_config_path()
        });
    });

    before('Creating fixtures', async () => {
        this.timeout(5*this.timeout()); // = 5 * default = 5 * 2000 = 10000
        await workspace.create('good_repo');
    });

    describe('Populate eloise workspaces', function() {

        before('Set bilrost_client answer', function() {
            err = false;
            req = null;
            res = null;
            obj = workspace.get_project_resource();
        });

        it('Populate a workspace', function(done) {
            this.timeout(8*this.timeout());
            client
                .post('/assetmanager/workspaces/populate')
                .send({
                    file_uri: workspace.get_file_uri(),
                    name: workspace.get_name(),
                    description: workspace.get_project_resource().description.comment
                })
                .set('Content-Type', 'application/json')
                .expect(200)
                .end((err, res) => {
                    if (err) {
                        return done({ error: err.toString(), status: res.status, body: res.body });
                    }

                    obj.should.be.an.Object;
                    should.equal(workspace.validate_workspace_root_directories(), true);
                    should.equal(workspace.validate_workspace_internal_directories(), true);
                    done();
                });
        });
        it('Delete well the populated workspace', function(done){
            client
                .delete(`/assetmanager/workspaces/${workspace.get_encoded_file_uri()}`)
                .send()
                .set("Content-Type", "application/json")
                .expect(200)
                .end((err, res) => {
                    if (err) {
                        return done({ error: err.toString(), status: res.status, body: res.body });
                    }
                    should.equal(workspace.validate_workspace_root_directories(), false);
                    done();
                });
        });
    });

});
