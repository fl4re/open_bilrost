/**
* Copyright (C) 2015-2018 Starbreeze AB All Rights Reserved.
*/

/* globals $: true */
/* globals location: true */

"use strict";

var hostname = location.host && location.href.indexOf('dev_index.html') === -1 ? location.host : "localhost:9224";

function req_promise(pathname, data) {
    return new Promise( function(resolve, reject){
        // eslint-disable-next-line no-console
        console.log('http://'+hostname+pathname);
        $.ajax('http://'+hostname+pathname, $.extend(data, {
            success: function() {
                resolve.apply(null, arguments);
            },
            error: function() {
                reject.apply(null, arguments);
            }
        }));
    });
}

// eslint-disable-next-line no-unused-vars
function setRequestHeaders(version, headers = null){
    return function(request){
        request.setRequestHeader("x-api-version", version);

        if(headers){
            for (var key in headers) {
                if (headers.hasOwnProperty(key)) {
                    request.setRequestHeader(key, headers[key]);
                }
            }
        }
    };
}

function filter_paging (filter, paging) {
    let encodedFilter = encodeURIComponent(filter);
    let encodedPaging = encodeURIComponent(paging);

    let params = (filter || paging ? '?' : '')+
				(filter ? encodedFilter : '')+
				(filter && paging ? '&' : '')+
				(paging ? encodedPaging : '');

    return params;
}

function q_paging (q, paging) {
    let encodedQ = encodeURIComponent(q);
    let encodedPaging = encodeURIComponent(paging);

    let params = (q || paging ? '?' : '')+
				(q ? ('q=' + encodedQ) : '')+
				(q && paging ? '&' : '')+
				(paging ? encodedPaging : '');

    return params;
}

// eslint-disable-next-line no-unused-vars
var ContentBrowserApiService = {
    api_description : function() {
        let url = '/contentbrowser';
        return req_promise(url, {
            dataType: 'json',
            method : "GET"
        });
    },

    project_resources_by_organization : function(organization, filter, paging) {
        let url = '/contentbrowser/projects/'+organization+filter_paging(filter, paging);
        return req_promise(url, {
            dataType: 'json',
            method : "GET",
        });
    },

    project_resources : function(organization, project_name, filter, paging) {
        let url = '/contentbrowser/projects/'+organization+'/'+project_name+filter_paging(filter, paging);
        return req_promise(url, {
            dataType: 'json',
            method : "GET",
        });
    },

    branches : function(project_full_name, branch_name) {
        let url = '/contentbrowser/projects/'+project_full_name+'/'+branch_name+filter_paging();
        return req_promise(url, {
            dataType: 'json',
            method : "GET",
        });
    },

    project_workspaces : function(workspace_guid_name) {
        let url = '/contentbrowser/workspaces/'+workspace_guid_name;
        return req_promise(url, {
            dataType: 'json',
            method : "GET",
        });
    },

    list_workspaces : function(filter, paging) {
        let url = '/contentbrowser/workspaces'+filter_paging(filter, paging);
        return req_promise(url, {
            dataType: 'json',
            method : "GET",
        });
    },

    asset_resources_from_workspace : function(workspace_guid_name, asset_ref, q, paging) {
        let url = '/contentbrowser/workspaces/'+workspace_guid_name+asset_ref+q_paging(q, paging);
        return req_promise(url, {
            dataType: 'json',
            method : "GET",
        });
    },

    assets_from_project : function(project_full_name, branch, asset_ref, filter, paging) {
        let url = '/contentbrowser/projects/'+project_full_name+'/'+branch+asset_ref+filter_paging(filter, paging);
        return req_promise(url, {
            dataType: 'json',
            method : "GET",
        });
    },

    resources_from_workspace : function(workspace_guid_name, resource_ref, q, paging) {
        let url = '/contentbrowser/workspaces/'+workspace_guid_name+resource_ref+q_paging(q, paging);
        return req_promise(url, {
            dataType: 'json',
            method : "GET",
        });
    },

    resources_from_project : function(project_full_name, branch, resource_ref, filter, paging) {
        let url = '/contentbrowser/projects/'+project_full_name+'/'+branch+resource_ref+filter_paging(filter, paging);
        return req_promise(url, {
            dataType: 'json',
            method : "GET",
        });
    },
};

const cook_data_to_send = data => {
    Object.keys(data)
        .forEach(key => data[key] === undefined && delete data[key]);
    return JSON.stringify(data);
};

// eslint-disable-next-line no-unused-vars
var AssetManagerApiService = {
    api_description : function() {
        let url = '/assetmanager';
        return req_promise(url, {
            dataType: 'json',
            method : "GET"
        });
    },

    create_workspace : function(headers, data) {
        let url = '/assetmanager/workspaces';
        return req_promise(url, {
            dataType: 'json',
            method : "POST",
            contentType : "application/json",
            data: JSON.stringify(data)
        });
    },

    delete_workspace : function(workspace_guid_name) {
        let url = '/assetmanager/workspaces/'+workspace_guid_name;
        return req_promise(url, {
            dataType: 'json',
            method : "DELETE",
            contentType : "application/json",
        });
    },

    add_workspace : function(headers, data) {
        let url = '/assetmanager/workspaces/favorites';
        return req_promise(url, {
            dataType: 'json',
            method : "POST",
            contentType : "application/json",
            data: JSON.stringify(data)
        });
    },

    forget_workspace : function(workspace_guid_name) {
        let url = '/assetmanager/workspaces/'+workspace_guid_name+'/favorites';
        return req_promise(url, {
            dataType: 'json',
            method : "DELETE",
            contentType : "application/json",
        });
    },

    status : function(workspace_guid_name) {
        let url = '/assetmanager/workspaces/'+workspace_guid_name+'/status';
        return req_promise(url, {
            dataType: 'json',
            method : "GET"
        });
    },

    ref_status : function(workspace_guid_name, ref) {
        let url = '/assetmanager/workspaces/'+workspace_guid_name+'/status'+ref;
        return req_promise(url, {
            dataType: 'json',
            method : "GET"
        });
    },

    create_update_asset : function(workspace_guid_name, asset_ref, headers, data) {
        let url = '/assetmanager/workspaces/'+workspace_guid_name+asset_ref;
        return req_promise(url, {
            dataType: 'json',
            method : "PUT",
            contentType : "application/json",
            data: cook_data_to_send(data)
        });
    },

    rename_asset : function(workspace_guid_name, asset_ref, headers, data) {
        let url = '/assetmanager/workspaces/'+workspace_guid_name+'/rename'+asset_ref;
        return req_promise(url, {
            dataType: 'json',
            method : "POST",
            contentType : "application/json",
            data: JSON.stringify(data)
        });
    },

    delete_asset : function(workspace_guid_name, asset_ref) {
        let url = '/assetmanager/workspaces/'+workspace_guid_name+asset_ref;
        return req_promise(url, {
            dataType: 'json',
            method : "DELETE"
        });
    },

    get_subscriptions : function(workspace_guid_name) {
        let url = '/assetmanager/workspaces/'+workspace_guid_name+'/subscriptions';
        return req_promise(url, {
            dataType: 'json',
            method : "GET"
        });
    },

    add_subscription : function(workspace_guid_name, data) {
        let url = '/assetmanager/workspaces/'+workspace_guid_name+'/subscriptions';
        return req_promise(url, {
            dataType: 'json',
            method : "POST",
            contentType : "application/json",
            data: JSON.stringify(data)
        });
    },

    delete_subscription : function(workspace_guid_name, subscription_id) {
        let url = '/assetmanager/workspaces/'+workspace_guid_name+'/subscriptions/'+subscription_id;
        return req_promise(url, {
            dataType: 'json',
            method : "DELETE"
        });
    },

    get_stage : function(workspace_guid_name) {
        let url = '/assetmanager/workspaces/'+workspace_guid_name+'/stage';
        return req_promise(url, {
            dataType: 'json',
            method : "GET"
        });
    },

    add_asset_to_stage : function(workspace_guid_name, asset_ref) {
        let url = '/assetmanager/workspaces/'+workspace_guid_name+'/stage'+asset_ref;
        return req_promise(url, {
            dataType: 'json',
            method : "POST",
        });
    },

    delete_asset_from_stage : function(workspace_guid_name, asset_ref) {
        let url = '/assetmanager/workspaces/'+workspace_guid_name+'/stage'+asset_ref;
        return req_promise(url, {
            dataType: 'json',
            method : "DELETE"
        });
    },

    get_commit_log : function(workspace_guid_name, ref, paging) {
        let url = '/assetmanager/workspaces/'+workspace_guid_name+'/commits'+ref+filter_paging(null, paging);
        return req_promise(url, {
            dataType: 'json',
            method : "GET"
        });
    },

    commit_to_project : function(workspace_guid_name, data) {
        let url = '/assetmanager/workspaces/'+workspace_guid_name+'/commits';
        return req_promise(url, {
            dataType: 'json',
            method : "POST",
            contentType : "application/json",
            data: JSON.stringify(data)
        });
    },
};
