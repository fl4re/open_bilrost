const util = require('util');

module.exports = (description = "", guid = util.generate_guid(), subscriptions = [], stage = [], status = []) => ({
    description,
    guid,
    subscriptions,
    stage,
    status
});
