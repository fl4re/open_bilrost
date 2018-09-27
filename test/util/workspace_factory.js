/**
* Copyright (C) 2015-2018 Starbreeze AB All Rights Reserved.
*/

'use strict';

const should = require('should');
const path = require('path');
const fs = require('fs-extra');

const workspace_factory = require('../../assetmanager/workspace_factory');
const ssh_url = "git@github.com:fl4re/open_bilrost_test_project.git";
const branch = "good_repo";
const fixtures_path = path.join(process.cwd().replace(/\\/g,'/'), 'tmp', 'fixtures', 'workspace_factory');

const project = {
    ssh_url
};

describe('Workspace factory model functional checks', () => {

    it('Create and populate a workspace', function(done) {
        this.timeout(this.timeout * 3);
        workspace_factory.create_and_populate_workspace(project, branch, 'ssh', fixtures_path, "test", "hello world")
            .then(() => {
                fs.readJson(path.join(fixtures_path, '/.bilrost/workspace'), (err, work) => {
                    should.not.exist(err);
                    should.equal(work.name, "test");
                    fs.readJson(path.join(fixtures_path, '/.bilrost/project'), (err, proj) => {
                        should.not.exist(err);
                        should.equal(proj.ssh_url, ssh_url);
                        done();
                    });
                });
            }).catch(done);
    });

    it('Create and populate a workspace with https and credentials', function(done) {
        this.timeout(this.timeout * 3);
        const credentials = {
            username: 'foo',
            password: 'bar'
        };
        workspace_factory.create_and_populate_workspace(project, branch, 'https', fixtures_path, "test", "hello world", credentials)
            .catch(() => {
                done();
            });
    });

    it('Dont try to create and populate the same workspace', function(done) {
        this.timeout(this.timeout * 3);
        workspace_factory.create_and_populate_workspace(project, branch, 'https', fixtures_path, "test", "hello world")
            .then(() => {
                done("Shouldn't be populated");
            })
            .catch(err => {
                should.exist(err.statusCode, 403);
                done();
            });
    });

    it('Save', function(done) {
        this.timeout(this.timeout * 3);
        const uri = 'file://' + (/^win/.test(process.platform) ? '/' : '') + fixtures_path;
        const worskpace = {
            hello: 'world',
            file_uri: uri.replace(/\\/g, '/')
        };
        workspace_factory.save(fixtures_path, worskpace)
            .then(() => {
                fs.readJson(path.join(fixtures_path, '/.bilrost/workspace'), (err, file) => {
                    should.not.exist(err);
                    should.deepEqual(file, worskpace);
                    done();
                });
            })
            .catch(done);
    });

    it('Delete a workspace', function(done) {
        this.timeout(this.timeout * 3);
        workspace_factory.delete_workspace(fixtures_path)
            .then(() => {
                fs.exists(fixtures_path, exists => {
                    should.equal(exists, false);
                    done();
                });
            })
            .catch(done);
    });

});
