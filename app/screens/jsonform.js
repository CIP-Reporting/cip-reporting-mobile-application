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

  var log = log4javascript.getLogger("CIPAPI.jsonform");

  // Navigating away have my children clean up after themselves
  $(document).on('cipapi-unbind', function() {
    log.debug("Cleaning up my children");
    $(document).trigger('cipapi-unbind-main');
    $('div#main-content-area > *').remove();
  });

  // Shared resizing event handler
  $(document).on('cipapi-resize-iframe', function() {
    // Set the container height
    var contentHeight = $('div#main-content-area').height();
    window.parent.jQuery('#iframeapp').height(contentHeight);
  });
  
  // Shared resizing event handler
  $(document).on('cipapi-resize-iframe-and-scroll-top', function() {
    // Set the container height
    var contentHeight = $('div#main-content-area').height();
    window.parent.jQuery('#iframeapp').height(contentHeight);

//    window.parent.scrollWindowToTop();
  });

  
  $(document).on('cip-json-forms-apply-behaviors', function(event, info) {
    function hideElement(el) {
      el.css({ position: 'absolute', 'left': '-2000px', 'width': '1px', 'height': '1px' });
    }
    
    // JS Trees
    $('div.cip-json-forms-tree-field').each(function(i, o) {
      var treedivid = 'cip-json-form-tree-instance' + i;
      var descdivid = 'cip-json-form-tree-desc-instance' + i;
      var ta = $(this).find('textarea');
      var data = JSON.parse(ta.val());
      ta.parent().removeClass('col-sm-9').addClass('col-sm-12');
        ta.after('<div class="container-fluid"><div class="row"><div class="col-md-6"><div id="' + treedivid + '" class="cip-json-forms-tree"></div></div><div class="col-md-6"><div id="' + descdivid + '" class="cip-json-forms-tree-desc"></div></div></div></div>');

      hideElement(ta);
      $('#' + treedivid).jstree({
         'core' : {
            'data': data.treedesc
         },
         'checkbox' : {
         },
         'plugins': [ 'checkbox' ]
      });

      // Once the tree is fully loaded, select the existing nodes
      $('#' + treedivid).on('ready.jstree', function(e, d) {
         $('#' + treedivid).jstree('select_node', data.selected, true);
      });

      // Create an event so that we can track changes
      $('#' + treedivid).on('changed.jstree', function(e, data) {
         $('#' + descdivid).html('<h3>' + data.node.text + '</h2>' + data.node.original.desc);
         var nd = JSON.parse(ta.val());
         nd.selected = data.instance.get_selected();
         ta.val(JSON.stringify(nd));
      });
    });
  });
  
  $(document).on('cipapi-handle-jsonform', function(event, info) {
    var formName = info.params.action;
    
    var form = false;
    
    if (formName == '.edit') {
      form = CIPAPI.context.get(info.params.context);
      formName = form.data.form_name;
    } else {
      for (var i=0; i<CIPAPI.config.jsonForms.length; i++) {
        if (CIPAPI.config.jsonForms[i]['Name'] == formName) {
          form = CIPAPI.config.jsonForms[i]['Form'];
          
          // Generate new UUID
          form.data.form_guid = CIPAPI.uuid.get();
        }
      }
    }
    
    if (false === form) {
      $('div#jsonform-content-area').html('<h2>Failed to Locate Form Definition</h2>');
      return;
    }

    // Tie into the wizard buttons
    if (form.view.wizard) {
      form.view.wizard.buttons = {
        "submit": {
          "click": function(e) {
            log.debug('Submit');
            
            var formData = this.getValue();
            $(document).trigger('cip-json-forms-before-submit', formData);
            
            var payload = {};
            
            // Inject the reportUUID from form_guid
            payload['reportUUID'] = formData['form_guid'];
            
            payload[CIPAPI.forms.asciiToHex('Form Data')] = JSON.stringify(formData);
            
            var newJsonForm = {
                       formName: formName,
                 formDefinition: form,
              fieldDependencies: [],
                 serializedData: payload,
               serializedImages: CIPAPI.images.get(),
                 destinationURL: '/api/versions/current/integrations/' + escape(CIPAPI.config.useSingleURL ? CIPAPI.config.overrideIntegration : formName),
               destinationQuery: CIPAPI.config.useSingleURL ? formName : false,
                 mobileMetadata: CIPAPI.stats.fetch(),
                   formMetadata: {
                             version: 1,
                          canDisable: false,
                        canDuplicate: false,
                           canRemove: false,
                           canRename: false,
                          isDisabled: false,
                           isRemoved: false,
                           nameSuffix: '',
                     percentComplete: 0
                   }
            };
            
            // Store and kick off a report send attempt
            CIPAPI.reportstore.storeReport(newJsonForm);
            CIPAPI.reportstore.sendReports();
            
            // Go somewhere...
            CIPAPI.navbar.goBack();
          }
        }
      }
    }
    
    $("div#jsonform-content-area").alpaca({
            "data": form.data,
          "schema": form.schema,
         "options": form.options,
            "view": form.view,
      "postRender": function(control) {
        $(document).trigger('cip-json-forms-apply-behaviors');
//        $(document).trigger('cipapi-resize-iframe');
 
        // Watch for tab changes and resize / scroll to top
        $(document).on('cip-json-forms-wizard-tab-change', function() {
          var percentParentWidth = $('.alpaca-wizard-progress-bar .progress').width();
          var percentWidth = $('.alpaca-wizard-progress-bar .progress .progress-bar').width();
          var percent = parseInt((percentWidth / percentParentWidth) * 100, 10);

          log.debug('Tab Change - ' + percent + '%');
          
          var formData = control.getValue();
          $(document).trigger('cip-json-forms-before-submit', formData);
          $(document).trigger('cips-ui-callback', JSON.stringify({ 'type': 'update', 'percent': '' + percent, 'payload': formData }, null, "  "));

          setTimeout(function() { $(document).trigger('cipapi-resize-iframe-and-scroll-top'); }, 1);
        });

        // Watch for validation failures on attempts to progress / submit the wizard
        $(document).on('cip-json-forms-failed-validation', function() {
          log.debug('Validation Failed');
          window.parent.alert(CIPAPI.translations.translate('Required fields on this form have not been completed.'));
        });
 
        // Fix up wizard buttons
        $('.alpaca-wizard-buttons button[data-alpaca-wizard-button-key="next"]').attr('class', 'btn btn-lg btn-primary cip-json-forms-wizard-next-btn').html(
          CIPAPI.translations.translate('Next Page') + '<span class="glyphicon glyphicon-chevron-right"></span>'
        );
        
        $('.alpaca-wizard-buttons button[data-alpaca-wizard-button-key="previous"]').attr('class', 'btn btn-lg btn-primary cip-json-forms-wizard-previous-btn').html(
          '<span class="glyphicon glyphicon-chevron-left"></span>' + CIPAPI.translations.translate('Previous Page')
        );
        
        $('.alpaca-wizard-buttons button[data-alpaca-wizard-button-key="submit"]').attr('class', 'btn btn-lg btn-success cip-json-forms-wizard-submit-btn').html(
          '<span class="glyphicon glyphicon-ok"></span>' + CIPAPI.translations.translate('Complete Application')
        );
        
        // Left Nav
        if (true) {
          var maxWidth = 200; // Min width of 200
          $(this).find('div.alpaca-wizard-nav ul.navbar-nav li').each(function() {
            maxWidth = Math.max(maxWidth, $(this).outerWidth());
          });
//          $('div.alpaca-wizard-nav ul.navbar-nav li').width(maxWidth);

          $('div.alpaca-wizard-nav').addClass('cip-json-forms-left-nav');

//          $('div.alpaca-wizard > div:not(.cip-json-forms-left-nav)').css('margin-left', (maxWidth + 30) + 'px');
        }
      }
    });
  });
  
})(window);
