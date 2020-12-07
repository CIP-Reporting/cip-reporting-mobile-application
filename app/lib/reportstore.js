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

  var log = CIPAPI.logger.getLogger("CIPAPI.reportstore");

  // Statistics
  var statsGroup = 'Report Store';
  CIPAPI.stats.total(statsGroup, 'Total Stored', 0);
  CIPAPI.stats.total(statsGroup, 'Total Sent',   0);

  CIPAPI.stats.total(statsGroup, 'Last Attempt', 'Never');
  CIPAPI.stats.total(statsGroup, 'Last Check',   'Never');
  CIPAPI.stats.total(statsGroup, 'Last Success', 'Never');
  CIPAPI.stats.total(statsGroup, 'Last Fail',    'Never');

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
  
  // Kick send if reports pending when we go back online
  $(document).on('cipapi-online', function() {
    if (CIPAPI.reportstore.getNumberOfStoredReports() > 0) {
      CIPAPI.reportstore.sendReports();
    }
  });
  
  // Try and send when credentials are set / sync
  $(document).on('cipapi-credentials-set', function(event, info) {
    $(document).one('cipapi-rest-inactive', function(event, info) {
      CIPAPI.reportstore.sendReports();
    });
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
    
    // Do not send if we are offline
    if (CIPAPI.online.isOffline()) {
      return;
    }
    
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
    // Go get the store
    var storageKey = 'CIPAPI.reportstore.' + CIPAPI.credentials.getCredentialHash();
    var reportStore = null;
    try {
      reportStore = CIPAPI.storage.getItem(storageKey);
      if (!Array.isArray(reportStore)) reportStore = new Array();
    } catch(e) {
      reportStore = new Array();
    }
    var currentReport = reportStore.length ? 0 : null;

    function sendNextReport() {
      // Make sure there is still work to do
      if (currentReport === null || currentReport >= reportStore.length) {
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
          url: reportStore[currentReport].destinationURL,
          query: reportStore[currentReport].destinationQuery,
          data: formData,
          success: function(response) {
            var saveStatus = response.data.item[0].data;
            if (saveStatus != 'SUCCESS') {
              CIPAPI.stats.timestamp(statsGroup, 'Last Fail');
              currentReport = currentReport + 1;
              log.error(saveStatus);
            } else {
              CIPAPI.stats.timestamp(statsGroup, 'Last Success');
              log.debug("Report sent");
              
              // Remove the successfully-sent report from the report store
              reportStore.splice(currentReport, 1);

              // Let the world know...
              $(document).trigger('cipapi-reportstore-remove');
              $(document).trigger('cipapi-reportstore-change');
            }
 
            CIPAPI.storage.setItem(storageKey, reportStore);
              
            // And do it again... or NOT
            if (currentReport < reportStore.length) {
              sendNextReport();
            } else {
              if (!reportStore.length) $(document).trigger('cipapi-reportstore-empty');
            }
          }
        });
      }

      // Compose into form data
      $.each(reportStore[currentReport].serializedData, function(key, val) {
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
      log.debug('Adding captured images');
      $.each(reportStore[currentReport].serializedImages, function(index, serializedImage) {
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
