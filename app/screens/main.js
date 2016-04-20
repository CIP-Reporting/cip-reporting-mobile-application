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
  $(document).on('cipapi-mobile-forms-set cipapi-mobile-cases-set', function(event, info) {
    if ($('div#main-content-area form div.form-button-list').length > 0) {
      // Clean up and re-draw buttons
      $('div#main-content-area form > *').remove();

      if (CIPAPI.config.caseModeForm !== false)
        renderCases(CIPAPI.config.apiForms);
      else
        renderButtons(CIPAPI.config.apiForms);
    }
  });

  // Store images for packaging later  
  var imageStorage = [];
  $(document).on('cipapi-forms-media-added', function(event, info) {
    log.debug('Parking image: ' + info.fileName);
    imageStorage.push(info);
  });

  // Helper to render the main screen from initial navigation and hash tag updates
  function renderMainScreen(info) {
    log.debug("Rendering main screen");
    
    // Clean up
    $('div#main-content-area form > *').remove();

    // Show button list
    if (info.params.action == 'list') {
      if (CIPAPI.config.caseModeForm !== false)
        renderCases(CIPAPI.config.apiForms);
      else
        renderButtons(CIPAPI.config.apiForms);
    }
    // Show a form
    else if (info.params.action == 'form') {
      CIPAPI.main.renderForm(info.params.form, info.params.case, info.params.uuid);
    }
    // Show a case
    else if (info.params.action == 'case') {
      renderCase(info.params.case, CIPAPI.config.apiForms);
    }
    // Barcode?
    else if (info.params.action == 'barcode') {
      // Because this guy supports "auto-save" it may save and attempt to "go back" before this
      // page is fully rendered (from the perspective of the CIPAPI.router).  In this case the
      // back page stage is not loaded with this current page as that is loaded into the stack
      // post-navigation.  Therefore, when it attempts to go back the page stack is not loaded
      // fully and the app gets confused on where to go back to.  In Android it may exit the
      // app.  A simple work around is to make this call in a delayed closure to allow this
      // execution context to complete first.
      setTimeout(function() { CIPAPI.barcode.scan(); }, 100);
    }
    // Navigate to the button list if all else fails
    else {
      CIPAPI.router.goTo('main', { action: 'list' });
    }

    // Scroll to the top!
    window.scrollTo(0, 0);
  }

  // Return the formatted time
  function getTime() {
    // Add zero in front of numbers < 10
    function addZero(i) {
      if (i < 10) i = "0" + i; 
      return i;
    }

    var today = new Date();
    var y = today.getFullYear();
    var n = addZero(today.getMonth() + 1);
    var d = addZero(today.getDate());
    
    var h = addZero(today.getHours());
    var m = addZero(today.getMinutes());
    var s = addZero(today.getSeconds());
    
    return n + '-' + d + '-' + y + ' ' + h + ":" + m + ":" + s;
  }
  
  function getCaseHeadingField(caseRecord, fieldName) {
    // See if the form key is specified explicitly
    var formVal = caseRecord.reportData.serializedData[fieldName];
    if (formVal) return formVal;

    // Try standard form key
    var formKey = CIPAPI.forms.asciiToHex(fieldName);
    formVal = caseRecord.reportData.serializedData[formKey];
    if (formVal) return formVal;
    
    // If not, try and find form key that starts with this form key
    formVal = CIPAPI.translations.translate('N/A');
    $.each(caseRecord.reportData.serializedData, function(key, val) {
      if (key.indexOf(formKey) > -1) {
        formVal = val;
        return false;
      }
    });
    
    return formVal;
  }
  
  var currentCaseUUID = false;
  function renderCase(caseOffset, buttonCollection) {
    log.debug("Rendering case at offset " + caseOffset);
    
    var cases = CIPAPI.casestore.getCases();
    
    // Make sure case record exists
    if (caseOffset >= cases.length) {
      log.warn('Case record does not exist at offset (yet)' + caseOffset);
      return CIPAPI.router.goTo('main', { action: 'list' });
    }
    
    var caseRecord = cases[caseOffset];
    // Generate a title
    var caseHeader = $('<div class="col-xs-12 casehdr"></div>');    
    $.each(CIPAPI.config.caseModeListFields, function(fieldKey, fieldName) {
      var headingTag = 'h' + Math.min(5, fieldKey + 2);
      var caseHeading = $('<' + headingTag + '></' + headingTag + '>');
      caseHeading.text(getCaseHeadingField(caseRecord, fieldName));
      caseHeader.append(caseHeading);
    });

    $('div#main-content-area form').append(caseHeader);
    $('div#main-content-area form').append('<div class="form-button-list"></div>');

    var caseUUID = caseRecord.reportData.serializedData.reportUUID;
    log.debug("Rendering case children for UUID " + caseUUID);
    currentCaseUUID = caseUUID; // Bookmark this case
    
    // Output everything EXCEPT the new case button
    $.each(buttonCollection, function(key, val) {
      if (key == CIPAPI.config.caseModeForm) return;

      var childDB = CIPAPI.casestore.getCaseChildrenUUIDs(caseUUID, key, true);
      var childrenPercents = childDB.percents;
      var childrenUUIDs = childDB.uuids;
      
      for (var i=0; i<childrenUUIDs.length; i++)
      {
        var percentComplete = childrenPercents[i];
        var progress = '<div class="meter ' + (percentComplete === 100 ? 'green' : 'orange') + '"><span style="width: ' + (percentComplete === false ? 0 : percentComplete) + '%"></span></div>';
        var extraCss = percentComplete === false ? '-notexist' : '';

        var span = val.match(/^glyphicon/) ? '<span class="glyphicon ' + val + '"></span> ' : '';
        $('div#main-content-area form div.form-button-list').append('<div class="col-xs-12 col-sm-6 col-md-6 col-lg-4" ><a data-ajax="false" data-form="' + key + '" data-uuid="' + childrenUUIDs[i] + '" class="formbtn btn btn-primary btn-lg btn-custom' + extraCss + '">' + span + key + progress + '</a></div>');
      }
    });

    // Handle form clicks
    $('div#main-content-area form div div a').on('tap', function(e) {
      $(document).trigger('cipapi-behaviors-button-click', { button: $(this), callback: function(info) {
        CIPAPI.router.goTo('main', { action: 'form', form: info.button.attr('data-form'), case: caseUUID, uuid: info.button.attr('data-uuid') });
      }});
    }).on('taphold', function(e) {
// TODO: Context menu of some sorts?
$(document).trigger('cipapi-behaviors-haptic-feedback');
$(document).trigger('cipapi-case-form-hold', { form: $(this).attr('data-form'), case: caseUUID, uuid: $(this).attr('data-uuid') });
    });
    
    // Output a potential clear div
    $('div#main-content-area form div.form-button-list').append('<div class="beforecasebtn"></div>');

    // Output case ending button    
    var span = '<span class="glyphicon glyphicon-check"></span> ';
    $('div#main-content-area form div.form-button-list').append('<div class="col-xs-12 col-sm-6 col-md-6 col-lg-4" ><a data-ajax="false" data-form="' + caseUUID + '" class="formbtn btn btn-primary btn-lg btn-custom-end-case">' + span + CIPAPI.translations.translate('Complete Case') + '</a></div>');
    
    // Assign click handler
    $('div#main-content-area form div div a.btn-custom-end-case').click(function() {
      var btn = $(this);
      
      bootbox.dialog({
        message: CIPAPI.translations.translate('WARNING: This will close the case and it will be no longer available on the mobile application.'),
        title: CIPAPI.translations.translate('Close Case'),
        buttons: {
          danger: {
            label: CIPAPI.translations.translate('Close Case'),
            className: "btn-danger",
            callback: function() {
              log.info('Removing case ' + btn.attr('data-form'));
              var removedCase = CIPAPI.casestore.removeCase(btn.attr('data-form'));

              // Inject the end time NOW
              removedCase[0].reportData.serializedData[CIPAPI.forms.asciiToHex('end_date')] = getTime();
              
              // Store the report for final transmission
              CIPAPI.reportstore.storeReport(removedCase[0].reportData, true);

              // Kick off a report send attempt
              CIPAPI.reportstore.sendReports();

              // Go somewhere...
              CIPAPI.navbar.goBack();
            }
          },
          main: {
            label: CIPAPI.translations.translate('Cancel'),
            className: "btn-primary btn-custom",
            callback: function() {
              bootbox.hideAll();
            }
          }
        }
      });
    });
  }
  
  // Render case list
  function renderCases(buttonCollection) {
    log.debug("Rendering cases");
    
    // Configurable title
    var title = CIPAPI.translations.translate('Open Cases');
    var description = CIPAPI.translations.translate('Create new or continue existing cases');

    var header = '' +
      '<div class="col-xs-12">' +
      '  <h2>' + title + '</h2>' +
      '  <span>' + description + '</span>' +
      '</div>';
    $('div#main-content-area form').append(header);
    $('div#main-content-area form').append('<div class="form-button-list"></div>');
    
    // Output new case button
    $.each(buttonCollection, function(key, val) {
      if (key != CIPAPI.config.caseModeForm) return;
      var span = val.match(/^glyphicon/) ? '<span class="glyphicon ' + val + '"></span> ' : '';
      $('div#main-content-area form div.form-button-list').append('<div class="col-xs-12 col-sm-12 col-md-6 col-lg-6" ><a data-ajax="false" data-form="' + key + '" class="formbtn btn btn-primary btn-lg btn-custom btn-custom-start-case">' + span + key + '</a></div>');
    });
    
    // Assign click handler
    $('div#main-content-area form div div a.formbtn').each(function() {
      var formbtn = $(this);
      formbtn.click(function() {
        var formbtn = $(this);
        CIPAPI.router.goTo('main', { action: 'form', form: formbtn.attr('data-form') });
      });
    });
    
    // Output a potential clear div
    $('div#main-content-area form div.form-button-list').append('<div class="beforecasebtn"></div>');
    
    // Output current cases
    $.each(CIPAPI.casestore.getCases(), function(caseKey, caseRecord) {
      var caseDiv = $('<div class="casebtn col-xs-12 col-sm-12 col-md-6 col-lg-6"></div>');
      var caseLnk = $('<a data-ajax="false" data-form="' + caseKey + '" class="casebtn btn btn-primary btn-lg btn-custom"></a>');

      // Output the button text
      var hLevel = 2;
      $.each(CIPAPI.config.caseModeListFields, function(fieldKey, fieldName) {
        var hTag = 'h' + Math.min(hLevel++, 5)
        var caseSpan = $('<' + hTag + '></' + hTag + '>');
        caseSpan.text(getCaseHeadingField(caseRecord, fieldName));
        caseLnk.append(caseSpan);
      });
      
      // Determine progress
      var percentComplete = CIPAPI.casestore.getCaseCompletePercent(caseRecord);
      var progress = $('<div class="meter ' + (percentComplete === 100 ? 'green' : 'orange') + '"><span style="width: ' + percentComplete + '%"></span></div>');
      caseLnk.append(progress);
      
      caseDiv.append(caseLnk);
      $('div#main-content-area form div.form-button-list').append(caseDiv);
    });
    
    // Assign click handlers and capture max height of all items
    var highestBox = 0;
    $('div#main-content-area form div div a.casebtn').each(function() {
      if ($(this).height() > highestBox) highestBox = $(this).height(); 
      
      $(this).click(function() {
        $(document).trigger('cipapi-behaviors-haptic-feedback');
        CIPAPI.router.goTo('main', { action: 'case', case: $(this).attr('data-form') });
      });
    });
    
    $('div#main-content-area form div div a.casebtn').height(highestBox);
  }
  
  // Render form list
  function renderButtons(buttonCollection) {
    log.debug("Rendering form button collection");
    
    // Configurable title
    var title = CIPAPI.translations.translate('Submit a Report');
    var description = CIPAPI.translations.translate('To submit a report select and complete one of these available forms:');
    
    var header = '' +
      '<div class="col-xs-12">' +
      '  <h2>' + title + '</h2>' +
      '  <span>' + description + '</span>' +
      '</div>';
    $('div#main-content-area form').append(header);
    $('div#main-content-area form').append('<div class="form-button-list"></div>');
    
    if (CIPAPI.config.enableBarcodeScanner !== false) {
      var title = CIPAPI.translations.translate('Barcode Scanner');
      var span = '<span class="glyphicon glyphicon-barcode"></span> ';
      $('div#main-content-area form div.form-button-list').append('<div class="col-xs-12 col-sm-12 col-md-6 col-lg-4" ><a data-ajax="false" data-form="barcode-scanner" class="btn btn-primary btn-lg btn-custom">' + span + title + '</a></div>');
    }
    
    $.each(buttonCollection, function(key, val) {
      if (-1 !== $.inArray(key, CIPAPI.config.hiddenForms)) return;

      var span = val.match(/^glyphicon/) ? '<span class="glyphicon ' + val + '"></span> ' : '';
      $('div#main-content-area form div.form-button-list').append('<div class="col-xs-12 col-sm-12 col-md-6 col-lg-4" ><a data-ajax="false" data-form="' + key + '" class="btn btn-primary btn-lg btn-custom">' + span + key + '</a></div>');
    });
    
    $('div#main-content-area form div div a').each(function() {
      var btn = $(this);
      btn.click(function() {
        var btn = $(this);
        var form = btn.attr('data-form');
        CIPAPI.router.goTo('main', { action: form == 'barcode-scanner' ? 'barcode' : 'form', form: form });
      });
    });
  }
  
  // Render a form
  CIPAPI.main.renderForm = function(formName, caseUUID, childUUID, fieldValues, autoSubmit) {
    log.debug("Rendering form button collection");
    
    if (typeof CIPAPI.mobileforms[formName] == 'undefined') {
      log.error("Form does not exist: " + formName);
      return;
    }

    // Reset image storage
    imageStorage = [];
    
    // Grab the form definition from the case definition if possible else from the global form definitions
    var formDefinition = false;
    var fieldDependencies = false;
    if (caseUUID) {
      var childReport = CIPAPI.casestore.getChildReportForCaseByChildUUID(caseUUID, childUUID);
      if (childReport) {
        log.debug("Using form definition from existing case child");
        formDefinition = jQuery.extend(true, {}, childReport.formDefinition);
        fieldDependencies = jQuery.extend(true, [], childReport.fieldDependencies);
      } else {
        log.debug("Using form definition from global form data instead of case child");
        formDefinition = jQuery.extend(true, {}, CIPAPI.mobileforms[formName]);
        fieldDependencies = jQuery.extend(true, [], CIPAPI.fielddeps.getCurrentRules());
      }
    } else {
      log.debug("Using form definition from global form data");
      formDefinition = jQuery.extend(true, {}, CIPAPI.mobileforms[formName]);
      fieldDependencies = jQuery.extend(true, [], CIPAPI.fielddeps.getCurrentRules());
    }
    
    // Make a deep copy of the original
    var originalFormDefinition = jQuery.extend(true, {}, formDefinition);
    var originalFieldDependencies = jQuery.extend(true, [], fieldDependencies);
    
    var editExisting = false;
    
    if (fieldValues) {
      $.each(fieldValues, function(fieldKey, fieldValue) {
        fieldKey = CIPAPI.forms.asciiToHex(fieldKey);
        formDefinition.value[fieldKey] = fieldValue;
      });
    }
    
    // If a case and existing child report these UUIDs may get assigned next
    var reportUUID = false; reportRelUUID = false;
    
    // If case UUID is specified we need to load in existing values if present
    if (caseUUID) {
      // Set the reportRelUUID to this case then...
      reportRelUUID = caseUUID;
      
      var childReport = CIPAPI.casestore.getChildReportForCaseByChildUUID(caseUUID, childUUID);
      if (false !== childReport) {
        reportUUID = childReport.serializedData.reportUUID;
        editExisting = true;
        
        $.each(childReport.serializedData, function(fieldKey, fieldValue) {
          // Ugh... need to go find the form definition for this guy and extract the form value type
          // and if it has the magic cipform_empty_value class we need to remove it because this drives
          // the forms engine to select index -1 (nothing) which is not true now that we have put a value
          // onto the field definition.
          var formValueType = false;
          $.each(formDefinition.form, function(key, obj) {
            if (obj.key != fieldKey) return;
            formDefinition.form[key].htmlClass = formDefinition.form[key].htmlClass.replace(/cipform_empty_value/, 'cipform_wasempty_value');
            formValueType = formDefinition.form[key].type ? formDefinition.form[key].type : false;
          });
          
// TODO: We probably need to do a CSV split on multi-select fields and we may also need to use strings vs. arrays depending on type
log.warn("TODO: Form value type: " + formValueType);
          formDefinition.value[fieldKey] = fieldValue;
        });
      } else {
        log.debug("Child report for " + formName + " not found in case " + caseUUID);
      }
    }

    formDefinition.form.push({
           'type': 'submit',
          'title': CIPAPI.translations.translate('Save Report'),
      'htmlClass': 'cipform-save-report'
    });

    formDefinition.onSubmit = function(errors, values) {
      if (!errors) {
        // Inject two UUIDs into the values - a reportUUID and a reportRelUUID
        //
        // The reportUUID is just that - a UUID for this report which can be used as needed
        // on the server side.  It could be useful for duplicate detection and/or updates to
        // the same report.
        //
        // The reportRelUUID is a way to group a set of reports into a collection using a
        // UUID.  By default this UUID is the reportUUID for non-case mode, but when in case
        // mode this UUID is set to the owning case reportUUID.
        values.reportUUID = reportUUID ? reportUUID : CIPAPI.uuid.get();
        values.reportRelUUID = reportRelUUID ? reportRelUUID : values.reportUUID;
        
        // If in case mode rename the attachments to have enough information to know what tab and input the image is for
        if (caseUUID) {
          $.each(imageStorage, function(key, value) {
            var nameParts = imageStorage[key].fileName.split('.')
            var extension = nameParts.length > 1 ? ('.' + nameParts.pop()) : '';
            
            imageStorage[key].fileName = reportUUID + '_' + imageStorage[key].formName + '_' + imageStorage[key].timeStamp + extension;
            log.debug('New attachment name: ' + imageStorage[key].fileName);
          });        
        }
        
        // Store the report for transmission
        CIPAPI.reportstore.storeReport({
                    version: 1,
                   formName: formName,
             formDefinition: originalFormDefinition,
          fieldDependencies: originalFieldDependencies,
             serializedData: values,
           serializedImages: imageStorage,
             mobileMetadata: CIPAPI.stats.fetch(),
             destinationURL: '/api/versions/current/integrations/' + escape(CIPAPI.config.useSingleURL ? CIPAPI.config.overrideIntegration : formName),
           destinationQuery: CIPAPI.config.useSingleURL ? formName : false
        });
        
        // Kick off a report send attempt
        CIPAPI.reportstore.sendReports();
      
        // Go somewhere...
        CIPAPI.navbar.goBack();
      }
    }

    // Show me some form
    CIPAPI.fielddeps.setCurrentRules(fieldDependencies);
    CIPAPI.forms.Render(formDefinition, false, editExisting);

    // Need a clearfix between the submit button and form due to float and fixed changes in bootstrap depending on media size.
    // JSON forms doesn't provide a means to inject arbitrary HTML as needed for layout issues so we cram it in after rendering.
    $('<div class="clearfix"></div>').insertBefore($('input.cipform-save-report'));
    
    // Again due to lack of direct HTML control over JSON forms we basically hide the default submit button on the form and
    // inject our own proxy button which clicks by proxy.
    var proxySubmit = '' +
      '<a data-ajax="false" id="cipform-proxy-submit" class="btn btn-primary btn-lg btn-custom cipform-proxy-submit" href="javascript: void(0)">' +
      '  <span class="glyphicon glyphicon-save"></span>' +
      '  Save Report' +
      '</a>';
    
    $(proxySubmit).insertAfter($('input.cipform-save-report'));
    
    $('a#cipform-proxy-submit').on('click', function(evt) {
      $(document).trigger('cipapi-behaviors-button-click', { button: $(this), callback: function(info) {
        $('input.cipform-save-report').click();
      }});
    });
    
    // Have we been requested to just submit this?
    if (autoSubmit) {
      log.debug('Auto submitting from');
      $('a#cipform-proxy-submit').click();
    }
    
    // Give camera and library access links a make over if present
    $('a.cipform_image_from_camera').addClass('btn btn-primary btn-md btn-custom cipform-real-camera').html('<span class="glyphicon glyphicon-camera"></span><span class="media-description"> From Camera</span>');
    $('a.cipform_image_from_library').addClass('btn btn-primary btn-md btn-custom cipform-real-camera').html('<span class="glyphicon glyphicon-picture"></span><span class="media-description"> From Library</span>');
    
    // Fire off the behavior handler for forms
    $(document).trigger('cipapi-behaviors-apply-forms');
    
    // Track if field values actually are changed
    var fieldValuesChanged = false;
    $(document).on('cipapi-fieldvalues-change', function() { fieldValuesChanged = true; });
    
    // Put a custom back handler in place that can prompt to save on navigate away
    CIPAPI.navbar.registerBackHandler(function(skipHaptic) {
      // If no changes, just go back...
      if (!fieldValuesChanged) return CIPAPI.navbar.goBack(skipHaptic);
      
      if (!skipHaptic) $(document).trigger('cipapi-behaviors-haptic-feedback');
      
      bootbox.dialog({
        message: CIPAPI.translations.translate('WARNING: You attempting to go back without saving your changes.'),
        title: CIPAPI.translations.translate('Save Changes'),
        buttons: {
          danger: {
            label: CIPAPI.translations.translate('Abandon Changes'),
            className: "btn-danger",
            callback: function() {
              // Go somewhere...
              CIPAPI.navbar.goBack();
              bootbox.hideAll();
            }
          },
          main: {
            label: CIPAPI.translations.translate('Save Changes'),
            className: "btn-primary btn-custom",
            callback: function() {
              $(document).trigger('cipapi-behaviors-haptic-feedback');
              bootbox.hideAll();
              $('input.cipform-save-report').click();
            }
          }
        }
      });
    });
  }

})(window);
