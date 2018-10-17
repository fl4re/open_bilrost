/**
* Copyright (C) 2015-2018 Starbreeze AB All Rights Reserved.
*/

'use strict';

const Handler = require('../lib/handler');

const workspace_factory = require('../assetmanager/workspace_factory');
const _repo_manager = require('../assetmanager/repo_manager');
const utilities = require('../assetmanager/utilities');
const _workspace_metadata_presenter = require('../assetmanager/workspace_presenter').Workspace_metadata_presenter;

const workspaces_regexp = /^\/assetmanager\/workspaces\/([^/]*)$/;
const workspace_reset_regexp = /^\/assetmanager\/workspaces\/([^/]*)\/reset$/;
const favorites_regexp = /^\/assetmanager\/workspaces\/([^/]*)\/favorites$/;

const errors = require('../lib/errors')('asset manager');

module.exports = function(server, context) {
    const favorite = context.favorite;
    const _project = require('../assetmanager/project_manager')(context);
    const _workspace = require('../assetmanager/workspace')(context);

    server.post('/assetmanager/workspaces', function(req, res, next) {
        const handler = new Handler(req, res, next);
        const workspace_file_uri = req.body.file_uri;
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
                        .then(project => workspace_factory.create_and_populate_workspace(project, branch, context.protocol, workspace_file_uri, description, context.credentials))
                        .then(() => {
                            return _workspace.find_by_file_uri(workspace_file_uri)
                                .then(workspace => workspace.check_overall_validation()
                                    .then(() => handler.sendJSON(_workspace_metadata_presenter.present(workspace), 200, 'workspace')))
                                .catch(output => {
                                    return workspace_factory.delete_workspace(workspace_file_uri)
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
                            .then(branch => workspace_factory.populate_workspace(project, branch, workspace_file_uri, description)))
                        .then(() => {
                            return _workspace.find_by_file_uri(workspace_file_uri)
                                .then(workspace => workspace.check_overall_validation()
                                    .then(() => handler.sendJSON(_workspace_metadata_presenter.present(workspace), 200, 'workspace')))
                                .catch(output => {
                                    handler.handleError(output.error ? output.error : errors.INTERNALERROR(output));
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
};
