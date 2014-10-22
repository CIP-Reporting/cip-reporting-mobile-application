/*
 * CIP Reporting API Client Application
 *
 * Copyright (c) 2013 CIP Reporting
 * All rights reserved.
 * 
 * Redistribution and use in source and binary forms are permitted
 * provided that the above copyright notice and this paragraph are
 * duplicated in all such forms and that any documentation,
 * advertising materials, and other materials related to such
 * distribution and use acknowledge that the software was developed
 * by CIP Reporting.  The name of CIP Reporting may not be used to 
 * endorse or promote products derived from this software without 
 * specific prior written permission.
 *
 * THIS SOFTWARE IS PROVIDED ``AS IS'' AND WITHOUT ANY EXPRESS OR
 * IMPLIED WARRANTIES, INCLUDING, WITHOUT LIMITATION, THE IMPLIED
 * WARRANTIES OF MERCHANTABILITY AND FITNESS FOR A PARTICULAR PURPOSE.
 *
 */
(function(window, undefined) {

  if (typeof CIPAPI == 'undefined') CIPAPI = {};
  CIPAPI.main = {};
  
  var log = log4javascript.getLogger("CIPAPI.main");
  
  // Main screen
  $(document).on('cipapi-handle-main', function(event, info) {
    renderMainScreen(info);
    
    // Force an update of the reportstore monitor
    $(document).trigger('cipapi-reportstore-change');
  });
  
  // Do some reports and stuff!
  $(document).on('cipapi-update-main', function(event, info) {
    renderMainScreen(info);
  });

  // Monitor for config changes and update button lists when displayed
  $(document).on('cipapi-mobile-forms-set', function(event, info) {
    if ($('div#main-content-area form div.form-button-list').length > 0) {
      // Clean up and re-draw buttons
      $('div#main-content-area form > *').remove();
      renderButtons(CIPAPI.config.apiForms);
    }
  });

  // Store images for packaging later  
  var imageStorage = [];
  $(document).on('cipapi-forms-media-added', function(event, info) {
    log.debug('Parking image: ' + info.imageURI);
    imageStorage.push(info);
  });

  // Helper to render the main screen from initial navigation and hash tag updates
  function renderMainScreen(info) {
    log.debug("Rendering main screen");
    
    // Clean up
    $('div#main-content-area form > *').remove();

    // Show button list
    if (info.params.action == 'list') {
      renderButtons(CIPAPI.config.apiForms);
    }
    // Show a form
    else if (info.params.action == 'form') {
      renderForm(info.params.form);
    }
    // Navigate to the button list if all else fails
    else {
      CIPAPI.router.goTo('main', { action: 'list' });
    }
  }

  // Render form list
  function renderButtons(buttonCollection) {
    log.debug("Rendering form button collection");
    
    // Configurable title
    var title = CIPAPI.config.reportListTitle;
    var description = CIPAPI.config.reportListDescription;
    
    var header = '' +
      '<div class="col-xs-12">' +
      '  <h2>' + title + '</h2>' +
      '  <span>' + description + '</span>' +
      '</div>';
    $('div#main-content-area form').append(header);
    $('div#main-content-area form').append('<div class="form-button-list"></div>');
    
    $.each(buttonCollection, function(key, val) {
      var span = val.match(/^glyphicon/) ? '<span class="glyphicon ' + val + '"></span> ' : '';
      $('div#main-content-area form div.form-button-list').append('<div class="col-xs-12 col-sm-6 col-md-4 col-lg-3" ><a data-form="' + key + '" class="btn btn-primary btn-lg btn-custom">' + span + key + '</a></div>');
    });
    
    $('div#main-content-area form div div a').each(function() {
      var btn = $(this);
      btn.click(function() {
        var btn = $(this);
        CIPAPI.router.goTo('main', { action: 'form', form: btn.attr('data-form') });
      });
    });
  }
  
  // Render a form
  function renderForm(formName) {
    log.debug("Rendering form button collection");
    
    if (typeof CIPAPI.mobileforms[formName] == 'undefined') {
      log.error("Form does not exist: " + formName);
      return;
    }

    // Reset image storage
    imageStorage = [];
    
    // Make a deep copy
    var formDefinition = jQuery.extend(true, {}, CIPAPI.mobileforms[formName]);

    formDefinition.form.push({
           'type': 'submit',
          'title': 'Save Report',
      'htmlClass': 'cipform-save-report'
    });

    formDefinition.onSubmit = function(errors, values) {
      if (!errors) {
        // Store the report for transmission
        CIPAPI.reportstore.storeReport({
                  formName: formName,
            serializedData: values,
          serializedImages: imageStorage,
            mobileMetadata: CIPAPI.stats.fetch(),
            destinationURL: '/api/versions/current/integrations/' + escape(formName)
        });
        
        // Kick off a report send attempt
        CIPAPI.reportstore.sendReports();
      
        // Go somewhere...
        CIPAPI.router.goTo('main', { action: 'list' });
      }
    }

    // Show me some form
    CIPAPI.forms.Render(formDefinition);

    // Need a clearfix between the submit button and form due to float and fixed changes in bootstrap depending on media size.
    // JSON forms doesn't provide a means to inject arbitrary HTML as needed for layout issues so we cram it in after rendering.
    $('<div class="clearfix"></div>').insertBefore($('input.cipform-save-report'));
    
    // Again due to lack of direct HTML control over JSON forms we basically hide the default submit button on the form and
    // inject our own proxy button which clicks by proxy.
    var proxySubmit = '' +
      '<a id="cipform-proxy-submit" class="btn btn-primary btn-lg btn-custom cipform-proxy-submit" href="javascript: void(0)">' +
      '  <span class="glyphicon glyphicon-save"></span>' +
      '  Save Report' +
      '</a>';
    
    $(proxySubmit).insertAfter($('input.cipform-save-report'));
    
    $('a#cipform-proxy-submit').on('click', function(evt) {
      $('input.cipform-save-report').click();
    });
    
    // Give camera and library access links a make over if present
    $('a.cipform_image_from_camera').addClass('btn btn-primary btn-md btn-custom cipform-real-camera').html('<span class="glyphicon glyphicon-camera"></span> From Camera');
    $('a.cipform_image_from_library').addClass('btn btn-primary btn-md btn-custom cipform-real-camera').html('<span class="glyphicon glyphicon-picture"></span> From Library');
  }

})(window);
