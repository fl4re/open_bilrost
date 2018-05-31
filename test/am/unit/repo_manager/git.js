/**
* Copyright (C) 2015-2018 Starbreeze AB All Rights Reserved.
*/

'use strict';

const should = require('should');
const _path = require('path');

const Repo_manager = require('../../../../assetmanager/repo_manager');
const workspace_utilities = require('../../../../assetmanager/workspace_utilities');

describe('Github repo manager', function () {

    it('#current_status', done => {
        const exec_by_line = (a, b, callback) => Promise.resolve([
            callback(' M assetmanager/repo_manager/index.js'),
            callback('?? test/am/unit/git_repo_manager.js'),
            callback('??  test/am/unit/git_repo_manager.js'),
            callback('??  test/am/unit/git repo manager.js'),
            callback('??   test/am/unit/git repo manager.js')
        ]);
        const repo_manager = Repo_manager.create({
            host_vcs: 'git',
            cwd: process.cwd(),
            exec_by_line: exec_by_line,
            utilities: workspace_utilities(p => _path.join('.bilrost', p ? p : '/'))
        });
        repo_manager
            .get_status()
            .then(res => {
                should.deepEqual(res, [{
                    status: 'MODIFIED',
                    path: 'assetmanager/repo_manager/index.js',
                    ref: '/resources/assetmanager/repo_manager/index.js'
                },
                {
                    status: 'NEW',
                    path: 'test/am/unit/git_repo_manager.js',
                    ref: '/resources/test/am/unit/git_repo_manager.js'
                },
                {
                    status: 'NEW',
                    path: 'test/am/unit/git_repo_manager.js',
                    ref: '/resources/test/am/unit/git_repo_manager.js'
                },
                {
                    status: 'NEW',
                    path: 'test/am/unit/git repo manager.js',
                    ref: '/resources/test/am/unit/git repo manager.js'
                },
                {
                    status: 'NEW',
                    path: 'test/am/unit/git repo manager.js',
                    ref: '/resources/test/am/unit/git repo manager.js'
                }]);
                done();
            })
            .catch(done);
    });

    it('#branch_name', done => {
        const test_branch_name = 'feat/hello-world';
        const exec = (a, b, callback) => Promise.resolve([
            callback(undefined, test_branch_name)
        ]);
        const repo_manager = Repo_manager.create({
            host_vcs: 'git',
            cwd: process.cwd(),
            exec: exec,
            utilities: workspace_utilities(p => _path.join('.bilrost', p))
        });
        repo_manager
            .get_current_branch()
            .then(branch_name => {
                should.equal(branch_name, test_branch_name);
                done();
            })
            .catch(done);
    });

    it('#branch_names #1', done => {
        const exec_by_line = (a, b, callback) => Promise.resolve([
            callback('  Push  URL: https://github.com/Hello-world'),
            callback('  HEAD branch: master'),
            callback('  Remote branches:'),
            callback('    feat/dont_stage_twice               tracked'),
            callback('    feat/compare_identity               tracked'),
            callback("  Local refs configured for 'git push':"),
            callback('    feat/bilrost_cli_integration_test pushes to feat/bilrost_cli_integration_test (up to date)'),
            callback('    feat/test                         pushes to fest/test                         (local out of date)')
        ]);
        const exec = (a, b, callback) => {
            callback(undefined, '  feat/new', undefined);
        };
        const repo_manager = Repo_manager.create({
            host_vcs: 'git',
            cwd: process.cwd(),
            exec: exec,
            exec_by_line: exec_by_line,
            utilities: workspace_utilities(p => _path.join('.bilrost', p))
        });
        repo_manager
            .get_branch_list()
            .then(res => {
                should.deepEqual(res, {
                    locals: [
                        {
                            name: 'feat/bilrost_cli_integration_test',
                            status: 'UP_TO_DATE'
                        },
                        {
                            name: 'feat/test',
                            status: 'OUT_OF_DATE'
                        },
                        {
                            name: 'feat/new',
                            status: 'NEW'
                        }],
                    remotes: [
                        {
                            name: 'feat/dont_stage_twice'
                        },
                        {
                            name: 'feat/compare_identity'
                        }
                    ]
                });
                done();
            })
            .catch(done);
    });

    it('#branch_names #2', done => {
        const exec_by_line = (a, b, callback) => Promise.resolve([
            callback('  Push  URL: https://github.com/Hello-World'),
            callback('  HEAD branch: master'),
            callback('  Remote branches:'),
            callback("  Local refs configured for 'git push':"),
        ]);
        const exec = (a, b, callback) => {
            callback(undefined, '* feat/new\n  master', undefined);
        };
        const repo_manager = Repo_manager.create({
            host_vcs: 'git',
            cwd: process.cwd(),
            exec: exec,
            exec_by_line: exec_by_line,
            utilities: workspace_utilities(p => _path.join('.bilrost', p))
        });
        repo_manager
            .get_branch_list()
            .then(res => {
                should.deepEqual(res, {
                    locals: [
                        {
                            name: 'feat/new',
                            status: 'NEW'
                        },
                        {
                            name: 'master',
                            status: 'NEW'
                        }],
                    remotes: []
                });
                done();
            })
            .catch(done);
    });

    it('#branch_names #3', done => {
        const exec_by_line = (a, b, callback) => Promise.resolve([
            callback('  Push  URL: https://github.com/Hello-World'),
            callback('  HEAD branch: master'),
        ]);
        const exec = (a, b, callback) => {
            callback(undefined, '', undefined);
        };
        const repo_manager = Repo_manager.create({
            host_vcs: 'git',
            cwd: process.cwd(),
            exec: exec,
            exec_by_line: exec_by_line,
            utilities: workspace_utilities(p => _path.join('.bilrost', p))
        });
        repo_manager
            .get_branch_list()
            .then(res => {
                should.deepEqual(res, {
                    locals: [],
                    remotes: []
                });
                done();
            })
            .catch(done);
    });

    it('#create_branch', done => {
        const exec = (a, b, callback) => Promise.resolve([
            callback(undefined)
        ]);
        const repo_manager = Repo_manager.create({
            host_vcs: 'git',
            cwd: process.cwd(),
            exec: exec,
            utilities: workspace_utilities(p => _path.join('.bilrost', p))
        });
        repo_manager
            .create_branch('feat/hello-world')
            .then(() => {
                done();
            })
            .catch(done);
    });

    it('#delete_branch', done => {
        const exec = (a, b, callback) => Promise.resolve([
            callback(undefined)
        ]);
        const repo_manager = Repo_manager.create({
            host_vcs: 'git',
            cwd: process.cwd(),
            exec: exec,
            utilities: workspace_utilities(p => _path.join('.bilrost', p))
        });
        repo_manager
            .delete_branch('feat/hello-world')
            .then(() => {
                done();
            })
            .catch(done);
    });

    it('#change_branch', done => {
        const exec = (a, b, callback) => Promise.resolve([
            callback(undefined)
        ]);
        const repo_manager = Repo_manager.create({
            host_vcs: 'git',
            cwd: process.cwd(),
            exec: exec,
            utilities: workspace_utilities(p => _path.join('.bilrost', p))
        });
        repo_manager
            .delete_branch('master')
            .then(() => {
                done();
            })
            .catch(done);
    });

    it('#commit_log', done => {
        const log = "commit fdceb02ba46e5d96393edc29a7758906a89de24c                  \n" +
        "Author: Maxime Helen <dummy@email.com>               \n " +
        "Date:   Thu Jul 20 09:28:27 2017 -0700                           \n " +
        "                                                                 \n " +
        "    Add find method to asset object, and not only its creator    \n " +
        "                                                                 \n " +
        "M       assetmanager/commit_manager.js                           \n " +
        "                                                                 \n " +
        "commit ab72db7092ca19a364728d1839bb92deeba35788                  \n " +
        "Author: Maxime Helen <dummy@email.com>               \n " +
        "Date:   Thu Jul 20 01:14:52 2017 -0700                           \n " +
        "                                                                 \n " +
        "    Update repo manager with new git features                    \n " +
        "                                                                 \n " +
        "M       assetmanager/commit_manager.js                           \n " +
        "                                                                 \n " +
        "commit d4c0c52273af5e114a6da77b599153d209f3389b                  \n " +
        "Author: Maxime Helen <dummy@email.com>               \n " +
        "Date:   Thu Jul 20 09:42:48 2017 -0700                           \n " +
        "                                                                 \n " +
        "    Fix asset data structure                                     \n " +
        "                                                                 \n " +
        "M       assetmanager/commit_manager.js                           \n ";

        const exec = (a, b, callback) => {
            callback(null, log, '');
        };
        const repo_manager = Repo_manager.create({
            host_vcs: 'git',
            cwd: process.cwd(),
            exec: exec
        });
        repo_manager
            .get_commit_log()
            .then(res => {
                should.deepEqual(res[0], {
                    id: 'fdceb02ba46e5d96393edc29a7758906a89de24c',
                    author: 'Maxime Helen <dummy@email.com>               ',
                    created_at: '  Thu Jul 20 09:28:27 2017 -0700                           ',
                    message: '              ',
                    changed_paths:
                    [
                        {
                            status: 'MODIFIED',
                            all_in_one: '',
                            path: 'assetmanager/commit_manager.js                           '
                        }
                    ]
                });
                should.equal(res.length, 3);
                done();
            })
            .catch(done);
    });

    it('#project_id from ssh url https://github.com/Hello-World', done => {
        const log = '       git@github.com:fl4re/hello-world.git          ';

        const exec = (a, b, callback) => {
            callback(null, log, '');
        };
        const repo_manager = Repo_manager.create({
            host_vcs: 'git',
            cwd: process.cwd(),
            exec: exec
        });
        repo_manager
            .get_project_id()
            .then(project_id => {
                should.deepEqual(project_id, 'fl4re/hello-world');
                done();
            })
            .catch(done);
    });

    it('#project_id from https url', done => {
        const log = '       https://github.com/fl4re/Hello-World          ';

        const exec = (a, b, callback) => {
            callback(null, log, '');
        };
        const repo_manager = Repo_manager.create({
            host_vcs: 'git',
            cwd: process.cwd(),
            exec: exec
        });
        repo_manager
            .get_project_id()
            .then(project_id => {
                should.deepEqual(project_id, 'fl4re/Hello-World');
                done();
            })
            .catch(done);
    });

});
