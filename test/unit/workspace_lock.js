/**
* Copyright (C) 2015-2018 Starbreeze AB All Rights Reserved.
*/

'use strict';

const fixture = require('../util/fixture')('unit_workspace');
const eloise = require('../util/workspace')('eloise', fixture);
const workspace = require('../../assetmanager/workspace')({
    amazon_client: {},
    cache: {}
});

describe('Workspace locks', function() {

    before("create fixtures", async function() {
        this.timeout(4000);
        await eloise.create('good_repo');
        await eloise.create_workspace_resource();
        await eloise.create_project_resource();
    });

    it("Lock workspace when committing", function(done) {
        workspace.find_by_file_uri(eloise.get_file_uri())
            .then(workspace => {
                workspace.commit_and_push('foo');
                workspace.commit_and_push('foo');
            })
            .catch(err => {
                if (err.message === "workspace is locked") {
                    done();
                } else {
                    done(err);
                }
            });
    });

    it("Lock workspace when subscribing", function(done) {
        workspace.find_by_file_uri(eloise.get_file_uri())
            .then(workspace => {
                workspace.add_subscription('foo', 'bar');
                workspace.add_subscription('foo', 'bar');
            })
            .catch(err => {
                if (err.message === "workspace is locked") {
                    done();
                } else {
                    done(err);
                }
            });
    });

});
