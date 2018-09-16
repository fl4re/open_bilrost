/**
* Copyright (C) 2015-2018 Starbreeze AB All Rights Reserved.
*/

'use strict';

const path = require('path').posix;
const Test_util = require('../../../util/test_util');
const status_config = require('../../../../assetmanager/status.config.json');

var test_util = new Test_util("status", "good_repo");

describe('Run Status related functional tests for the API', function() {

    before("Starting a Content Browser server", done => test_util.start_server(done));

    before("Creating fixtures", function(done) {
        this.timeout(5*this.timeout()); // = 5 * default = 5 * 2000 = 10000
        test_util.create_eloise_fixtures()
            .then(() => test_util.create_eloise_workspace_project_file())
            .then(() => test_util.create_eloise_workspace_properties_file())
            .then(() => test_util.add_eloise_to_favorite())
            .then(() => done())
            .catch(err => {
                done(err);
            });
    });
    after("Removing fixtures", done => test_util.remove_fixtures(done));

    describe('Retrieve Status', function() {
        it('Retrieve general Status of the Workspace', function(done) {
            this.timeout(7*this.timeout()); // = 5 * default = 5 * 2000 = 10000
            test_util.client
                .get(path.join('/assetmanager/workspaces/', test_util.get_workspace_name(), '/status'))
                .set("Accept", 'application/json')
                .expect(200)
                .end((err, res) => {
                    if (err) {
                        return done({ error: err.toString(), status: res.status, body: res.body });
                    }
                    res.body.integrity_status.should.equal(status_config.integrity.VALID);
                    res.body.sync_status.should.equal(status_config.sync.UP_TO_DATE);
                    done();
                });
        });

        it('Add Asset Subscription to Workspace', function(done) {
            this.timeout(5*this.timeout()); // = 5 * default = 5 * 2000 = 10000
            test_util.client
                .post(path.join('/assetmanager/workspaces/', test_util.get_workspace_name(), '/subscriptions'))
                .send({
                    type: "ASSET",
                    descriptor: "/assets/test_1_1_0.level"
                })
                .set("Accept", 'application/json')
                .expect(200)
                .end((err, res) => {
                    if (err) {
                        return done({ error: err.toString(), status: res.status, body: res.body });
                    }

                    res.error.should.equal(false);
                    res.body.should.be.an.Object;
                    res.body.type.should.equal('ASSET');
                    done();
                });
        });

        it('Retrieve status of specific Asset from Workspace', function(done) {
            this.timeout(5*this.timeout()); // = 5 * default = 5 * 2000 = 10000
            test_util.client
                .get(path.join('/assetmanager/workspaces/', test_util.get_workspace_name(), '/status', '/assets/test_1_1_0.level'))
                .set("Accept", 'application/json')
                .expect(200)
                .end((err, res) => {
                    if (err) {
                        return done({ error: err.toString(), status: res.status, body: res.body });
                    }
                    done();
                });
        });
    });
});
