/**
* Copyright (C) 2015-2018 Starbreeze AB All Rights Reserved.
*/

"use strict";

module.exports = {
    Subscription_metadata_presenter: {
        present: (subscription, workspace) => {
            return {
                id: subscription.id,
                url: '/assetmanager/workspaces/' + workspace.guid + '/subscriptions/' + subscription.id,
                type: subscription.type,
                descriptor: subscription.descriptor,
            };
        }
    },
    Subscription_presenter: {
        present: subscription => {
            return {
                id: subscription.id,
                type: subscription.type,
                descriptor: subscription.descriptor,
            };
        }
    },
};