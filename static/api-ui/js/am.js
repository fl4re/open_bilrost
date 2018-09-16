/**
* Copyright (C) 2015-2018 Starbreeze AB All Rights Reserved.
*/

/* globals toggleLoading: true */
/* globals showResponse: true */
/* globals AssetManagerApiService: true */
/* globals $: true */
/* globals document: true */

$(document).ready(function(){
    $('[data-call="am_api_description"] .btn.run').on('click', function() {
        let call_obj = $(this).closest('.call');
        toggleLoading(call_obj.find('.response-container'));

        showResponse(AssetManagerApiService.api_description(), call_obj.find('.response-container'));
    });

    $('[data-call="am_create_workspace"] .btn.run').on('click', function() {
        let call_obj = $(this).closest('.call');
        toggleLoading(call_obj.find('.response-container'));

        let headers = {
            'Content-Type': 'application/json',
        };

        let data = {
            file_uri: call_obj.find('#file_uri').val(),
            name: call_obj.find('#name').val(),
            description: call_obj.find('#description').val(),
            organization: call_obj.find('#organization').val(),
            project_name: call_obj.find('#project_name').val(),
            branch: call_obj.find('#branch').val(),
        };

        showResponse(AssetManagerApiService.create_workspace(headers, data), call_obj.find('.response-container'));
    });

    $('[data-call="am_delete_workspace"] .btn.run').on('click', function() {
        let call_obj = $(this).closest('.call');
        toggleLoading(call_obj.find('.response-container'));

        let workspace_guid_name = call_obj.find('#workspace_guid_name').val();

        showResponse(AssetManagerApiService.delete_workspace(workspace_guid_name), call_obj.find('.response-container'));
    });

    $('[data-call="am_add_workspace_to_favorites"] .btn.run').on('click', function() {
        let call_obj = $(this).closest('.call');
        toggleLoading(call_obj.find('.response-container'));

        let headers = {
            'Content-Type': 'application/json',
        };

        let data = {
            file_uri: call_obj.find('#file_uri').val(),
        };

        showResponse(AssetManagerApiService.add_workspace(headers, data), call_obj.find('.response-container'));
    });

    $('[data-call="am_forget_workspace_from_favorites"] .btn.run').on('click', function() {
        let call_obj = $(this).closest('.call');
        toggleLoading(call_obj.find('.response-container'));

        let workspace_guid_name = call_obj.find('#workspace_guid_name').val();

        showResponse(AssetManagerApiService.forget_workspace(workspace_guid_name), call_obj.find('.response-container'));
    });

    $('[data-call="am_status"] .btn.run').on('click', function() {
        let call_obj = $(this).closest('.call');
        toggleLoading(call_obj.find('.response-container'));

        let workspace_guid_name = call_obj.find('#workspace_guid_name').val();

        showResponse(AssetManagerApiService.status(workspace_guid_name), call_obj.find('.response-container'));
    });

    $('[data-call="am_ref_status"] .btn.run').on('click', function() {
        let call_obj = $(this).closest('.call');
        toggleLoading(call_obj.find('.response-container'));

        let workspace_guid_name = call_obj.find('#workspace_guid_name').val();
        let ref = call_obj.find('#ref').val();

        showResponse(AssetManagerApiService.ref_status(workspace_guid_name, ref), call_obj.find('.response-container'));
    });

    $('[data-call="am_create_update_asset"] .btn.run').on('click', function() {
        let call_obj = $(this).closest('.call');
        toggleLoading(call_obj.find('.response-container'));

        let workspace_guid_name = call_obj.find('#workspace_guid_name').val();
        let asset_ref = call_obj.find('#asset_ref').val();

        var headers = {
            'Content-Type': call_obj.find('#content_type').val(),
            'Last-modified': call_obj.find('#last_modified').val(),
        };

        let data = {
            tags: call_obj.find('#tags').val().split(','),
            comment: call_obj.find('#comment').val(),
            main: call_obj.find('#main').val(),
            dependencies: call_obj.find('#dependencies').val().split(','),
            semantics: call_obj.find('#semantics').val().split(','),
        };

        showResponse(AssetManagerApiService.create_update_asset(workspace_guid_name, asset_ref, headers, data), call_obj.find('.response-container'));
    });

    $('[data-call="am_rename_asset"] .btn.run').on('click', function() {
        let call_obj = $(this).closest('.call');
        toggleLoading(call_obj.find('.response-container'));

        let workspace_guid_name = call_obj.find('#workspace_guid_name').val();
        let asset_ref = call_obj.find('#asset_ref').val();

        var headers = {
            'Content-Type': call_obj.find('#content_type').val(),
            'Last-modified': call_obj.find('#last_modified').val(),
        };

        var data = {
            'new': call_obj.find('#new_ref').val(),
        };

        showResponse(AssetManagerApiService.rename_asset(workspace_guid_name, asset_ref, headers, data), call_obj.find('.response-container'));
    });

    $('[data-call="am_delete_asset"] .btn.run').on('click', function() {
        let call_obj = $(this).closest('.call');
        toggleLoading(call_obj.find('.response-container'));

        let workspace_guid_name = call_obj.find('#workspace_guid_name').val();
        let asset_ref = call_obj.find('#asset_ref').val();

        showResponse(AssetManagerApiService.delete_asset(workspace_guid_name, asset_ref), call_obj.find('.response-container'));
    });

    $('[data-call="am_get_subscriptions"] .btn.run').on('click', function() {
        let call_obj = $(this).closest('.call');
        toggleLoading(call_obj.find('.response-container'));

        let workspace_guid_name = call_obj.find('#workspace_guid_name').val();

        showResponse(AssetManagerApiService.get_subscriptions(workspace_guid_name), call_obj.find('.response-container'));
    });

    $('[data-call="am_add_subscription"] .btn.run').on('click', function() {
        let call_obj = $(this).closest('.call');
        toggleLoading(call_obj.find('.response-container'));

        let workspace_guid_name = call_obj.find('#workspace_guid_name').val();

        let data = {
            type: call_obj.find('#type').val(),
            descriptor: call_obj.find('#descriptor').val(),
        };

        showResponse(AssetManagerApiService.add_subscription(workspace_guid_name, data), call_obj.find('.response-container'));
    });

    $('[data-call="am_delete_subscription"] .btn.run').on('click', function() {
        let call_obj = $(this).closest('.call');
        toggleLoading(call_obj.find('.response-container'));

        let workspace_guid_name = call_obj.find('#workspace_guid_name').val();
        let subscription_id = call_obj.find('#subscription_id').val();

        showResponse(AssetManagerApiService.delete_subscription(workspace_guid_name, subscription_id), call_obj.find('.response-container'));
    });

    $('[data-call="am_get_stage"] .btn.run').on('click', function() {
        let call_obj = $(this).closest('.call');
        toggleLoading(call_obj.find('.response-container'));

        let workspace_guid_name = call_obj.find('#workspace_guid_name').val();

        showResponse(AssetManagerApiService.get_stage(workspace_guid_name), call_obj.find('.response-container'));
    });

    $('[data-call="am_add_asset_to_stage"] .btn.run').on('click', function() {
        let call_obj = $(this).closest('.call');
        toggleLoading(call_obj.find('.response-container'));

        let workspace_guid_name = call_obj.find('#workspace_guid_name').val();
        let asset_ref = call_obj.find('#asset_ref').val();

        showResponse(AssetManagerApiService.add_asset_to_stage(workspace_guid_name, asset_ref), call_obj.find('.response-container'));
    });

    $('[data-call="am_delete_asset_from_stage"] .btn.run').on('click', function() {
        let call_obj = $(this).closest('.call');
        toggleLoading(call_obj.find('.response-container'));

        let workspace_guid_name = call_obj.find('#workspace_guid_name').val();
        let asset_ref = call_obj.find('#asset_ref').val();

        showResponse(AssetManagerApiService.delete_asset_from_stage(workspace_guid_name, asset_ref), call_obj.find('.response-container'));
    });

    $('[data-call="am_get_commit_log"] .btn.run').on('click', function() {
        let call_obj = $(this).closest('.call');
        toggleLoading(call_obj.find('.response-container'));

        let workspace_guid_name = call_obj.find('#workspace_guid_name').val();
        let ref = call_obj.find('#ref').val() || '';
        let paging = call_obj.find('#paging').val();

        showResponse(AssetManagerApiService.get_commit_log(workspace_guid_name, ref, paging), call_obj.find('.response-container'));
    });

    $('[data-call="am_commit_to_project"] .btn.run').on('click', function() {
        let call_obj = $(this).closest('.call');
        toggleLoading(call_obj.find('.response-container'));

        let workspace_guid_name = call_obj.find('#workspace_guid_name').val();

        let data = {
            message: call_obj.find('#message').val(),
        };

        showResponse(AssetManagerApiService.commit_to_project(workspace_guid_name, data), call_obj.find('.response-container'));
    });
});
