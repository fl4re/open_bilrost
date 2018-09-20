/**
* Copyright (C) 2015-2018 Starbreeze AB All Rights Reserved.
*/

'use strict';

const should = require('should');

const bilrost = require('../util/bilrost');
const fixture = require('../util/fixture')('db_sync');
const workspace = require('../util/workspace')('alice', fixture);

//const test_util = new Test_util("integration__db_sync", "good_repo");

describe('Check database behaviors DO_NOT_RUN', function() {

    describe('Verify synchronisation', function() {
        let client, stop;

        before('Start node server', async () => {
            ({ client, stop } = await bilrost.start());
        });

        it('Add an asset to fs and retrieve it from the database by searching', async (done) => {
            this.timeout(5*this.timeout());
            try {
                await workspace.create('good_repo');
                await workspace.create_workspace_resource();
                await workspace.create_project_resource();
                await workspace.create_asset({
                    meta: {
                        ref: "/assets/sync_test.level"
                    },
                    main: "/resources/test/test"
                });
                await workspace.add_to_favorite_list();
                client
                    .get(`/contentbrowser/workspaces/${workspace.get_name()}/assets/`)
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
            } catch (err) {
                done(err);
            }
        });
        after('Stop node server', () => stop());

    });

    describe('Verify database persistence', function() {
        let client, stop;

        before('Start node server', async () => {
            ({ client, stop } = await bilrost.start());
        });

        it('List persisted asset', function(done){
            client
                .get(`/contentbrowser/workspaces/${workspace.get_name()}/assets/`)
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

        after("Removing fixtures", () => workspace.remove());

        after('Stop node server', () => stop());
    });

});
