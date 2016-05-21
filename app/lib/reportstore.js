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
  CIPAPI.reportstore = {};

  var log = log4javascript.getLogger("CIPAPI.reportstore");

  // Statistics
  var statsGroup = 'Report Store';
  CIPAPI.stats.total(statsGroup, 'Total Stored', 0);
  CIPAPI.stats.total(statsGroup, 'Total Sent',   0);

  CIPAPI.stats.total(statsGroup, 'Last Attempt', 'Never');
  CIPAPI.stats.total(statsGroup, 'Last Check',   'Never');
  CIPAPI.stats.total(statsGroup, 'Last Success', 'Never');

  $(document).on('cipapi-stats-fetch', function() {
    CIPAPI.stats.total(statsGroup, 'Total Pending', CIPAPI.reportstore.getNumberOfStoredReports());
  });
  
  // Passively try and send reports
  $(document).on('cipapi-timing-event', function(event, info) {
    var desiredTick = undefined === CIPAPI.config.sendReportsInterval ? 'cipapi-timing-1min' : CIPAPI.config.sendReportsInterval;
    if (desiredTick == info) {
      // Kick off a report send attempt
      CIPAPI.reportstore.sendReports();
    }
  });
  
  // Store a report  
  CIPAPI.reportstore.storeReport = function(reportData, silent) {
    var storageKey = 'CIPAPI.reportstore.' + CIPAPI.credentials.getCredentialHash();
    
    var reportStore = null;
    try {
      reportStore = CIPAPI.storage.getItem(storageKey);
      if (!Array.isArray(reportStore)) reportStore = new Array();
    } catch(e) {
      reportStore = new Array();
    }

    reportStore.push(reportData);
    CIPAPI.storage.setItem(storageKey, reportStore);
    
    CIPAPI.stats.count(statsGroup, 'Total Stored');

    log.debug("Stored new report");
    
    if (silent) return; // Throw no events
    
    // Let the world know...
    $(document).trigger('cipapi-reportstore-add', { reportData: reportData });
    $(document).trigger('cipapi-reportstore-change');
  }

  // Get the number of stored reports  
  CIPAPI.reportstore.getNumberOfStoredReports = function() {
    var storageKey = 'CIPAPI.reportstore.' + CIPAPI.credentials.getCredentialHash();
    
    var reportStore = null;
    try {
      reportStore = CIPAPI.storage.getItem(storageKey);
      if (!Array.isArray(reportStore)) reportStore = new Array();
    } catch(e) {
      reportStore = new Array();
    }
    
    if (reportStore.length > 0) {
      log.debug("Total stored reports: " + reportStore.length);
    }
    
    return reportStore.length;
  }

  // Try and send any stored reports
  CIPAPI.reportstore.sendReports = function() {
    CIPAPI.stats.timestamp(statsGroup, 'Last Check');
    
    // Do not send if we have no reports to send
    if (CIPAPI.reportstore.getNumberOfStoredReports() == 0) {
      return;
    }

    // Do not send if we do not have verified credentials
    if (!CIPAPI.credentials.areValid()) {
      log.debug("No validated credentials");
      return;
    }
    
    // Only send if the REST engine is idle
    if (!CIPAPI.rest.isIdle()) {
      log.debug("REST engine is not idle");
      return;
    }
    
    var storageKey = 'CIPAPI.reportstore.' + CIPAPI.credentials.getCredentialHash();

    function sendNextReport() {
      // Go get the store
      var reportStore = null;
      try {
        reportStore = CIPAPI.storage.getItem(storageKey);
        if (!Array.isArray(reportStore)) reportStore = new Array();
      } catch(e) {
        reportStore = new Array();
      }
      
      // Make sure there is still work to do
      if (reportStore.length == 0) {
        log.debug("No more reports to send");
        return;
      }

      CIPAPI.stats.timestamp(statsGroup, 'Last Attempt');
      
      // Build a new form to send
      var formData = new FormData();
      
      // Closure for sending the current form
      function sendCurrentReport() {
        CIPAPI.stats.count(statsGroup, 'Total Sent');
        
        CIPAPI.rest.post({
          url: reportStore[0].destinationURL,
          query: reportStore[0].destinationQuery,
          data: formData,
          success: function(response) {
            CIPAPI.stats.timestamp(statsGroup, 'Last Success');
            log.debug("Report sent");
            
            // Remove the report from the report store
            reportStore.shift();
            CIPAPI.storage.setItem(storageKey, reportStore);
            
            // Let the world know...
            $(document).trigger('cipapi-reportstore-remove');
            $(document).trigger('cipapi-reportstore-change');
            
            // And do it again... or NOT
            if (reportStore.length > 0) {
              sendNextReport();
            } else {
              $(document).trigger('cipapi-reportstore-empty');
            }
          }
        });
      }

      // Compose into form data
      $.each(reportStore[0].serializedData, function(key, val) {
        log.debug('Adding form value: ' + key + ' -> ' + val);
        formData.append(key, val);
      });

      // Embed form metadata
      log.debug('Adding form metadata');
      formData.append('__form_metadata', JSON.stringify(reportStore[0].formMetadata));

      // Embed mobile metadata
      log.debug('Adding mobile metadata');
      formData.append('__mobile_metadata', JSON.stringify(reportStore[0].mobileMetadata));
      
      // Add in images which were serialized
      $.each(serializedImages, function(index, serializedImage) {
        if (serializedImage.formType == 'jsonfile') {
          log.debug('Adding image as jsonfile for submission');
          
          formData.append('jsonfile[]', JSON.stringify({
            mimeType: serializedImage.mimeType,
            fileName: serializedImage.fileName,
             b64File: serializedImage.b64File
          }));
        } else {
          log.debug('Adding image as file for submission');
          
          formData.append("file[]", serializedImage.content, serializedImage.fileName);
        }
      });
      
      // Kick the send
      log.debug("Sending...");
      sendCurrentReport();
    }
    
    sendNextReport(); // Kick it off!
  }
  
})(window);
