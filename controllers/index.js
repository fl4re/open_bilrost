module.exports = (server, context) => {
    require('./asset')(server, context);
    require('./resource')(server, context);
    require('./branch')(server, context);
    require('./commit')(server, context);
    require('./stage')(server, context);
    require('./status')(server, context);
    require('./subscription')(server, context);
    require('./workspace')(server, context);
    require('./project')(server, context);
    require('./favorite')(server, context);
    require('./config')(server, context.config);
    require('./authentication')(server, context.bilrost_client);
};
