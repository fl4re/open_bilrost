/**
* Copyright (C) 2015-2018 Starbreeze AB All Rights Reserved.
*/

'use strict';

module.exports = project => ({
    full_name: project.full_name,
    host_vcs: project.description.host_vcs,
    comment: project.description.comment
});
