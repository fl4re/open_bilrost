/**
* Copyright (C) 2015-2018 Starbreeze AB All Rights Reserved.
*/

/* globals $: true */
/* globals document: true */

$(document).ready(function(){
    $('.title-bar').on('click', function() {
        $(this).closest('.call').toggleClass('open');
    });

    $('.btn.fill').on('click', function() {
        $(this).closest('.call').find('[data-autofill]').each(function(){
            if($(this).attr('type') === 'checkbox') {
                $(this).prop('checked', true);
            } else {
                $(this).val($(this).attr('data-autofill'));
            }
        });
    });

    $('.btn.clean').on('click', function() {
        var field = $(this).closest('.call').find('[data-autofill]');

        field.each(function() {
            if($(this).attr('type') === 'checkbox') {
                $(this).prop('checked', false);
            } else {
                $(this).val($(this).attr('data-clean'));
            }
        });
    });

    $('[data-autofill]').each(function() {
        if($(this).attr('type') === 'checkbox') {
            $(this).prop('checked', false);
        } else {
            $(this).val($(this).attr('data-clean'));
        }
    });
});

// eslint-disable-next-line no-unused-vars
function showResponse (promise, jQueryElement) {
    promise.then(data => {
        if (data) {
            jQueryElement.find('pre').html(JSON.stringify(data, null, "  "));
        } else {
            jQueryElement.find('pre').html('- Empty Response -');
        }

        jQueryElement.removeClass('loading');
        jQueryElement.addClass('success');
    }).catch(function(err){
        jQueryElement.find('pre').html(JSON.stringify(err, null, "  "));
        jQueryElement.removeClass('loading');
        jQueryElement.addClass('error');
    });
}

// eslint-disable-next-line no-unused-vars
function toggleLoading (jQueryElement) {
    jQueryElement.removeClass('error');
    jQueryElement.removeClass('success');

    jQueryElement.find('pre').html("Loading...");
    jQueryElement.addClass('loading');
}
