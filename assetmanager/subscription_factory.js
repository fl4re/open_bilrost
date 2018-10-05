/**
* Copyright (C) 2015-2018 Starbreeze AB All Rights Reserved.
*/

'use strict';

const Subscription = require('./subscription');

const _error_outputs = require('../lib/errors')("Subscription manager");

let Subscription_factory = {
    generate_guid: () => {
        return require('crypto').randomBytes(20).toString('hex');
    },

    create: (workspace, id, type, descriptor) => {
        if (type === Subscription.ASSET) {
            return new Subscription.Asset_subscription(workspace, id, descriptor);
        } else if(type === Subscription.NAMESPACE) {
            return new Subscription.Namespace_subscription(workspace, id, descriptor);
        } else if(type === Subscription.SEARCH) {
            return new Subscription.Search_subscription(workspace, id, descriptor);
        } else {
            throw _error_outputs.INTERNALERROR("Subscription type not recognized.");
        }
    },
};

module.exports = Subscription_factory;
