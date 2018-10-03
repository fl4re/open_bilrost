/**
* Copyright (C) 2015-2018 Starbreeze AB All Rights Reserved.
*/

'use strict';

const Handler = require('./lib/handler');

const workspace_factory = require('./assetmanager/workspace_factory');
const _repo_manager = require('./assetmanager/repo_manager');
const utilities = require('./assetmanager/utilities');
const _workspace_metadata_presenter = require('./assetmanager/workspace_presenter').Workspace_metadata_presenter;

const workspaces_regexp = /^\/assetmanager\/workspaces\/([^/]*)$/;
const workspace_reset_regexp = /^\/assetmanager\/workspaces\/([^/]*)\/reset$/;
const favorites_regexp = /^\/assetmanager\/workspaces\/([^/]*)\/favorites$/;
const assets_regexp = /^\/assetmanager\/workspaces\/([^/]*)(\/assets\/.*)/;
const assets_rename_regexp = /^\/assetmanager\/workspaces\/([^/]*)\/rename(\/assets\/.*)/;

const status_regexp = /^\/assetmanager\/workspaces\/([^/]*)\/status$/;
const statuses_regexp = /^\/assetmanager\/workspaces\/([^/]*)\/statuses$/;
const ref_status_regexp = /^\/assetmanager\/workspaces\/([^/]*)\/status(\/(?:assets|resources)\/.*)/;

const create_branch_regexp = /^\/assetmanager\/workspaces\/([^/]*)\/branch\/(.*)$/;
const delete_branch_regexp = /^\/assetmanager\/workspaces\/([^/]*)\/branch\/(.*)$/;
const change_branch_regexp = /^\/assetmanager\/workspaces\/([^/]*)\/branch\/(.*)\/change$/;

const stage_regexp = /^\/assetmanager\/workspaces\/([^/]*)\/stage$/;
const ref_stage_regexp = /^\/assetmanager\/workspaces\/([^/]*)\/stage(\/(?:assets|resources)\/.*)/;

const commits_regexp = /^\/assetmanager\/workspaces\/([^/]*)\/commits$/;
const ref_commits_regexp = /^\/assetmanager\/workspaces\/([^/]*)\/commits(\/(?:assets|resources)\/.*)?$/;

const subscriptions_regexp = /^\/assetmanager\/workspaces\/([^/]*)\/subscriptions$/;
const id_subscriptions_regexp = /^\/assetmanager\/workspaces\/([^/]*)\/subscriptions\/([^/]*)/;

const errors = require('./lib/errors')('asset manager');

const sanitize = function(query_argument) {
    if (query_argument === undefined) {
        query_argument = '';
    }
    return decodeURIComponent(query_argument);
};

module.exports = function(server, context) {
    const favorite = context.favorite;
    const _project = require('./assetmanager/project_manager')(context);
    const _workspace = require('./assetmanager/workspace')(context);

    server.get('/assetmanager', function(req, res, next) {
        new Handler(req, res, next)
            .sendJSON({
                name: 'Asset manager',
                version: '0.1.0',
                url: '/assetmanager',
                workspaces_url: '/assetmanager/workspaces/'
            }, 200);
    });

    server.put(assets_regexp, function(req, res, next) {
        const handler = new Handler(req, res, next);
        const workspace_identifier = sanitize(req.params[0]);
        const asset_ref = sanitize(req.params[1]);
        const modified = sanitize(req.headers['last-modified']);
        const is_body_a_json_to_parse = typeof req.body === 'string' || req.body instanceof Buffer;
        let asset_representation;
        try {
            asset_representation = is_body_a_json_to_parse ? JSON.parse(req.body) : req.body;
        } catch (err) {
            return handler.handleError(errors.CORRUPT(err));
        }
        let workspace;
        _workspace.find(workspace_identifier)
            .then(ws => {
                workspace = ws;
                return workspace.check_overall_validation();
            })
            .then(() => workspace.asset.create(asset_ref, asset_representation))
            .then(asset => handler.sendJSON(asset, 201))
            .catch(error => {
                if (error && error.statusCode === 403) {
                    workspace.asset.replace(asset_ref, asset_representation, modified)
                        .then(asset => handler.sendJSON(asset, 200))
                        .catch(error => handler.handleError(error));
                } else {
                    handler.handleError(error);
                }
            });
    });

    server.post(assets_rename_regexp, function(req, res, next) {
        const handler = new Handler(req, res, next);
        const workspace_identifier = sanitize(req.params[0]);
        const asset_ref = sanitize(req.params[1]);
        const modified = sanitize(req.headers['last-modified']);
        var new_asset_ref;
        try {
            new_asset_ref = JSON.parse(req.body).new;
        } catch (err) {
            return handler.handleError(errors.CORRUPT(err));
        }
        let workspace;
        _workspace.find(workspace_identifier)
            .then(ws => {
                workspace = ws;
                return workspace.check_overall_validation();
            })
            .then(() => workspace.asset.rename(asset_ref, new_asset_ref, modified))
            .then(asset => handler.sendJSON(asset, 200))
            .catch(error => handler.handleError(error));
    });

    server.del(assets_regexp, function(req, res, next) {
        const handler = new Handler(req, res, next);
        const workspace_identifier = sanitize(req.params[0]);
        const asset_ref = sanitize(req.params[1]);
        let workspace;
        _workspace.find(workspace_identifier)
            .then(ws => {
                workspace = ws;
                return workspace.check_overall_validation();
            })
            .then(() => workspace.asset.delete(asset_ref))
            .then(() => handler.sendJSON('Ok', 204))
            .catch(error => handler.handleError(error));
    });

    server.post('/assetmanager/workspaces', function(req, res, next) {
        const handler = new Handler(req, res, next);
        const workspace_file_uri = req.body.file_uri;
        const name = req.body.name;
        const description = req.body.description;
        const organization = req.body.organization;
        const project_name = req.body.project_name;
        const branch = req.body.branch;
        _workspace.find_by_file_uri(workspace_file_uri)
            .then(() => handler.handleError(errors.ALREADYEXIST(workspace_file_uri)))
            .catch(workspace => {
                if (workspace.error && workspace.error.statusCode === 404) {
                    const project_id = `${organization}/${project_name}`;
                    _project.get(project_id)
                        .then(project => workspace_factory.create_and_populate_workspace(project, branch, context.protocol, workspace_file_uri, name, description, context.credentials))
                        .then(workspace => {
                            favorite.add({ name: workspace.name, file_uri: workspace.file_uri })
                                .then(() => _workspace.find_by_file_uri(workspace_file_uri))
                                .then(workspace => workspace.check_overall_validation()
                                    .then(() => handler.sendJSON(_workspace_metadata_presenter.present(workspace), 200, 'workspace')))
                                .catch(output => {

                                    favorite
                                        .remove(workspace.guid)
                                        .then(() => workspace_factory.delete_workspace(workspace_file_uri))
                                        .then(() => handler.handleError(output.error ? output.error : errors.INTERNALERROR(output)));
                                });
                        })
                        .catch(error => {
                            handler.handleError(error);
                        });
                } else {
                    handler.handleError(errors.INTERNALERROR(workspace));
                }
            });
    });

    server.post('/assetmanager/workspaces/populate', function(req, res, next) {
        const handler = new Handler(req, res, next);
        const workspace_file_uri = req.body.file_uri;
        const name = req.body.name;
        const description = req.body.description;
        _workspace.find_by_file_uri(workspace_file_uri)
            .then(() => handler.handleError(errors.ALREADYEXIST(workspace_file_uri)))
            .catch(workspace => {
                const is_not_valid = workspace.error && workspace.error.statusCode === 500 && workspace.error.message && workspace.error.message.includes('Status manager') && workspace.error.message.includes('schema');
                const is_project_not_found = workspace.error && workspace.error.statusCode === 500 && workspace.error.message && workspace.error.message.includes('Project factory') && workspace.error.message.includes('ENOENT');
                if (is_project_not_found || is_not_valid) {
                    const repo_manager = _repo_manager.create({
                        host_vcs: 'git',
                        cwd: utilities.convert_file_uri_to_path(workspace_file_uri),
                        credentials: context.credentials
                    });

                    repo_manager.get_project_id()
                        .then(_project.get)
                        .then(project => repo_manager.get_current_branch()
                            .then(branch => workspace_factory.populate_workspace(project, branch, workspace_file_uri, name, description)))
                        .then(workspace => {
                            favorite.add({ name: workspace.name, file_uri: workspace.file_uri })
                                .then(() => _workspace.find_by_file_uri(workspace_file_uri))
                                .then(workspace => workspace.check_overall_validation()
                                    .then(() => handler.sendJSON(_workspace_metadata_presenter.present(workspace), 200, 'workspace')))
                                .catch(output => {
                                    favorite
                                        .remove(workspace.guid)
                                        .then(() => handler.handleError(output.error ? output.error : errors.INTERNALERROR(output)));
                                });
                        })
                        .catch(error => {
                            handler.handleError(error);
                        });
                } else {
                    handler.handleError(errors.INTERNALERROR(workspace));
                }
            });
    });

    server.post('/assetmanager/workspaces/favorites', function(req, res, next) {
        const handler = new Handler(req, res, next);
        const workspace_file_uri = req.body.file_uri;
        _workspace.find_by_file_uri(workspace_file_uri)
            .then(workspace => workspace.check_overall_validation()
                .then(() => favorite.add({ name: workspace.get_name(), file_uri: workspace.get_file_uri()}))
                .then(() => handler.sendJSON(_workspace_metadata_presenter.present(workspace), 200, 'workspace')))
            .catch(workspace => {
                handler.handleError(workspace);
            });
    });

    server.post('/assetmanager/workspaces/favorites/reset', function(req, res, next) {
        const handler = new Handler(req, res, next);
        favorite.flush()
            .then(() => handler.sendJSON('Ok', 200))
            .catch(handler.handleError);
    });

    server.post(workspace_reset_regexp, function(req, res, next) {
        const workspace_identifier = decodeURIComponent(req.params[0]);
        const handler = new Handler(req, res, next);
        _workspace.find(workspace_identifier)
            .then(workspace => workspace.reset())
            .then(() => handler.sendJSON('Ok', 200))
            .catch(workspace => handler.handleError(workspace.error || workspace));
    });

    server.del(favorites_regexp, function(req, res, next) {
        const workspace_identifier = decodeURIComponent(req.params[0]);
        const handler = new Handler(req, res, next);
        _workspace.find(workspace_identifier)
            .then(workspace => favorite.remove(workspace.get_name()).then(() => workspace.database.close()), () => favorite.remove(req.params[0]))
            .then(() => handler.sendJSON('Ok', 200))
            .catch(workspace => handler.handleError(workspace.error || workspace));
    });

    server.del(workspaces_regexp, function(req, res, next) {
        const workspace_identifier = decodeURIComponent(req.params[0]);
        const handler = new Handler(req, res, next);
        let workspace;
        _workspace.find(workspace_identifier)
            .then(ws => {
                workspace = ws;
                return workspace.database.close();
            })
            .then(() => workspace_factory
                .delete_workspace(workspace.get_file_uri())
                .then(() => favorite.remove(workspace.get_name()))
            )
            .then(() => {
                workspace.remove_database_semaphore();
                handler.sendJSON('Ok', 200);
            })
            .catch(output => handler.handleError(output.error));
    });

    server.put('/assetmanager/workspaces/', function(req, res, next) {
        res.status(501);
        res.end();
        next();
    });

    server.patch(workspaces_regexp, function(req, res, next) {
        res.status(501);
        res.end();
        next();
    });

    server.put(workspaces_regexp, function(req, res, next) {
        res.status(501);
        res.end();
        next();
    });

    // VCS

    // /assetmanager/workspaces/

    server.get(status_regexp, function(req, res, next) {
        const workspace_identifier = sanitize(req.params[0]);
        const handler = new Handler(req, res, next);

        _workspace.find(workspace_identifier)
            .then(workspace => workspace.check_overall_validation()
                .then(() => workspace.get_status())
            )
            .then(full_status => handler.sendJSON(full_status, 200))
            .catch(full_status => handler.handleError(full_status));
    });

    server.get(statuses_regexp, function(req, res, next) {
        const workspace_identifier = sanitize(req.params[0]);
        const handler = new Handler(req, res, next);

        _workspace.find(workspace_identifier)
            .then(workspace => workspace.update_and_retrieve_status())
            .then(statuses => handler.sendJSON(statuses, 200))
            .catch(statuses => handler.handleError(statuses));
    });

    server.get(ref_status_regexp, function(req, res, next) {
        const workspace_identifier = sanitize(req.params[0]);
        const ref = decodeURIComponent(req.params[1]);
        const handler = new Handler(req, res, next);

        _workspace.find(workspace_identifier)
            .then(workspace => workspace.get_ref_status(ref))
            .then(ref_status => handler.sendJSON(ref_status, 200))
            .catch(ref_status => handler.handleError(ref_status));
    });

    server.get(subscriptions_regexp, function(req, res, next) {
        const workspace_identifier = decodeURIComponent(req.params[0]);

        const handler = new Handler(req, res, next);

        _workspace.find(workspace_identifier)
            .then(workspace => workspace.get_subscriptions())
            .then(subscriptions => handler.sendJSON({subscriptions: subscriptions}, 200))
            .catch(err => handler.handleError(err));
    });

    server.post(subscriptions_regexp, function(req, res, next) {
        const workspace_identifier = decodeURIComponent(req.params[0]);
        const req_type = req.body.type;
        const req_descriptor = req.body.descriptor;

        const handler = new Handler(req, res, next);
        _workspace.find(workspace_identifier)
            .then(workspace => workspace.add_subscription(req_type, req_descriptor))
            .then(subscription => handler.sendJSON(subscription, 200))
            .catch(err => handler.handleError(err));
    });

    server.del(id_subscriptions_regexp, function(req, res, next) {
        const workspace_identifier = decodeURIComponent(req.params[0]);
        let subscription_identifier = decodeURIComponent(req.params[1]);

        const handler = new Handler(req, res, next);

        _workspace.find(workspace_identifier)
            .then(workspace => workspace.remove_subscription(subscription_identifier))
            .then(() => handler.sendJSON('Ok', 200))
            .catch(err => handler.handleError(err));
    });

    server.get(stage_regexp, function(req, res, next) {
        const workspace_identifier = decodeURIComponent(req.params[0]);

        const handler = new Handler(req, res, next);

        _workspace.find(workspace_identifier)
            .then(workspace => workspace.get_stage())
            .then(stage => handler.sendJSON({items: stage}, 200))
            .catch(err => handler.handleError(err));
    });

    server.post(ref_stage_regexp, function(req, res, next) {
        const workspace_identifier = decodeURIComponent(req.params[0]);
        const asset_ref = decodeURIComponent(req.params[1]);

        const handler = new Handler(req, res, next);

        _workspace.find(workspace_identifier)
            .then(workspace => workspace.add_asset_to_stage(asset_ref))
            .then(() => handler.sendJSON('Ok', 200))
            .catch(err => handler.handleError(err));
    });

    server.del(ref_stage_regexp, function(req, res, next) {
        const workspace_identifier = decodeURIComponent(req.params[0]);
        const asset_ref = decodeURIComponent(req.params[1]);

        const handler = new Handler(req, res, next);

        _workspace.find(workspace_identifier)
            .then(workspace => workspace.remove_asset_from_stage(asset_ref))
            .then(() => handler.sendJSON('Ok', 200))
            .catch(err => handler.handleError(err));
    });

    server.get(ref_commits_regexp, function(req, res, next) {
        const workspace_identifier = decodeURIComponent(req.params[0]);
        const ref = req.params[1] ? decodeURIComponent(req.params[1]) : undefined;
        const maxResults = req.query.maxResults ? parseInt(req.query.maxResults, 10) : 10;
        const start_at_revision = req.query.start_at_revision;

        const handler = new Handler(req, res, next);

        _workspace.find(workspace_identifier)
            .then(workspace => ref ? workspace.get_commit_log(ref, start_at_revision, maxResults) : workspace.get_commit_logs(start_at_revision, maxResults))
            .then(commit_log => handler.sendJSON({
                nextLink: '/assetmanager/workspaces/' + workspace_identifier + '/commits/' + (ref ? ref : '') + '?maxResults=' + maxResults + (commit_log.length > 0 ? ('&start_at_revision=' + commit_log[commit_log.length-1].id) : ''),
                items: commit_log
            }, 200))
            .catch(err => handler.handleError(err));
    });

    server.post(commits_regexp, function(req, res, next) {
        const workspace_identifier = decodeURIComponent(req.params[0]);
        const message = req.body.message;

        const handler = new Handler(req, res, next);

        _workspace.find(workspace_identifier)
            .then(workspace => workspace.commit_files(message))
            .then(commit_id => handler.sendJSON(commit_id, 200))
            .catch(err => handler.handleError(err));
    });

    server.post(change_branch_regexp, (req, res, next) => {
        const handler = new Handler(req, res, next);
        const workspace_identifier = decodeURIComponent(req.params[0]);
        const branch_name = decodeURIComponent(req.params[1]);
        _workspace.find(workspace_identifier)
            .then(workspace => workspace.branch.change(branch_name))
            .then(() => handler.sendJSON('Ok', 200))
            .catch(workspace => handler.handleError(workspace.error));
    });

    server.put(create_branch_regexp, (req, res, next) => {
        const handler = new Handler(req, res, next);
        const workspace_identifier = decodeURIComponent(req.params[0]);
        const branch_name = decodeURIComponent(req.params[1]);
        _workspace.find(workspace_identifier)
            .then(workspace => workspace.branch.create(branch_name))
            .then(() => handler.sendJSON('created', 201))
            .catch(workspace => handler.handleError(workspace.error));
    });

    server.del(delete_branch_regexp, (req, res, next) => {
        const handler = new Handler(req, res, next);
        const workspace_identifier = decodeURIComponent(req.params[0]);
        const branch_name = decodeURIComponent(req.params[1]);
        _workspace.find(workspace_identifier)
            .then(workspace => workspace.branch.del(branch_name))
            .then(() => handler.sendJSON('removed', 200))
            .catch(workspace => handler.handleError(workspace.error));
    });
};
