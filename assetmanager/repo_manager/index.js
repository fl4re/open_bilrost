/**
* Copyright (C) 2015-2018 Starbreeze AB All Rights Reserved.
*/

'use strict';

const errors = require('../../lib/errors')("Repo manager");
const Repo_manager_git = require('./git');
const repo_manager_s3 = require('./s3');

module.exports = {
    create: input => {
        input.exec = input.exec || require('child_process').exec;
        input.exec_by_line = input.exec_by_line || require('../../util/exec_by_line');
        switch (input.host_vcs) {
        case "git":
            return new Repo_manager_git(input);
        case "s3":
            return repo_manager_s3(input);
        default:
            throw {error: errors.INTERNALERROR("Workspace vcs host is unknown")};
        }
    }
};