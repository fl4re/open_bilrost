/**
* Copyright (C) 2015-2018 Starbreeze AB All Rights Reserved.
*/

'use strict';

const should = require('should');
const path = require('path');
const crypto = require('crypto');
const fs = require('fs-extra');
const promisify = require('../../../../util/promisify');
const v8 = require('v8');

const Test_util = require('../../../util/test_util');
const bilrost = require('../../../util/bilrost');

const MB = 1024 * 1024;
let random_names = [];

const generate_random_path = () => {
    const random_name = crypto.randomBytes(5).toString('hex');
    random_names.push(random_name);
    return path.join(test_util.get_eloise_path(), random_name);
};

let client, test_util;

describe('Run Asset related functional tests for the API', function () {

    before("Starting a Content Browser server", async () => {
        client = await bilrost.start();
        test_util = new Test_util("big_asset", "good_repo", client);
    });

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

    after("Removing fixtures", function(done) {
        this.timeout(300000); // = 6 * default = 6 * 2000 = 12000
        test_util.remove_fixtures(done);
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
                .put(path.join('/assetmanager/workspaces/', test_util.get_workspace_name(), asset_ref))
                .send(asset)
                .set("Content-Type", "application/vnd.bilrost.level+json")
                .set("Accept", 'application/json')
                .expect(201)
                .end((err, res) => {
                    if (err) {
                        return done({ error: err.toString(), status: res.status, body: res.body });
                    }
                    let obj = res.body;
                    should.equal(obj.ref, asset_ref);
                    let output = test_util.read_asset_file(asset_ref);
                    should.equal(output.meta.ref, asset_ref);
                    delete output.meta;
                    should.deepEqual(output, asset);
                    (heap_size/v8.getHeapStatistics().total_heap_size).should.be.below(1*MB);
                    done();
                });
        });

    });

});
