/**
* Copyright (C) 2015-2018 Starbreeze AB All Rights Reserved.
*/

'use strict';

const should = require('should');

const bilrost = require('../util/bilrost');
const fixture = require('../util/fixture')('db_sync');
const workspace = require('../util/workspace')('alice', fixture);

describe('Check database behaviors', function() {

    describe('Verify synchronisation', function() {
        let client, stop;

        before('Start node server', async () => {
            ({ client, stop } = await bilrost.start());
        });

        it('Add an asset to fs and retrieve it from the database by searching', () => new Promise(async (resolve, reject) => {
            this.timeout(5*this.timeout());
            try {
                await workspace.create('good_repo');
                workspace.create_workspace_resource();
                workspace.create_project_resource();
                await workspace.create_asset({
                    meta: {
                        ref: "/assets/sync_test.level"
                    },
                    main: "/resources/test/test"
                });
                client
                    .get(`/contentbrowser/workspaces/${workspace.get_encoded_file_uri()}/assets/`)
                    .expect("Content-Type", "application/json")
                    .expect(200)
                    .end((err, res) => {
                        let obj = res.body;
                        if (err) {
                            return reject({ error: err.toString(), status: res.status, body: obj });
                        }
                        should.equal(obj.totalItems, 2);
                        should.equal(obj.totalNamespaces, 2);
                        resolve();
                    });
            } catch (err) {
                reject(err);
            }
        }));
        after('Stop node server', () => stop());

    });

    describe('Verify database persistence', function() {
        let client, stop;

        before('Start node server', async () => {
            ({ client, stop } = await bilrost.start());
        });

        it('List persisted asset', function (done) {
            client
                .get(`/contentbrowser/workspaces/${workspace.get_encoded_file_uri()}/assets/`)
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
