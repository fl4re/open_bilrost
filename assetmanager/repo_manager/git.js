/**
* Copyright (C) 2015-2018 Starbreeze AB All Rights Reserved.
*/

'use strict';

/*process.on('unhandledRejection', (err, p) => {
    console.log(err);
    console.log(p);
});*/

const URL = require('url-parse');
const Path = require('path').posix;
const fs = require('fs-extra');

const status_config = require('./../status.config.json');
const Repo_manager = require('./common');
const promisify = require('../../util/promisify');
const errors = require('../../lib/errors')("Repo manager");

const max_buffer = 1024 * 1024 * 50; //50MB in case of operations that involves many files

const is_win = /^win/.test(process.platform);

const format_file_path = path => '"' + path + '"';

const format_branch_status = status => {
    if (status === "local out of date") {
        return status_config.sync.OUT_OF_DATE;
    } else if (status === "up to date") {
        return status_config.sync.UP_TO_DATE;
    } else {
        throw errors.INTERNALERROR('Unknown branch status: ' + status);
    }
};

const organize_paths_per_groups = (paths, max_characters) => {
    let counter = 0;
    return paths.reduce((groups, path) => {
        counter = counter + path.length;
        if (counter <= max_characters) {
            groups[groups.length - 1] = groups[groups.length - 1] + " " + format_file_path(path);
        } else {
            groups.push(format_file_path(path));
            counter = path.length;
        }
        return groups;
    }, [""]);
};

class Repo_manager_git extends Repo_manager {
    constructor (input) {
        super(input);
        this.type = 'git';
        this.validate_vcs_pattern = 'true';
        this.repo_folder = ".git";
        this.current_branch_name = "git rev-parse --abbrev-ref HEAD";
        this.pull_command = branch => `git pull origin ${branch}`;
        this.new_branch_command = name => "git checkout -q -b " + name;
        this.change_branch_command = name => "git checkout -q " + name;
        this.delete_branch_command = name => "git branch -D " + name;
        this.branches_command = "git remote show origin";
        this.fetch_all_command = "git fetch --all";
        this.local_branch_name_command = "git branch";
        this.checkout_command = (host_url, branch) => "git clone -c core.longpaths=true -b " + branch + " " + host_url + " .";
        this.commit_info_command = "git log -n 1";
        this.scrap_commit_info_regexp = /commit ([0-9a-zA-Z]{1,})/;
        this.diff_command = "git diff";
        this.status_command = "git status --short";
        this.list_untracked_files_regex = /\?\? (.*)/g;
        this.file_status_regex = /([MADRCU?! ])([MDAU?! ]) (.*)/g;
        this.commit_file_status_command = (old_commit_id, new_commit_id) => "git diff "+old_commit_id+" "+new_commit_id+" --name-status";
        this.diff_local_command = "git diff --name-status";
        this.validate_vcs_command = 'git rev-parse --is-inside-work-tree';
        this.stage_files_command = (operation, files_paths) => "git " + operation + " " + files_paths;
        this.commit_files_command = message => "git commit -m \"" + message + "\"";
        this.push_files_command = branch => "git push origin " + branch;
        this.commit_log_command = (file_path, limit, start_at_commit_id = 'HEAD') => `git log -p --name-status --max-count ${limit ? limit : 10} ${start_at_commit_id} -- ${file_path}`;
        this.read_command = (branch, path) => "git show " + branch + ":" + path;
        this.config_command = key => "git config --get bilrost." + key;
        this.remote_url_command = () => "git remote get-url origin";
        this.commit_section_regex = /(?=commit [a-zA-Z0-9]{40})/g;
        this.commit_id_regex = /commit ([a-zA-Z0-9]{40})/;
        this.commit_author_regex = /Author: (.*)/;
        this.commit_date_regex = /Date: (.*)/;
        this.commit_message_regex = / {4}(.*)/;
        this.commit_statuses_regex = /(A|C|D|M|R|T|U|X|B)(\*?) {7}(.*)/g;
        this.status_regex = /( |A|C|D|M|R|U|\??)(A|C|D|M|R|U|\?)[\s]+([\S].*)/;
        this.remote_branch_name_regex = /^ {4}([^\s]*).*$/;
        this.local_branch_name_regex = /^ {4}([^\s]*).*\((.*)\)$/;
        this.branch_name_regex = /..(.*)/g;
    }

    get_commit_id () {
        return new Promise(resolve => {
            this.exec(this.commit_info_command, { cwd: this.cwd }, (error, stdout, stderr) => {
                if (error||stderr) {
                    throw {error: errors.INTERNALERROR(error||stderr)};
                }
                let commit_id = stdout.match(this.scrap_commit_info_regexp)[1];
                resolve(commit_id);
            });
        });
    }

    validate_vcs () {
        return promisify(fs.access)(Path.join(this.cwd, this.repo_folder), fs.F_OK)
            .then(() => new Promise (resolve => {
                this.exec(this.validate_vcs_command, { cwd: this.cwd }, (error, stdout, stderr) => {
                    if (error||stderr) {
                        throw ({ error: errors.INTERNALERROR(error||stderr) });
                    } else if (stdout.includes(this.validate_vcs_pattern)) {
                        resolve();
                    } else {
                        throw ({ error: errors.INTERNALERROR(error||stderr) });
                    }
                });
            }))
            .catch(err => {
                throw {error: errors.INTERNALERROR(err)};
            });
    }

    parse_commit_status (status_letter) {
        switch (status_letter) {
        case 'A':
        case 'C':
            return status_config.sync.NEW;
        case 'X':
            return status_config.sync.NEW;
        case 'R':
            return status_config.sync.RENAMED;
        case 'M':
        case 'T':
            return status_config.sync.MODIFIED;
        case 'D':
            return status_config.sync.DELETED;
        case 'U':
        case 'B':
            return status_config.sync.CONFLICTED;
        default:
            throw errors.INTERNALERROR(status_letter+" first status upper case letter isn't defined!");
        }
    }

    parse_status (X, Y) {
        switch (Y) {
        case '?':
            return status_config.sync.NEW;
        case 'A':
        case 'C':
            return status_config.sync.NEW;
        case 'M':
            return status_config.sync.MODIFIED;
        case 'D':
            return status_config.sync.DELETED;
        case 'R':
            return status_config.sync.RENAMED;
        case 'U':
            return status_config.sync.CONFLICTED;
        default:
            throw errors.INTERNALERROR(Y +" second status upper case letter isn't defined!");
        }
    }

    clone_workspace (url, branch) {
        if (this.credentials && this.credentials.username && this.credentials.password) {
            const project_url = new URL(url);
            project_url.username = this.credentials.username;
            project_url.password = this.credentials.password;
            url = project_url.toString();
        }
        return promisify(this.exec)(this.checkout_command(url, branch), { cwd: this.cwd, maxBuffer: max_buffer });
    }

    pull_file () {
        return Promise.resolve();
    }

    _stage_file (operation, file_paths) {
        if (file_paths.length) {
            // limit to 260 characters for win and 4096 for unix https://github.com/msysgit/git/pull/110
            const groups = organize_paths_per_groups(file_paths, is_win ? 260 : 4096);
            return groups.reduce((sequence, group) => sequence.then(() => promisify(this.exec)(this.stage_files_command(operation, group), { cwd: this.cwd, maxBuffer: max_buffer })), Promise.resolve());
        } else {
            return Promise.resolve([]);
        }
    }

    add_files (file_paths) {
        return this._stage_file('add', file_paths);
    }

    remove_files (file_paths) {
        return this._stage_file('rm', file_paths);
    }

    push_files (mod_paths, add_paths, del_paths, message, branch) {
        return this.add_files(mod_paths.concat(add_paths))
            .then(() => this.remove_files(del_paths))
            .then(() => promisify(this.exec)(this.commit_files_command(message), { cwd: this.cwd, maxBuffer: max_buffer }))
            .then(() => promisify(this.exec)(this.push_files_command(branch), { cwd: this.cwd, maxBuffer: max_buffer }))
            .then(() => this.get_commit_id());
    }

    get_commit_log (file_path, start_at_revision, limit) {
        file_path = file_path || '';
        if (file_path && file_path[0] === '/') {
            file_path = file_path.slice(1);
        }
        return new Promise((resolve, reject) => {
            this.exec(this.commit_log_command(file_path, limit, start_at_revision), { cwd: this.cwd, maxBuffer: max_buffer }, (error, stdout, stderr) => {
                if (error || stderr) {
                    reject(errors.INTERNALERROR(error || stderr));
                } else {

                    const commit_sections = stdout.split(this.commit_section_regex);
                    const commit_list = commit_sections.map(section => {
                        const info = {
                            id: this.commit_id_regex.exec(section)[1],
                            author: this.commit_author_regex.exec(section)[1],
                            created_at: this.commit_date_regex.exec(section)[1],
                            message: this.commit_message_regex.exec(section)[1],
                            changed_paths: []
                        };
                        let result;
                        while ((result = this.commit_statuses_regex.exec(section))) {
                            info.changed_paths.push({
                                status: this.parse_commit_status(result[1]),
                                all_in_one: result[2],
                                path: result[3]
                            });
                        }
                        return info;
                    });
                    resolve(commit_list);
                }
            });
        });
    }

    get_status () {
        return this.exec_by_line(this.status_command, this.cwd, line => {
            if (line) {
                let match = line.match(this.status_regex);
                if (match) {
                    return {
                        status: this.parse_status(match[1], match[2]),
                        path: match[3],
                        ref: this.utilities.relative_path_to_ref(match[3])
                    };
                }
            }
        });
    }

    read (ref, options) {
        const revision = options.rev;
        const path = this.utilities.ref_to_relative_path(ref);
        return promisify(this.exec)(this.read_command(revision, path), { cwd: this.cwd, maxBuffer: max_buffer })
            .then(JSON.parse);
    }

    get_current_branch () {
        return new Promise((resolve, reject) => {
            this.exec(this.current_branch_name, { cwd: this.cwd, maxBuffer: max_buffer }, (error, stdout, stderr) => {
                if (error || stderr) {
                    reject(errors.INTERNALERROR(error || stderr));
                } else {
                    resolve(stdout.trim());
                }
            });
        });
    }

    get_branch_list () {
        let is_remote_branches_section = false;
        let is_local_branches_section = false;
        return this.exec_by_line(this.branches_command, this.cwd, line => {
            const remote_branches_match = line.match(this.remote_branch_name_regex);
            const local_branches_match = line.match(this.local_branch_name_regex);
            if (is_remote_branches_section) {
                if (remote_branches_match) {
                    return {
                        type: 'remote',
                        name: remote_branches_match[1]
                    };
                }
            }
            if (is_local_branches_section) {
                if (local_branches_match) {
                    return {
                        type: 'local',
                        name: local_branches_match[1],
                        status: format_branch_status(local_branches_match[2])
                    };
                }
            }
            if (!remote_branches_match) {
                is_remote_branches_section = line === "  Remote branch:" || line === "  Remote branches:";
            }
            if (!local_branches_match) {
                is_local_branches_section = line === "  Local ref configured for 'git push':" || line === "  Local refs configured for 'git push':";
            }
        })
            .then(list => list.reduce((def, branch) => {
                if (branch && branch.type === 'remote') {
                    def.remotes.push({
                        name: branch.name
                    });
                } else if (branch && branch.type === 'local') {
                    def.locals.push({
                        name: branch.name,
                        status: branch.status
                    });
                }
                return def;
            }, {
                locals: [],
                remotes: []
            }))
            .then(branches => new Promise((resolve, reject) => {
                this.exec(this.local_branch_name_command, { cwd: this.cwd, maxBuffer: max_buffer }, (error, stdout, stderr) => {
                    if (error || stderr) {
                        reject(errors.INTERNALERROR(error || stderr));
                    } else {
                        let match;
                        const is_already_listed = branch_name => branches.locals.find(local_branch => branch_name === local_branch.name);
                        while ((match = this.branch_name_regex.exec(stdout)) !== null) {
                            if (match.index === this.branch_name_regex.lastIndex) {
                                this.branch_name_regex.lastIndex++;
                            }
                            const local_branch_name = match[1];
                            const is_already_listed_flag = is_already_listed(local_branch_name);
                            if (local_branch_name && !is_already_listed_flag) {
                                branches.locals.push({
                                    name: local_branch_name,
                                    status: status_config.sync.NEW
                                });
                            }
                        }
                        resolve(branches);
                    }
                });
            }));
    }

    _fetch_all () {
        return new Promise((resolve, reject) => {
            this.exec(this.fetch_all_command, { cwd: this.cwd, maxBuffer: max_buffer }, (error, stdout, stderr) => {
                if (error || stderr) {
                    reject(errors.INTERNALERROR(error || stderr));
                } else {
                    resolve();
                }
            });
        });
    }

    _pull (branch) {
        return new Promise((resolve, reject) => {
            this.exec(this.pull_command(branch), { cwd: this.cwd, maxBuffer: max_buffer }, (error, stdout, stderr) => {
                const is_error_output = stderr && !stdout.includes('Already up');
                if (error || is_error_output) {
                    reject(errors.INTERNALERROR(error || stderr));
                } else {
                    resolve();
                }
            });
        });
    }

    create_branch (branch_name) {
        return this._fetch_all()
            .then(() => new Promise((resolve, reject) => {
                this.exec(this.new_branch_command(branch_name), { cwd: this.cwd, maxBuffer: max_buffer }, (error, stdout, stderr) => {
                    if (error || stderr) {
                        reject(errors.INTERNALERROR(error || stderr));
                    } else {
                        resolve();
                    }
                });
            }));

    }

    change_branch (branch_name) {
        const change = () => new Promise((resolve, reject) => {
            this.exec(this.change_branch_command(branch_name), { cwd: this.cwd, maxBuffer: max_buffer }, (error, stdout, stderr) => {
                if (error || stderr) {
                    reject(errors.INTERNALERROR(error || stderr));
                } else {
                    resolve();
                }
            });
        });
        return this._fetch_all()
            .then(change, err => {
                // eslint-disable-next-line no-console
                console.warn(err);
                return change();
            })
            .then(() => this._pull(branch_name));
    }

    delete_branch (branch_name) {
        return new Promise((resolve, reject) => {
            this.exec(this.delete_branch_command(branch_name), { cwd: this.cwd, maxBuffer: max_buffer }, (error, stdout, stderr) => {
                if (error || stderr) {
                    reject(errors.INTERNALERROR(error || stderr));
                } else {
                    resolve();
                }
            });
        });
    }

    get_config (key) {
        return this.exec_by_line(this.config_command(key), this.cwd, line => line)
            .then(lines => lines[0], () => "");
    }

    get_project_id () {
        return new Promise((resolve, reject) => {
            this.exec(this.remote_url_command(), { cwd: this.cwd, maxBuffer: max_buffer }, (error, stdout, stderr) => {
                if (error || stderr) {
                    reject(errors.INTERNALERROR(error || stderr));
                } else {
                    const project_url = new URL(stdout.trim());
                    // Returns all url if ssh
                    const path_name = project_url.pathname;
                    // ssh url starts always with 'git@github.com:'
                    let project_id = path_name.split('git@github.com:').join('');
                    // remove trailing .git (common in ssh/https)
                    project_id = project_id.split('.git').join('');
                    // remove leading '/' if present
                    if (project_id[0] === '/') {
                        project_id = project_id.substring(1);
                    }
                    // return {organization}/{project}
                    resolve(project_id);
                }
            });
        });
    }

}

module.exports = Repo_manager_git;
