/**
* Copyright (C) 2015-2018 Starbreeze AB All Rights Reserved.
*/

'use strict';

const _url = require('url');

const Handler = require('../lib/handler');

const workspace_factory = require('../assetmanager/workspace_factory');
const _repo_manager = require('../assetmanager/repo_manager');
const utilities = require('../assetmanager/utilities');
const _workspace_metadata_presenter = require('../assetmanager/workspace_presenter').Workspace_metadata_presenter;
const Workspace_presenter = require("../assetmanager/workspace_presenter").Workspace_presenter;

const errors = require('../lib/errors')('asset manager');

// Utility for slicing a list of files
const slice = (files, start, number) => files.slice(start, start + number);

// Utility to create the next reference url for paging
const get_next_url = (url, next) => {
    let parsed_url = _url.parse(url, true);
    parsed_url.query.start = next;
    parsed_url.search = undefined;  // If search is set it prevails over the query, we must unset it
    return parsed_url.format();
};

module.exports = function(server, context) {
    const favorite = context.favorite;
    const _project = require('../assetmanager/project_manager')(context);
    const _workspace = require('../assetmanager/workspace')(context);

    server.get(/^\/contentbrowser\/workspaces(\/)?$/, async (req, res, next) => {
        const handler = new Handler(req, res, next);
        const options = {
            filterName: req.query.name,
            maxResults: parseInt(req.query.maxResults, 10) || 100,
            start: parseInt(req.query.start, 10) || 0
        };
        try {
            let workspaces = await _workspace.list(options);
            const length = workspaces.length;
            workspaces = slice(workspaces, options.start, options.maxResults);
            const output = {
                kind: 'workspace-list',
                items: workspaces.map(workspace => Workspace_presenter.present(workspace))
            };
            if (options.start + workspaces.length < length) {
                const indexOfMoreResults = options.start + options.maxResults;
                output.nextLink = get_next_url(req.url, indexOfMoreResults);
            }
            output.totalItems = length;
            handler.sendJSON(output, 200);
        } catch (err) {
            handler.handleError(err);
        }
    });
    server.get('/contentbrowser/workspaces/:identifier', async (req, res, next) => {
        const handler = new Handler(req, res, next);
        const workspace_identifier = req.params.identifier;
        if (!workspace_identifier) {
            return handler.handleError(new Error("Missing workspace id"));
        }

        try {
            const workspace = await _workspace.find(workspace_identifier);
            const output = {
                kind: 'workspace-list',
                items: [Workspace_presenter.present(workspace)]
            };
            output.totalItems = output.items.length;
            handler.sendJSON(output, 200);
        } catch (err) {
            handler.handleError(err);
        }
    });

    server.post('/assetmanager/workspaces', async (req, res, next) => {
        const handler = new Handler(req, res, next);
        const workspace_file_uri = req.body.file_uri;
        const description = req.body.description;
        const organization = req.body.organization;
        const project_name = req.body.project_name;
        const branch = req.body.branch;
        try {
            await _workspace.find_by_file_uri(workspace_file_uri);
            handler.handleError(errors.ALREADYEXIST(workspace_file_uri));
        } catch (workspace) {
            if (workspace.error && workspace.error.statusCode === 404) {
                const project_id = `${organization}/${project_name}`;
                try {
                    const project = await _project.get(project_id);
                    await workspace_factory.create_and_populate_workspace(project, branch, context.protocol, workspace_file_uri, description, context.credentials);
                    const workspace = await _workspace.find_by_file_uri(workspace_file_uri);
                    await workspace.check_overall_validation();
                    handler.sendJSON(_workspace_metadata_presenter.present(workspace), 200, 'workspace');
                } catch (output) {
                    try {
                        await workspace_factory.delete_workspace(workspace_file_uri);
                    } catch (ignored_deletion_error) { /* do nothing */ }
                    handler.handleError(output.error ? output.error : errors.INTERNALERROR(output));
                }
            } else {
                handler.handleError(errors.INTERNALERROR(workspace));
            }
        }
    });

    server.post('/assetmanager/workspaces/populate', async (req, res, next) => {
        const handler = new Handler(req, res, next);
        const workspace_file_uri = req.body.file_uri;
        const description = req.body.description;
        try {
            await _workspace.find_by_file_uri(workspace_file_uri);
            handler.handleError(errors.ALREADYEXIST(workspace_file_uri));
        } catch (workspace) {
            const is_not_valid = workspace.error && workspace.error.statusCode === 500 &&
                workspace.error.message && workspace.error.message.includes('Status manager') && workspace.error.message.includes('schema');
            const is_project_not_found = workspace.error && workspace.error.statusCode === 500 &&
                workspace.error.message && workspace.error.message.includes('Project factory') && workspace.error.message.includes('ENOENT');
            if (is_project_not_found || is_not_valid) {
                const repo_manager = _repo_manager.create({
                    host_vcs: 'git',
                    cwd: utilities.convert_file_uri_to_path(workspace_file_uri),
                    credentials: context.credentials
                });
                try {
                    const id = await repo_manager.get_project_id();
                    const project = await _project.get(id);
                    const branch = await repo_manager.get_current_branch();
                    await workspace_factory.populate_workspace(project, branch, workspace_file_uri, description);
                    const workspace = await _workspace.find_by_file_uri(workspace_file_uri);
                    await workspace.check_overall_validation();
                    handler.sendJSON(_workspace_metadata_presenter.present(workspace), 200, 'workspace');
                } catch (output) {
                    handler.handleError(output.error ? output.error : errors.INTERNALERROR(output));
                }
            } else {
                handler.handleError(errors.INTERNALERROR(workspace));
            }
        }
    });

    server.post('/assetmanager/workspaces/:identifier/reset', async (req, res, next) => {
        const handler = new Handler(req, res, next);
        const workspace_identifier = req.params.identifier;

        try {
            const workspace = await _workspace.find(workspace_identifier);
            await workspace.reset();
            handler.sendJSON('Ok', 200);
        } catch (workspace) {
            handler.handleError(workspace);
        }
    });

    server.del('/assetmanager/workspaces/:identifier', async (req, res, next) => {
        const handler = new Handler(req, res, next);
        const workspace_identifier = req.params.identifier;

        try {
            const workspace = await _workspace.find(workspace_identifier);
            await workspace.database.close();
            await workspace_factory.delete_workspace(workspace.get_file_uri());
            await favorite.remove(workspace.get_file_uri());
            workspace.remove_database_semaphore();
            handler.sendJSON('Ok', 200);
        } catch (output) {
            handler.handleError(output.error);
        }
    });
};
