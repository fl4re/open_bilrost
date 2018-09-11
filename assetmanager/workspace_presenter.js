/**
* Copyright (C) 2015-2018 Starbreeze AB All Rights Reserved.
*/

"use strict";

module.exports = {
    Workspace_metadata_presenter: {
        present: ({ properties }) => {
            return {
                name: properties.name,
                guid: properties.guid,
                description: properties.description,
                type: properties.type
            };
        }
    },
    Workspace_presenter: {
        present: ({ properties, project }) => {
            return {
                project: {
                    full_name: project.get_full_name(),
                    host: project.get_host_vcs()
                },
                guid: properties.guid,
                name: properties.name,
                description: properties.description,
                version: properties.version,
                pushed_at: properties.pushed_at,
                created_at: properties.created_at,
                updated_at: properties.updated_at,
                type: properties.type,
                file_uri: properties.file_uri,
                subscriptions: properties.subscriptions,
                stage: properties.stage,
                statuses: properties.statuses,
                tags: properties.tags
            };
        }
    },
};
