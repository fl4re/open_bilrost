/**
* Copyright (C) 2015-2018 Starbreeze AB All Rights Reserved.
*/

/* globals toggleLoading: true */
/* globals showResponse: true */
/* globals ContentBrowserApiService: true */
/* globals $: true */
/* globals document: true */

$(document).ready(function(){
    $('[data-call="cb_api_description"] .btn.run').on('click', function() {
        let call_obj = $(this).closest('.call');
        toggleLoading(call_obj.find('.response-container'));

        showResponse(ContentBrowserApiService.api_description(), call_obj.find('.response-container'));
    });

    $('[data-call="cb_project_resources_by_organization"] .btn.run').on('click', function() {
        let call_obj = $(this).closest('.call');
        toggleLoading(call_obj.find('.response-container'));

        let organization = call_obj.find('#organization').val();
        let filter = call_obj.find('#filter').val();
        let paging = call_obj.find('#paging').val();

        showResponse(ContentBrowserApiService.project_resources_by_organization(organization, filter, paging), call_obj.find('.response-container'));
    });

    $('[data-call="cb_project_resources"] .btn.run').on('click', function() {
        let call_obj = $(this).closest('.call');
        toggleLoading(call_obj.find('.response-container'));

        let organization = call_obj.find('#organization').val();
        let project_name = call_obj.find('#project_name').val();
        let filter = call_obj.find('#filter').val();
        let paging = call_obj.find('#paging').val();

        showResponse(ContentBrowserApiService.project_resources(organization, project_name, filter, paging), call_obj.find('.response-container'));
    });

    $('[data-call="cb_branches"] .btn.run').on('click', function() {
        let call_obj = $(this).closest('.call');
        toggleLoading(call_obj.find('.response-container'));

        let project_full_name = call_obj.find('#project_full_name').val();
        let branch_name = call_obj.find('#branch_name').val();
        let filter = call_obj.find('#filter').val();
        let paging = call_obj.find('#paging').val();

        showResponse(ContentBrowserApiService.branches(project_full_name, branch_name, filter, paging), call_obj.find('.response-container'));
    });

    $('[data-call="cb_project_workspaces"] .btn.run').on('click', function() {
        let call_obj = $(this).closest('.call');
        toggleLoading(call_obj.find('.response-container'));

        let workspace_guid_name = call_obj.find('#workspace_guid_name').val();

        showResponse(ContentBrowserApiService.project_workspaces(workspace_guid_name), call_obj.find('.response-container'));
    });

    $('[data-call="cb_list_workspaces"] .btn.run').on('click', function() {
        let call_obj = $(this).closest('.call');
        toggleLoading(call_obj.find('.response-container'));

        let filter = call_obj.find('#filter').val();
        let paging = call_obj.find('#paging').val();

        showResponse(ContentBrowserApiService.list_workspaces(filter, paging), call_obj.find('.response-container'));
    });

    $('[data-call="cb_asset_resources_from_workspace"] .btn.run').on('click', function() {
        let call_obj = $(this).closest('.call');
        toggleLoading(call_obj.find('.response-container'));

        let workspace_guid_name = call_obj.find('#workspace_guid_name').val();
        let asset_ref = call_obj.find('#asset_ref').val();
        let q = call_obj.find('#q').val();
        let paging = call_obj.find('#paging').val();

        showResponse(ContentBrowserApiService.asset_resources_from_workspace(workspace_guid_name, asset_ref, q, paging), call_obj.find('.response-container'));
    });

    $('[data-call="cb_assets_from_project"] .btn.run').on('click', function() {
        let call_obj = $(this).closest('.call');
        toggleLoading(call_obj.find('.response-container'));

        let project_full_name = call_obj.find('#project_full_name').val();
        let branch_name = call_obj.find('#branch_name').val();
        let asset_ref = call_obj.find('#asset_ref').val();
        let filter = call_obj.find('#filter').val();
        let paging = call_obj.find('#paging').val();

        showResponse(ContentBrowserApiService.assets_from_project(project_full_name, branch_name, asset_ref, filter, paging), call_obj.find('.response-container'));
    });

    $('[data-call="cb_resources_from_workspace"] .btn.run').on('click', function() {
        let call_obj = $(this).closest('.call');
        toggleLoading(call_obj.find('.response-container'));

        let workspace_guid_name = call_obj.find('#workspace_guid_name').val();
        let resource_ref = call_obj.find('#resource_ref').val();
        let q = call_obj.find('#q').val();
        let paging = call_obj.find('#paging').val();

        showResponse(ContentBrowserApiService.resources_from_workspace(workspace_guid_name, resource_ref, q, paging), call_obj.find('.response-container'));
    });

    $('[data-call="cb_resources_from_project"] .btn.run').on('click', function() {
        let call_obj = $(this).closest('.call');
        toggleLoading(call_obj.find('.response-container'));

        let project_full_name = call_obj.find('#project_full_name').val();
        let branch_name = call_obj.find('#branch_name').val();
        let resource_ref = call_obj.find('#resource_ref').val();
        let filter = call_obj.find('#filter').val();
        let paging = call_obj.find('#paging').val();

        showResponse(ContentBrowserApiService.resources_from_project(project_full_name, branch_name, resource_ref, filter, paging), call_obj.find('.response-container'));
    });
});
