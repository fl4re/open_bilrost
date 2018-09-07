/**
* Copyright (C) 2015-2018 Starbreeze AB All Rights Reserved.
*/

'use strict';

// Print stack trace for debugging
global.debug = true;

const fs = require('fs-extra');
const should = require('should');

const path = require('path').posix;
const restify = require('restify');
const bunyan = require('bunyan');
const exec = require('child_process').exec;
const supertest = require('supertest');
const favorite = require('../../assetmanager/favorite')();
const port_factory = require('./port_factory');
const promisify = require('../../util/promisify');
const amazon_client = require('../../lib/amazon-client');
const cache = require('../../lib/cache');
const utilities = require('../../assetmanager/workspace_utilities');

const fixtures_path = path.join(__dirname.replace(/\\/g, '/'), '../fixtures');

class Test_util {

    constructor (schema, branch) {
        if (!schema) {throw new Error('Test_util must be create with schema');}
        if (!branch) {throw new Error('Test_util must be create with branch');}

        this.externals = [];

        this.branch = branch;

        this.asset_manager = require('../../assetmanager');
        this.content_browser = require('../../contentbrowser');

        this.fixtures = path.join(process.cwd().replace(/\\/g,'/'), 'tmp', 'fixtures', schema);
        this.cache = path.join(this.fixtures, 'Cache');
        this.get_internal_file_path = p => path.join('.bilrost', p ? p : '/');
        this.utilities = utilities(this.get_internal_file_path);

        fs.mkdirpSync(this.get_fixtures());

        this.git_ssh_url = 'git@github.com:fl4re/open_bilrost_test_project.git';
        this.eloise = {
            guid: 'e39d0f72c81c445ba801dsssssss45219sddsdss',
            name: 'test-workspace',
            description: 'This is your first workspace cloned from DLC_1 branch !',
            version: '2.0.0',
            pushed_at: '2011-01-26T19:01:12Z',
            created_at: '2011-01-26T19:01:12Z',
            updated_at: '2011-01-26T19:14:43Z',
            type: 'application/vnd.bilrost.workspace+json',
            file_uri: this.get_eloise_file_uri(),
            tags: ['Hello', 'World'],
            subscriptions: [],
            stage: [],
            status: [],
            project: {
                full_name: 'fl4re/open_bilrost_test_project',
                host: 's3'
            }
        };

        this.project1_file = {
            name: 'open_bilrost_test_project',
            organization: 'fl4re',
            version: '2.0.0',
            full_name: 'fl4re/open_bilrost_test_project',
            url: 'https://api.github.com/repos/fl4re/open_bilrost_test_project',
            tags: [
                'Hello',
                'World'
            ],
            description: {
                'host_vcs': 's3',
            },
            ssh_url: 'git@github.com:fl4re/open_bilrost_test_project.git',
            https_url: 'https://github.com/fl4re/open_bilrost_test_project.git',
            pushed_at: '2016-06-28T16:19:51Z',
            created_at: '2016-06-27T18:31:40Z',
            updated_at: '2016-11-17T20:15:11Z',
            type: 'application/vnd.bilrost.project+json',
            properties: {
                'ignore': [
                    '.bilrost/workspace',
                    '.bilrost/search_index_keystore'
                ]
            }
        };

        this.alice = {
            guid: 'e39d0f79c81c445ba801dsssssssssssssddsdss',
            name: 'alice',
            description: 'This is your first workspace cloned from DLC_1 branch !',
            version: '2.0.0',
            pushed_at: '2011-01-26T19:01:12Z',
            created_at: '2011-01-26T19:01:12Z',
            updated_at: '2011-01-26T19:14:43Z',
            type: 'application/vnd.bilrost.workspace+json',
            file_uri: this.get_alice_file_uri(),
            tags: ['Hello', 'World'],
            subscriptions: [],
            stage: [],
            status: [],
            project: {
                full_name: 'fl4re/open_bilrost_test_project',
                host: 's3'
            }
        };

        this.bob = {
            guid: 'e39d0f72c81c445ba8014f3999f576c7sdadswgg',
            name: 'second-workspace',
            description: 'This is your first workspace cloned from DLC_2 branch !',
            version: '2.0.0',
            pushed_at: '2011-01-26T19:06:43Z',
            created_at: '2011-01-26T19:01:12Z',
            updated_at: '2011-01-26T19:14:43Z',
            type: 'application/vnd.bilrost.workspace+json',
            file_uri: this.get_bob_file_uri(),
            tags: ['Hello', 'World'],
            subscriptions: [],
            stage: [],
            status: [],
            project: {
                full_name: 'fl4re/open_bilrost_test_project',
                host: 's3'
            }
        };

        this.philippe = JSON.parse(JSON.stringify(this.get_bob_workspace()));
        this.philippe.pushed_at = 'should_not_be_validate_date';
        this.philippe.guid = 'e39d0f72czzz445ba8014f3999f576c7sdadswgg';
        this.philippe.name = 'feat/philippe';

        this.example_project = {
            id: 62078801,
            name: 'open_bilrost_test_project',
            full_name: 'fl4re/open_bilrost_test_project',
            owner:
            {
                id: 9989934,
                login: 'fl4re',
                type: 'Organization',
                site_admin: false
            },
            private: true,
            description:
            {
                type: 'application/vnd.bilrost.project+json',
                tags: ['Hello', 'World'],
                comment: 'this is my first repo!',
                host_vcs: 's3',
                settings: {}
            },
            created_at: '2016-06-27T18:31:40Z',
            updated_at: '2016-11-17T20:15:11Z',
            pushed_at: '2016-06-28T16:19:51Z',
            size: 0,
            url: 'https://api.github.com/repos/fl4re/open_bilrost_test_project',
            ssh_url: 'git@github.com:fl4re/open_bilrost_test_project.git',
            https_url: 'https://github.com/fl4re/open_bilrost_test_project.git',
            permissions: { pull: true, push: true, admin: true },
            branches_url: '/contentbrowser/projects/fl4re/open_bilrost_test_project/',
            resources_url: '/contentbrowser/projects/fl4re/open_bilrost_test_project/resources/',
            assets_url: '/contentbrowser/projects/fl4re/open_bilrost_test_project/assets/'
        };

        this.test_level = {
            'meta':{
                'ref': '/assets/levels/test_001.level',
                'created': '2016-03-16T14:41:10.384Z',
                'modified': '2016-03-18T10:54:05.870Z',
                version:'1.1.0',
                'author': ''
            },
            'comment': '',
            tags: [],
            'main': '/resources/test/test_001',
            'dependencies': [
                '/resources/mall/mall_demo'
            ],
            'semantics': []
        };

    }

    start_server (done, parameters) {

        if (!parameters) {
            parameters = {};
        }

        this.port = port_factory();

        let logger = bunyan.createLogger({
            name: 'controller_test',
            stream: process.stdout,
            level: 'info'
        });

        this.server = restify.createServer({
            log: logger
        });

        let server = this.server;

        server.use(restify.queryParser());
        server.use(restify.bodyParser());
        this.client = supertest(server);

        var promises = [];

        promises.push(new Promise(resolve => {
            server.listen(this.port, () => {
                resolve();
            });
        }));

        Promise.all(promises)
            .then(() => {
                const context = {
                    bilrost_client: parameters.bilrost_client,
                    amazon_client: amazon_client(parameters.bilrost_client),
                    cache: cache(this.get_cache()),
                    protocol: parameters.protocol
                };
                this.content_browser(server, context);
                this.asset_manager(server, context);
            })
            .then(done)
            .catch(done);
    }

    svn_checkout (url) {
        return new Promise((resolve, reject) => {
            exec('svn checkout ' + url, {cwd: this.get_fixtures()}, (error, stdout, stderr) => {
                const err = error || stderr;
                if (err) {
                    reject(err);
                } else {
                    resolve();
                }
            });
        });
    }

    local_checkout (dest) {
        const src = path.join(fixtures_path, this.branch);
        return fs.copy(src, dest);
    }

    git_checkout (url, branch_name) {
        return new Promise((resolve, reject) => {
            exec('git clone -b '+ branch_name + ' ' + url + ' .', {cwd: this.get_workspace_path()}, (error, stdout, stderr) => {
                const err = error;
                if (err) {
                    reject(err);
                } else {
                    resolve();
                }
            });
        });
    }

    create_eloise_fixtures () {
        return promisify(fs.remove)(this.get_fixtures())
            .then(() => fs.mkdirpSync(this.get_workspace_path()))
            .then(() => this.git_checkout(this.git_ssh_url, this.branch))
            .then(() => this.local_checkout(this.get_workspace_path()));
    }

    create_eloise_workspace_project_file () {
        return this.write_eloise_resource_file('.bilrost/project', this.project1_file);
    }

    copy_eloise_to_alice_bob_and_philippe () {
        fs.copySync(this.get_eloise_path(), this.get_alice_path());
        this.create_workspace_properties_file(this.get_alice_path(), this.get_alice_workspace());

        fs.copySync(this.get_eloise_path(), this.get_bob_path());
        this.create_workspace_properties_file(this.get_bob_path(), this.get_bob_workspace());

        fs.copySync(this.get_eloise_path(), this.get_philippe_path());
        this.create_workspace_properties_file(this.get_philippe_path(), this.get_philippe_workspace());
    }

    add_eloise_to_favorite () {
        return new Promise((resolve, reject) => {
            if (this.client) {
                this.client
                    .post('/assetmanager/workspaces/favorites')
                    .send({file_uri: this.get_eloise_file_uri()})
                    .set('Content-Type', 'application/json')
                    .set('Accept', 'application/json')
                    .expect(200)
                    .end((err, res) => {
                        if (err) {
                            reject({ error: err.toString(), status: res.status, body: res.body });
                        }
                        this.get_favorite().search(this.get_eloise_file_uri()).should.be.an.instanceOf(Object);
                        resolve();
                    });
            } else {
                resolve();
            }
        });
    }

    create_workspace_properties_file (workspace_path, content) {
        fs.outputJsonSync(path.join(workspace_path,'/.bilrost/workspace'), content);
    }

    create_eloise_workspace_properties_file () {
        this.create_workspace_properties_file(this.get_eloise_path(), this.eloise);
    }

    create_workspace3 () {
        const workspace3_path = path.join(this.get_fixtures(), 'example3');
        const example3_file_uri = this.path_to_file_uri(workspace3_path);

        var example3_workspace = JSON.parse(JSON.stringify(this.get_bob_workspace()));
        example3_workspace.guid = 'e39d0f72czzz445ba8014f3999f576c7sdadswgg';
        example3_workspace.name = 'feat/example3_workspace';

        fs.copySync(this.get_eloise_path(), workspace3_path);
        this.create_workspace_properties_file(workspace3_path, example3_workspace);

        this.get_example3_file_uri = () => example3_file_uri;
        this.get_example3_path = () => workspace3_path;
        this.get_example3_workspace = () => example3_workspace;

    }

    remove_fixtures (done) {
        this.client
            .delete('/assetmanager/workspaces/'+this.get_workspace_guid()+'/favorites')
            .set('accept', 'application/json')
            .end((err, res) => {
                should.not.exist(err);
                res.statusCode.should.equal(200);
                this.get_favorite().search(this.get_eloise_file_uri()).should.equal(false);
                done();
            });
    }

    is_win () {
        return /^win/.test(process.platform);
    }

    get_favorite () {
        return {
            search : (identifier) => {
                let favorite_list = favorite.list();
                for(let i=0; i<favorite_list.length;i++){
                    let workspace = favorite_list[i];
                    for(let z=0, keys=Object.keys(workspace); z<keys.length; z++){
                        if(workspace[keys[z]]===identifier){
                            return workspace;
                        }
                    }
                }
                return false;
            }
        };
    }

    get_eloise_identifiers () {
        return {
            file_uri: this.get_eloise_file_uri(),
            name: 'eloise',
            guid: this.eloise.guid
        };
    }

    get_eloise_path () {
        return this.get_workspace_path();
    }

    get_eloise_file_uri () {
        return this.path_to_file_uri(this.get_eloise_path());
    }

    get_alice_workspace () {
        return this.alice;
    }

    get_alice_path () {
        return path.join(this.get_fixtures(), 'alice');
    }

    get_alice_file_uri () {
        return this.path_to_file_uri(this.get_alice_path());
    }

    get_bob_workspace () {
        return this.bob;
    }

    get_bob_path () {
        return path.join(this.get_fixtures(), 'bob');
    }

    get_bob_file_uri () {
        return this.path_to_file_uri(this.get_bob_path());
    }

    get_philippe_workspace () {
        return this.philippe;
    }

    get_philippe_path() {
        return path.join(this.get_fixtures(), 'philippe');
    }

    get_philippe_file_uri () {
        return this.path_to_file_uri(this.get_philippe_path());
    }

    get_carol_path() {
        return path.join(this.get_fixtures(), 'new_workspace_v2');
    }

    get_ken_path() {
        return path.join(this.get_fixtures(), 'ken');
    }

    get_carol_file_uri () {
        return this.path_to_file_uri(this.get_carol_path());
    }

    ensure_carol_dir () {
        return promisify(fs.ensureDir)(this.get_carol_path());
    }

    get_ken_file_uri () {
        return this.path_to_file_uri(this.get_ken_path());
    }

    get_example_project () {
        return this.example_project;
    }

    get_s3_example_project () {
        return this.s3_example_project;
    }

    get_workspace_guid () {
        return this.eloise.guid;
    }

    get_fixtures () {
        return this.fixtures.replace(/\\/g,'/');
    }

    get_cache () {
        return this.cache.replace(/\\/g,'/');
    }

    get_workspace_path () {
        return path.join(this.get_fixtures(), this.branch);
    }

    get_test_level () {
        return this.test_level;
    }

    get_database () {
        const loki = require('../../assetmanager/databases/assets_collection');
        if (!this.database) {
            this.database = loki(this.get_workspace_guid());
        }
        return this.database;
    }

    read_asset_file (ref, callback) {
        const relative_path = this.utilities.format_namespaces('.bilrost' + ref);
        const asset_path = path.join(this.get_eloise_path(), relative_path);
        if (callback && (typeof callback === 'function')) {
            return fs.readJson(asset_path, callback);
        } else {
            return fs.readJsonSync(asset_path);
        }
    }

    write_asset_file (ref, content) {
        const relative_path = this.utilities.format_namespaces('.bilrost' + ref);
        const asset_path = path.join(this.get_eloise_path(), relative_path);
        return fs.outputJsonSync(asset_path, content);
    }

    remove_asset_file (ref) {
        const relative_path = this.utilities.format_namespaces('.bilrost' + ref);
        const asset_path = path.join(this.get_eloise_path(), relative_path);
        fs.removeSync(asset_path);
    }

    write_eloise_resource_file (ref, content) {
        const resource = path.join(this.get_eloise_path(), ref);
        return fs.outputJsonSync(resource, content);
    }

    remove_resource_file (_path) {
        const resource = path.join(this.get_eloise_path(), _path);
        return fs.removeSync(resource);
    }

    does_workspace_exist (fixture_name) {
        try {
            fs.accessSync(path.join(this.get_fixtures(), fixture_name));
            fs.accessSync(path.join(this.get_fixtures(), fixture_name, '.bilrost'));
            return true;
        } catch (err) {
            return false;
        }
    }

    does_workspace_internals_valid (fixture_name) {
        try {
            fs.accessSync(path.join(this.get_fixtures(), fixture_name, '.bilrost', 'workspace'));
            fs.accessSync(path.join(this.get_fixtures(), fixture_name, '.bilrost', 'project'));
            return true;
        } catch (err) {
            return false;
        }
    }

    path_to_file_uri(path) {
        return 'file://' + (this.is_win()?'/':'') + path;
    }

    file_uri_to_path(file_uri) {
        if (this.is_win()) {
            return file_uri.split('file:///')[1];
        } else {
            return file_uri.split('file://')[1];
        }
    }

}

module.exports = Test_util;
