/**
* Copyright (C) 2015-2018 Starbreeze AB All Rights Reserved.
*/

"use strict";

module.exports = {
    Workspace_metadata_presenter: {
        present: ({ properties }) => ({
            description: properties.description,
        })
    },
    Workspace_presenter: {
        present: ({ properties, project, get_file_uri }) => ({
            project: {
                full_name: project.get_full_name(),
                host: project.get_host_vcs()
            },
            file_uri: get_file_uri(),
            description: properties.description,
            version: properties.version,
            pushed_at: properties.pushed_at,
            created_at: properties.created_at,
            updated_at: properties.updated_at,
            type: properties.type,
            subscriptions: properties.subscriptions,
            stage: properties.stage,
            statuses: properties.statuses,
            tags: properties.tags
        })
    }
};
