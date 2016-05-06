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
  CIPAPI.contextmenu = { };

  var log = log4javascript.getLogger("CIPAPI.contextmenu");

  // Helper function to create the context menu
  function createContextMenu() {
    var menuHTML = '' +
      '<!-- Modal -->' +
      '<div class="modal" id="cipapi-application-general-dialog" role="dialog">' +
      '  <div class="modal-dialog">' +
      '    <!-- Modal content-->' +
      '    <div class="modal-content">' +
      '      <div class="modal-header">' +
      '        <button type="button" class="close" data-dismiss="modal">&times;</button>' +
      '        <h4 class="modal-title">Modal Header</h4>' +
      '      </div>' +
      '      <div class="modal-body">Modal Body</div>' +
      '      <div class="modal-footer">' +
      '        <button type="button" class="btn btn-default" data-dismiss="modal">' + CIPAPI.translations.translate('Close') + '</button>' +
      '      </div>' +
      '    </div>' +
      '  </div>' +
      '</div>';
      
    log.debug('Lazy initializing context menu');
    $('div#container').append(menuHTML);
  }

  // Helper function to store and kick off a report send attempt
  function saveReport(childReport) {
    CIPAPI.reportstore.storeReport(childReport);
    CIPAPI.reportstore.sendReports();
    CIPAPI.router.route();
  }
  
  function childReportEnable(childReport) {
    bootbox.confirm(CIPAPI.translations.translate('Are you sure you want to enable this form?'), function(result) {
      if (!result) return;
      childReport.formMetadata.isDisabled = false;
      saveReport(childReport);
    });
  }
  
  function childReportDisable(childReport) {
    bootbox.confirm(CIPAPI.translations.translate('Are you sure you want to disable this form?'), function(result) {
      if (!result) return;
      childReport.formMetadata.isDisabled = true;
      saveReport(childReport);
    });
  }
  
  function childReportDuplicate(childReport) {
    bootbox.confirm(CIPAPI.translations.translate('Are you sure you want to duplicate this form?'), function(result) {
      if (!result) return;
      
      var newReport = jQuery.extend(true, {}, childReport);
      newReport.serializedImages = [];
      newReport.mobileMetadata = [];
      
      newReport.serializedData = {
        reportRelUUID: childReport.serializedData.reportRelUUID,
        reportUUID: CIPAPI.uuid.get()
      };
      
      newReport.formMetadata.isDisabled = false;
      newReport.formMetadata.nameSuffix = '';
      newReport.formMetadata.canRemove = true; // Assume we can remove if added manually
      newReport.formMetadata.percentComplete = 0;
      
      saveReport(newReport);
    });
  }
  
  function childReportDelete(childReport) {
    bootbox.confirm(CIPAPI.translations.translate('Are you sure you want to delete this form?'), function(result) {
      if (!result) return;
      childReport.formMetadata.isRemoved = true;
      saveReport(childReport);
    });
  }
  
  function childReportRename(childReport) {
    bootbox.prompt({
      title: CIPAPI.translations.translate('Rename Form'),
      value: childReport.formMetadata.nameSuffix,
      callback: function(result) {
        if (result === null) return;
        childReport.formMetadata.nameSuffix = result;
        saveReport(childReport);
      }
    });
  }
  
  // Case context menu
  $(document).on('cipapi-case-form-context-menu', function(event, info) {
    // info.case info.form info.uuid
    var childReport = CIPAPI.casestore.getChildReportForCaseByChildUUID(info.case, info.uuid);
    if (childReport == false) {
      log.error("Failed to find child report for case on context menu");
      return;
    }
    
    var dialog = $('div#container div#cipapi-application-general-dialog');
    if (dialog.length == 0) createContextMenu();
    
    $('#cipapi-application-general-dialog').removeClass().addClass('modal cipapi-case-context-menu');
    $('#cipapi-application-general-dialog h4.modal-title').text(CIPAPI.translations.translate('Available Actions'));

    var html = ''; var numButtons = 0;
    html += '<div class="list-group">';
    
    if (childReport.formMetadata.canDisable) {
      numButtons++;
      if (childReport.formMetadata.isDisabled) {
        html += '  <button type="button" data-action="enable" class="list-group-item"><i class="fa fa-thumbs-o-up"></i> Enable Form</button>';
      } else {
        html += '  <button type="button" data-action="disable" class="list-group-item"><i class="fa fa-thumbs-o-down"></i> Disable Form</button>';
      }
    }
    
    if (childReport.formMetadata.canDuplicate) {
      numButtons++;
      html += '  <button type="button" data-action="duplicate" class="list-group-item"><i class="fa fa-files-o"></i> Duplicate Form</button>';
    }
    
    if (childReport.formMetadata.canRemove) {
      numButtons++;
      html += '  <button type="button" data-action="delete" class="list-group-item"><i class="fa fa-trash-o"></i> Delete Form</button>';
    }

    if (childReport.formMetadata.canRename) {
      numButtons++;
      html += '  <button type="button" data-action="rename" class="list-group-item"><i class="fa fa-pencil-square-o"></i> Rename Form</button>';
    }
    
    html += '</div>';
    $('#cipapi-application-general-dialog div.modal-body').find('> *').remove();
    $('#cipapi-application-general-dialog div.modal-body').html(html);
    
    if (numButtons > 0) {
      $('#cipapi-application-general-dialog').modal();
      
      // Handle button clicks
      $('#cipapi-application-general-dialog button').on('click', function(e) {
        $('#cipapi-application-general-dialog').modal('hide');
        
        switch($(this).attr('data-action')) {
          case    'enable': childReportEnable(childReport);    break;
          case   'disable': childReportDisable(childReport);   break;
          case 'duplicate': childReportDuplicate(childReport); break;
          case    'delete': childReportDelete(childReport);    break;
          case    'rename': childReportRename(childReport);    break;
        }
      });
    }
  });
  
})(window);
