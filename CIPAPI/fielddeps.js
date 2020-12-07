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
(function($, window, undefined) {

  if (typeof CIPAPI == 'undefined') CIPAPI = {};
  CIPAPI.fielddeps = {};
  
  // Rules as currently known from the service
  CIPAPI.fielddeps.serverRules = [];
  
  // The rules currently in use, which defaults to serverRules above
  CIPAPI.fielddeps.currentRules = false;

  // Rule contexts (keywords which can be set and unset by rules.  Rules can require that a certain context be set)
  CIPAPI.fielddeps.contexts = [];
  
  var log = CIPAPI.logger.getLogger("CIPAPI.fielddeps");

  var isLoaded = false;

  // APIs for managing the current dependency rule set
  CIPAPI.fielddeps.setCurrentRules   = function(rules) { CIPAPI.fielddeps.currentRules = rules; }
  CIPAPI.fielddeps.getCurrentRules   = function() { return CIPAPI.fielddeps.currentRules ? CIPAPI.fielddeps.currentRules : CIPAPI.fielddeps.serverRules; }
  CIPAPI.fielddeps.resetCurrentRules = function() { CIPAPI.fielddeps.currentRules = false; }

  // Given a map of field names, values, and rules ... remove all fields which would be hidden  
  CIPAPI.fielddeps.filterFieldValueMapByVisibleFields = function(fieldValueMap, rules) {
    if (!rules) rules = CIPAPI.fielddeps.getCurrentRules();
    
    var filteredMap = jQuery.extend(true, {}, fieldValueMap);
    
    var rules = CIPAPI.fielddeps.getCurrentRules();
    for (var i=0; i<rules.length; i++) {
      var fieldRule = rules[i];

      // Right now we only support core object fields
      if (fieldRule.object != 'core') continue;
      
      // If the target field does not exist in this map roll out
      var encodedFieldName = CIPAPI.forms.asciiToHex(fieldRule.name);
      if (typeof fieldValueMap[encodedFieldName] == 'undefined') continue;
      
      // Equality?
      if (fieldRule.condition == 'eq' && fieldRule.value != fieldValueMap[encodedFieldName]) continue; // Not a match
      
      // Inequality?
      if (fieldRule.condition == 'ne' && fieldRule.value == fieldValueMap[encodedFieldName]) continue; // Not a match
      
      // Hide fields ...
      if (fieldRule.hide) {
        for (var j=0; j<fieldRule.hide.length; j++) {
          var formName = CIPAPI.forms.asciiToHex(fieldRule.hide[j]);
          delete filteredMap[formName];
        }
      }
      
      // Show fields ...
      if (fieldRule.show) {
        for (var k=0; k<fieldRule.show.length; k++) {
          var formName = CIPAPI.forms.asciiToHex(fieldRule.show[k]);
          filteredMap[formName] = fieldValueMap[formName];
        }
      }
    }    
    
    return filteredMap;
  }
  
  function loadFieldDependencies() {
    if (!CIPAPI.credentials.areValid()) {
      log.debug("No credentials, defering attempts to load");
      return;
    }

    log.debug("Loading fielddeps");
    CIPAPI.rest.GET({ 
      url: '/api/versions/current/facts/fielddeps', 
      success: function(response) { 
        CIPAPI.fielddeps.lastUpdated = $.now();
        CIPAPI.fielddeps.serverRules = response.data.item[0].data;
        $(document).trigger('cipapi-fielddeps-set');
        log.debug("Field dependencies loaded");
        isLoaded = true;
        
        // Store the field dependencies to local storage if so configured
        if (CIPAPI.config.persistFieldDependencies) {
          var storageKey = 'CIPAPI.fielddeps.serverRules.' + CIPAPI.credentials.getCredentialHash();
          localStorage.setItem(storageKey, JSON.stringify(response.data.item[0].data));
          log.debug("Field dependencies stored in local storage");
        }
      },
      complete: function() {
        CIPAPI.router.validateMetadata();
      }
    });
  }

  // Execute my veto power
  $(document).on('cipapi-metadata-validate', function(evt, validation) {
    log.debug("VETO: " + (isLoaded ? 'NO' : 'YES'));
    if (!isLoaded) {
      validation.validated = false;
    }
  });
  
  // Every 5 minutes check to see if the interval for reload has elapsed and reload if so.
  // Minimum resolution is obviously 5 minutes to avoid repeated reload attempts.
  $(document).on('cipapi-timing-5min', function(event, info) {
    var timingEvent = undefined === CIPAPI.config.reloadFieldDependenciesInterval ? 'cipapi-timing-5min' : CIPAPI.config.reloadFieldDependenciesInterval;
    if (CIPAPI.timing.shouldFire(CIPAPI.fielddeps.lastUpdated, timingEvent)) {
      loadFieldDependencies();
    }
  });

  // When credentials change reload current field dependencies if not disabled
  $(document).on('cipapi-credentials-set', function() {
    // If currently NOT loaded AND local storage is enabled try and load field dependency rules
    // from local storage and do not load over the network if found.
    if (!isLoaded && CIPAPI.config.persistFieldDependencies) {
      try {
        var storageKey = 'CIPAPI.fielddeps.serverRules.' + CIPAPI.credentials.getCredentialHash();
        var storedFieldDeps = JSON.parse(localStorage.getItem(storageKey));
        if (storedFieldDeps !== null && typeof storedFieldDeps === 'object') {
          CIPAPI.fielddeps.serverRules = storedFieldDeps;
          log.debug("Field dependencies merged from local storage");

          // Simulate full load
          isLoaded = true;
          $(document).trigger('cipapi-fielddeps-set');
          CIPAPI.router.validateMetadata();

          return; // Do no more!
        }
      } catch(e) {
        log.error("Failed to load configuration from local storage");
      }
    }

    isLoaded = false;
    loadFieldDependencies();
  });
  
  // When credentials are lost, reset our configuration
  $(document).on('cipapi-credentials-reset', function() {
    CIPAPI.fielddeps.serverRules = [];
    delete CIPAPI.fielddeps.lastUpdated;
    isLoaded = false;

    // If backed by local storage delete the contents
    if (CIPAPI.config.persistFieldDependencies) {
      localStorage.removeItem('CIPAPI.fielddeps.serverRules.' + CIPAPI.credentials.getCredentialHash());
      log.debug("Local storage cleared");
    }
  });

  // Handle form field value changes
  $(document).on('cipapi-fieldvalues-change', function(event, info) {
    var fieldName = info.changeTarget ? $(info.changeTarget).attr('name') : false;

    // If no field name was provided, this is a complete re-scan in which case we need to clear the contexts
    if (fieldName === false) CIPAPI.fielddeps.contexts = [ ];

    // if a field has an index, it is most likely a multiselect checkbox. We need to process the logic a bit different
    var fieldHasIndex = fieldName ? fieldName.match(/\[\d+\]$/) !== null : false;
    var indexedFieldName = fieldHasIndex ? fieldName.replace(/\[\d+\]$/, "") : false;

    // Process each of the rules
    var rules = CIPAPI.fielddeps.getCurrentRules();
    for (var i=0; i<rules.length; i++) {
      var fieldRule = rules[i];

      // Right now we only support core object fields
      // if (fieldRule.object != 'core') continue;
      
      // If a field name was provided, filter rules by the field ... if no name provided process them all? (Initial Load)
      var encodedFieldName = CIPAPI.forms.asciiToHex(fieldRule.name);
      if (fieldName && fieldName != encodedFieldName && indexedFieldName !== encodedFieldName) continue;

      // If rule specifies a required context, and that context does not exist, then we just move on
      if (fieldRule.hasOwnProperty('context') && fieldRule.context) {
        if (CIPAPI.fielddeps.contexts.indexOf(fieldRule.context) == -1) {
          continue;
        }
      }

      // If we get here we want the value of the field...
      var fieldValue;
      var isChecked = false;
      if (fieldRule.name == 'Report Type') {
        fieldValue = info.formDefinition.reportType;
      } else if (fieldHasIndex) {
        fieldValue = $(info.formSelector + ' label.checkbox input[name="' + fieldName + '"]').next().text() || '';
        isChecked = $(info.formSelector + ' label.checkbox input[name="' + fieldName + '"]').prop('checked');
      } else {
        fieldValue = $(info.formSelector + ' select[name=' + encodedFieldName + ']').val() || 
                       $(info.formSelector +  ' input[name=' + encodedFieldName + ']:checked').val() || 
                       $(info.formSelector +  ' input[name=' + encodedFieldName + ']').val() || 
                       '';
      }

      // Equality?
      if (fieldRule.condition == 'eq' && fieldRule.value != fieldValue) continue; // Not a match
      
      // Inequality?
      if (fieldRule.condition == 'ne' && ((fieldRule.value == fieldValue && !fieldHasIndex) || (fieldRule.value != fieldValue && fieldHasIndex))) continue; // Not a match

      // Checkboxes!
      if (fieldHasIndex && ((isChecked && fieldRule.condition != 'eq') || (!isChecked && fieldRule.condition == 'eq'))) continue;

      // Hide fields ...
      if (fieldRule.hide) {
        for (var j=0; j<fieldRule.hide.length; j++) {
          var formName = CIPAPI.forms.asciiToHex(fieldRule.hide[j]);

          // Unlike the old side of the system just because a field dependency rule exists targeting 
          // a specific field does not mean that field exists here based on report type relationships.
          if (!info.jsonForm.formDesc.schema.properties[formName]) {
//            log.debug('Field does not exist at this time: ' + CIPAPI.forms.hexToAscii(formName));
            continue;
          }

          log.debug('Hiding field ' + fieldRule.hide[j] + ' (' + formName + ')');
          var field = $(info.formSelector + ' .form-control[name=' + formName + ']');
          var checkbox = false;

          if (field.length == 0) {
            // If no match, assume a radio button control
            field = $(info.formSelector + ' input[name=' + formName + ']');
            if (field.length == 0) {
              // Fallback to checkboxes then
              field = $(info.formSelector + ' input[name="' + formName + '[0]"]');
              checkbox = true;
            }
          }

          if (checkbox) {
            var div = field.closest('div');
            for (var x=0; x<div.children().length; x++) {
              field = $(info.formSelector + ' input[name="' + formName + '['+ x +']"]');
              field.val([]);  // No value when being hidden
            }
          } else {
            field.val([]); // No value when being hidden
          }

          var container = field.closest('div.form-group');
          
          // Any field that is being hidden will be marked as no longer required
          container.addClass('hide');
          if (container.hasClass('jsonform-required')) {
            container.removeClass('jsonform-required').addClass('jsonform-was-required');
            if (checkbox) {
              var div = field.closest('div');
              for (var x=0; x<div.children().length; x++) {
                field = $(info.formSelector + ' input[name="' + formName + '['+ x +']"]');
                field.removeAttr('required');
              }
            } else {
              field.removeAttr('required');
            }
          }
          
          if (info.jsonForm.formDesc.schema.properties[formName])
            info.jsonForm.formDesc.schema.properties[formName].required = false;
            if (checkbox) {
              info.jsonForm.formDesc.schema.properties[formName].minItems = 0;
            }
        }
      }
      
      // Show fields ...
      if (fieldRule.show) {
        for (var k=0; k<fieldRule.show.length; k++) {
          var formName = CIPAPI.forms.asciiToHex(fieldRule.show[k]);

          // Unlike the old side of the system just because a field dependency rule exists targeting 
          // a specific field does not mean that field exists here based on report type relationships.
          if (!info.jsonForm.formDesc.schema.properties[formName]) {
//            log.debug('Field does not exist at this time: ' + CIPAPI.forms.hexToAscii(formName));
            continue;
          }

          log.debug('Showing field ' + fieldRule.show[k] + ' (' + formName + ')');
          var field = $(info.formSelector + ' .form-control[name=' + formName + ']');
          var checkbox = false;
          
          if (field.length == 0) {
            // If no match, assume a radio button control
            field = $(info.formSelector + ' input[name=' + formName + ']');
            if (field.length == 0) {
              // Fallback to checkboxes then
              field = $(info.formSelector + ' input[name="' + formName + '[0]"]');
              checkbox = true;
            }
          }

          var container = field.closest('div.form-group');

          // Restore the original required status
          container.removeClass('hide');
          if (container.hasClass('jsonform-was-required')) {
            container.removeClass('jsonform-was-required').addClass('jsonform-required');
            if (checkbox) {
              var div = field.closest('div');
              for (var x=0; x<div.children().length; x++) {
                field = $(info.formSelector + ' input[name="' + formName + '['+ x +']"]');
                field.attr('required', 'required');
              }
            } else {
              field.attr('required', 'required');
            }
            
            if (info.jsonForm.formDesc.schema.properties[formName])
              info.jsonForm.formDesc.schema.properties[formName].required = true;
              if (checkbox) {
                info.jsonForm.formDesc.schema.properties[formName].minItems = 1;
              }
          }
          
          // If fieldName is false, this is a first pass full initialization - attempt to set field value
          if (!fieldName && info.jsonForm.formDesc.value[formName]) {
            if (field.length > 1) {
              // Radio group...
              field.find("[value='" + info.jsonForm.formDesc.value[formName] + "']").prop('checked', true);
            } else {
              // Single form control (input, select, etc)
              field.val(info.jsonForm.formDesc.value[formName]);
            }
            if (checkbox) {
              var div = field.closest('div');
              for (var x=0; x<div.children().length; x++) {
                field = $(info.formSelector + ' input[name="' + formName + '['+ x +']"]');
                if (info.jsonForm.formDesc.value[formName].indexOf(field.siblings().text()) > -1) {
                  field.prop('checked', true);
                }
              }
            }
          }
        }
      }
      
      // Change field values
      if (fieldRule.values) {
        for (var l=0; l<fieldRule.values.length; l++) {
          var formName = CIPAPI.forms.asciiToHex(fieldRule.values[l].name);

          // Unlike the old side of the system just because a field dependency rule exists targeting 
          // a specific field does not mean that field exists here based on report type relationships.
          if (!info.jsonForm.formDesc.schema.properties[formName]) {
            log.debug('Field does not exist at this time: ' + CIPAPI.forms.hexToAscii(formName));
            continue;
          }

          log.debug('Changing values for field ' + fieldRule.values[l].name + ' (' + formName + ')');
          var field = $(info.formSelector + ' .form-control[name=' + formName + ']');

          info.jsonForm.formDesc.schema.properties[formName].enum = [];
          field.empty();

          // Our select fields always allow for a no selection option so we need to inject this
          field.append($('<option></option>'));

          $.each(fieldRule.values[l].values, function(key, val) {
            field.append($('<option></option>').attr('value', key).text(key));
            info.jsonForm.formDesc.schema.properties[formName].enum.push(key);
          });
          
          field.val([]); // No value after change

          // If fieldName is false, this is a first pass full initialization - attempt to set field value
          if (!fieldName && info.jsonForm.formDesc.value[formName]) {
            if (field.length > 1) {
              // Radio group...
              field.find("[value='" + info.jsonForm.formDesc.value[formName] + "']").prop('checked', true);
            } else {
              // Single form control (input, select, etc)
              field.val(info.jsonForm.formDesc.value[formName]);
            }
          }
        }
      }

      // Set Context
      if (fieldRule.setctx) {
        for (var l=0; l<fieldRule.setctx.length; l++) {
          if (CIPAPI.fielddeps.contexts.indexOf(fieldRule.setctx[l]) == -1) {
            CIPAPI.fielddeps.contexts.push(fieldRule.setctx[l]);
            log.debug('Setting context "' + fieldRule.setctx[l] + '" [Rule ' + i + ']');
          }
        }
      }

      // Unset Context
      if (fieldRule.unsetctx) {
        for (var l=0; l<fieldRule.unsetctx.length; l++) {
          var ctxidx = CIPAPI.fielddeps.contexts.indexOf(fieldRule.unsetctx[l]);
          if (ctxidx != -1) {
            CIPAPI.fielddeps.contexts.splice(ctxidx, 1);
            log.debug('Removing context "' + fieldRule.unsetctx[l] + '" [Rule ' + i + ']');
          }
        }
      }


    }    
  });
})(jQuery, window);
