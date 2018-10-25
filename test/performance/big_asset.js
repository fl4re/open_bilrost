/**
* Copyright (C) 2015-2018 Starbreeze AB All Rights Reserved.
*/

'use strict';

const should = require('should');
const path = require('path');
const crypto = require('crypto');
const fs = require('fs-extra');
const promisify = require('../../util/promisify');
const v8 = require('v8');

const fixture = require('../util/fixture')('performance_big_asset');
const workspace = require('../util/workspace')('eloise', fixture);

const bilrost = require('../util/server')(fixture);

const MB = 1024 * 1024;
let random_names = [];

const generate_random_path = () => {
    const random_name = crypto.randomBytes(5).toString('hex');
    random_names.push(random_name);
    return path.join(workspace.get_path(), random_name);
};

let client;

describe('Run Asset related functional tests for the API', function () {

    before("Starting a Content Browser server", async () => {
        client = await bilrost.start();
    });

    before("Creating fixtures", async function() {
        this.timeout(4000);
        await workspace.create('good_repo');
        workspace.create_workspace_resource();
        workspace.create_project_resource();
    });

    after("Removing fixtures", async function() {
        this.timeout(300000); // = 6 * default = 6 * 2000 = 12000
        await workspace.remove();
    });

    before("Create 10^5 dependencies", function() {
        this.timeout(300000); // = 10 * default = 10 * 2000 = 20000
        return Promise.all(Array.from(new Array(20000)).map(() => promisify(fs.outputFile)(generate_random_path(), "0")));
    });

    describe('Create big assets', function() {

        it('Create an asset', function(done){
            this.timeout(300000); // = 5 * default = 5 * 2000 = 10000

            const asset = {
                main: "/resources/test/a/test_005",
                comment: "This a test asset",
                tags: ["hello", "test"],
                dependencies: random_names.map(random_name => `/resources/${random_name}`).sort(),
                semantics: []
            };

            const asset_ref = '/assets/levels/test_002.level';

            const heap_size = v8.getHeapStatistics().total_heap_size;

            client
                .put(`/assetmanager/workspaces/${workspace.get_encoded_file_uri()}${asset_ref}`)
                .send(asset)
                .set("Content-Type", "application/json")
                .set("Accept", 'application/json')
                .expect(201)
                .end((err, res) => {
                    if (err) {
                        return done({ error: err.toString(), status: res.status, body: res.body });
                    }
                    let obj = res.body;
                    should.equal(obj.ref, asset_ref);
                    let output = workspace.read_asset(asset_ref);
                    should.equal(output.meta.ref, asset_ref);
                    delete output.meta;
                    should.deepEqual(output, asset);
                    (heap_size/v8.getHeapStatistics().total_heap_size).should.be.below(1*MB);
                    done();
                });
        });

    });

});
