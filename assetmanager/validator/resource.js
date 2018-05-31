/**
* Copyright (C) 2015-2018 Starbreeze AB All Rights Reserved.
*/

'use strict';

module.exports = (workspace_adapter, utilities) => {
    return {
        run_full_validation: ref => workspace_adapter.access(utilities.ref_to_relative_path(ref))
    };
};
