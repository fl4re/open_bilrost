/**
* Copyright (C) 2015-2018 Starbreeze AB All Rights Reserved.
*/

'use strict';

const should = require('should');
const fs = require('fs-extra');
const path = require('path');
const crypto = require('crypto');

const amazon_client = require('../../../../lib/amazon-client');
const amazon_s3 = require('../../../../lib/amazon-s3');

const Repo_manager = require('../../../../assetmanager/repo_manager');
const workspace_utilities = require('../../../../assetmanager/workspace_utilities')(p => path.join('.bilrost',  p ? p : '/'));
const start_rest3d_client = require('../../../util/local_rest3d_client.js');

const key_file_to_download = 'c0535e4be2b79ffd93291305436bf889314e4a3faec05ecffcbb7df31ad9e51a';

const test_path = path.join(process.cwd(), 'tmp', 's3-repo-manager');
fs.mkdirpSync(test_path);

const KB = 1024;
const generate_string = charCode => {
    const size = 1 * KB;
    const get_random_string = () => String.fromCharCode(parseInt(Math.random() * 255, 10));
    let content = new Array(size - 3).join(get_random_string());
    content += get_random_string();
    content += get_random_string();
    content += get_random_string();
    return content;
};

const sha256 = content => crypto.createHash('sha256').update(content).digest('hex');

const cache = {
    get_path: key => path.resolve(test_path, 'Cache', key ? key : ''),
    write: () => Promise.resolve(),
    read: () => Promise.resolve(),
    exist: () => Promise.reject()
};

describe('S3 repo manager', function () {
    let rest3d_client, amazon, context;
    before('Init rest3d', function (done) {
        this.timeout(20000);
        start_rest3d_client()
            .then(client => {
                client.set_session_id("1234");
                const amz_client = amazon_client(client);
                amazon = amazon_s3(amz_client, cache);
                rest3d_client = client;
                context = {
                    rest3d_client: client,
                    amazon_client: amz_client,
                    cache: cache
                };
                done();
            });
    });
    it('Pull files', done => {
        const p = path.join(test_path, '1');
        const get_resource_hash = () => Promise.resolve(key_file_to_download);
        const repo_manager = Repo_manager.create({
            host_vcs: 's3',
            cwd: test_path,
            context: context,
            identity: {
                get_resource_hash
            },
            utilities: workspace_utilities
        });
        repo_manager.pull_file("1")
            .then(() => {
                const content = fs.readFileSync(p);
                should.equal(content, 'Hello world!');
                done();
            })
            .catch(done);
    });
    it('Dont pull files', done => {
        const mock_rest3d_client = {
            get: () => Promise.reject()
        };
        let this_context = {
            rest3d_client: mock_rest3d_client,
            amazon_client: amazon_client(mock_rest3d_client),
            cache: cache
        };
        const get_resource_hash = () => Promise.resolve("");
        const repo_manager = Repo_manager.create({
            host_vcs: 's3',
            cwd: test_path,
            context: this_context,
            identity: {
                get_resource_hash
            },
            utilities: workspace_utilities
        });
        repo_manager.pull_file("/resources/1")
            .then(done)
            .catch(() => {
                done();
            });
    });
    it('Push files', function (done) {
        this.timeout(20000);
        const added_resource_content = generate_string(0);
        const added_key = sha256(added_resource_content);
        const added_resource_path = path.join(test_path, 'added');
        const added_resource_ref = '/resources/added';
        fs.writeFileSync(added_resource_path, added_resource_content);
        const modified_resource_content = generate_string(1);
        const modified_key = sha256(modified_resource_content);
        const modified_resource_path = path.join(test_path, 'modified');
        const modified_resource_ref = '/resources/modified';
        fs.writeFileSync(modified_resource_path, modified_resource_content);
        const get_resource_hash = ref => {
            switch (ref) {
                case added_resource_ref:
                    return Promise.resolve(added_key);
                case modified_resource_ref:
                    return Promise.resolve(modified_key);
            }
        };
        const repo_manager = Repo_manager.create({
            host_vcs: 's3',
            cwd: test_path,
            context: context,
            identity: {
                get_resource_hash
            },
            utilities: workspace_utilities
        });
        repo_manager.push_files(['added'], ['modified'], ['removed'])
            .then(() => Promise.all([
                amazon.exists(added_key),
                amazon.exists(modified_key)
            ]))
            .then(() => done())
            .catch(done);
    });
    it('Dont push files', done => {
        const mock_rest3d_client = {
            put: () => Promise.reject()
        };
        let this_context = {
            rest3d_client: mock_rest3d_client,
            amazon_client: amazon_client(mock_rest3d_client),
            cache: cache
        };
        const get_resource_hash = () => Promise.resolve("");
        const repo_manager = Repo_manager.create({
            host_vcs: 's3',
            cwd: test_path,
            context: this_context,
            identity: {
                get_resource_hash
            },
            utilities: workspace_utilities
        });
        repo_manager.push_files(["/resources/1", "/resources/2", "/resources/3"], [], [])
            .then(done)
            .catch(() => {
                done();
            });
    });
    it('get current status', done => {
        const mock_rest3d_client = {};
        const get_resource_hash = () => Promise.resolve("");

        const modified_path = 'm';
        const modified_ref = '/resources/m';
        const deleted_path = 'd';
        const deleted_ref = '/resources/d';
        const unchanged_ref = '/resources/a';
        const new_path = 'n';
        const new_ref = '/resources/n';

        const this_context = {
            rest3d_client: mock_rest3d_client,
            amazon_client: amazon_client(mock_rest3d_client),
            cache: cache
        };
        const subscription_manager = {
            get_subscription_objects: () => [
                {
                    list_dependencies: () => [modified_ref]
                },
                {
                    list_dependencies: () => [unchanged_ref]
                },
                {
                    list_dependencies: () => [deleted_ref]
                },
                {
                    list_dependencies: () => [new_ref]
                }
            ]
        };
        const identity = {
            compare: ref => {
                switch (ref) {
                    case unchanged_ref:
                        return true;
                    case modified_ref:
                        return false;
                    case new_ref:
                        throw { code: 1 };
                    case deleted_ref:
                        throw { code: 2 };
                }
            },
            get_resource_hash
        };
        const repo_manager = Repo_manager.create({
            host_vcs: 's3',
            cwd: test_path,
            context: this_context,
            subscription_manager: subscription_manager,
            identity,
            utilities: workspace_utilities
        });
        repo_manager.get_status()
            .then(statuses => {
                should.deepEqual(statuses, [
                    {
                        status: 'MODIFIED',
                        ref: modified_ref,
                        path: modified_path
                    },
                    {
                        status: 'DELETED',
                        ref: deleted_ref,
                        path: deleted_path
                    },
                    {
                        status: 'NEW',
                        ref: new_ref,
                        path: new_path
                    }
                ]);
                done();
            })
            .catch(done);
    });

});
