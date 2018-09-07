/**
* Copyright (C) 2015-2018 Starbreeze AB All Rights Reserved.
*/

"use strict";

module.exports = {
    Workspace_metadata_presenter: {
        present: workspace => {
            return {
                name: workspace.properties.name,
                guid: workspace.properties.guid,
                description: workspace.properties.description,
                type: workspace.properties.type
            };
        }
    },
    Workspace_presenter: {
        present: workspace => {
            return {
                project: {
                    full_name: workspace.project.get_full_name(),
                    host: workspace.project.get_host_vcs()
                },
                guid: workspace.properties.guid,
                name: workspace.properties.name,
                description: workspace.properties.description,
                version: workspace.properties.version,
                pushed_at: workspace.properties.pushed_at,
                created_at: workspace.properties.created_at,
                updated_at: workspace.properties.updated_at,
                type: workspace.properties.type,
                file_uri: workspace.properties.file_uri,
                subscriptions: workspace.properties.subscriptions,
                stage: workspace.properties.stage,
                status: workspace.properties.status,
                tags: workspace.properties.tags
            };
        }
    },
};
