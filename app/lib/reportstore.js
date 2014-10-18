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

  // Since packaging images requires call backs we have to track the number of images
  // currently being processed and defer any automated attempts of sending reports
  // from happening while one is already under way...  We also have to track the 
  // images loading so we know when the final one is added to the form to kick the 
  // send.
  var imagesBeingQueued = 0;
  
  // Statistics
  var statsGroup = 'Report Store';
  CIPAPI.stats.total(statsGroup, 'Total Stored', 0);
  CIPAPI.stats.total(statsGroup, 'Total Sent',   0);
  CIPAPI.stats.total(statsGroup, 'Total Images', 0);

  CIPAPI.stats.total(statsGroup, 'Last Attempt', 'Never');
  CIPAPI.stats.total(statsGroup, 'Last Check',   'Never');
  CIPAPI.stats.total(statsGroup, 'Last Success', 'Never');

  $(document).on('cipapi-stats-fetch', function() {
    CIPAPI.stats.total(statsGroup, 'Total Pending', CIPAPI.reportstore.getNumberOfStoredReports());
  });
  
  // Store a report  
  CIPAPI.reportstore.storeReport = function(reportData) {
    var storageKey = 'CIPAPI.reportstore.' + CIPAPI.credentials.getCredentialHash();
    
    var reportStore = null;
    try {
      reportStore = JSON.parse(localStorage.getItem(storageKey));
      if (!Array.isArray(reportStore)) reportStore = new Array();
    } catch(e) {
      reportStore = new Array();
    }

    reportStore.push(reportData);
    localStorage.setItem(storageKey, JSON.stringify(reportStore));
    
    CIPAPI.stats.count(statsGroup, 'Total Stored');

    log.debug("Stored new report");
    
    // Let the world know...
    $(document).trigger('cipapi-reportstore-add');
    $(document).trigger('cipapi-reportstore-change');
  }

  // Get the number of stored reports  
  CIPAPI.reportstore.getNumberOfStoredReports = function() {
    var storageKey = 'CIPAPI.reportstore.' + CIPAPI.credentials.getCredentialHash();
    
    var reportStore = null;
    try {
      reportStore = JSON.parse(localStorage.getItem(storageKey));
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
        reportStore = JSON.parse(localStorage.getItem(storageKey));
        if (!Array.isArray(reportStore)) reportStore = new Array();
      } catch(e) {
        reportStore = new Array();
      }
      
      // Make sure there is still work to do
      if (reportStore.length == 0) {
        log.debug("No more reports to send");
        return;
      }

      // Images are currently queuing for transmission
      if (imagesBeingQueued != 0) {
        log.debug("Images currently queueing - not sending");
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
          data: formData,
          success: function(response) {
            CIPAPI.stats.timestamp(statsGroup, 'Last Success');
            log.debug("Report sent");
            
            // Remove the report from the report store
            reportStore.shift();
            localStorage.setItem(storageKey, JSON.stringify(reportStore));
            
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

      // Add in images which were serialized
      $.each(reportStore[0].serializedImages, function(index, stored) {
        log.debug('Adding image (' + stored.mimeType + '): ' + stored.imageURL);
        imagesBeingQueued++;

        CIPAPI.stats.count(statsGroup, 'Total Images');

        // Verify mime type matches up to file name because some URLs do not and the server
        // deterines the mime type by the inbound file name.  The mime type known here is
        // most accurate because it was parsed from a data url with embedded mime type. The
        // file name can be really weird especially when grabbing from the library or album.
        // If they do not match up, generate a new file name and matching extension.
        if (stored.mimeType != CIPAPI.mime.getMimeTypeForFileName(stored.fileName)) {
          var newExt = CIPAPI.mime.getExtensionForMimeType(stored.mimeType);
          var timeStamp = Math.round(new Date().getTime() / 1000);
          stored.fileName = timeStamp + newExt;
          log.debug("Changed file name to " + stored.fileName);
        }
        
        // The phonegap way...
        if (typeof window.resolveLocalFileSystemURL != 'undefined') {
          window.resolveLocalFileSystemURL(stored.imageURL, function(fileEntry) { 
            fileEntry.file(function(file) {
              var reader = new FileReader();
              reader.onloadend = function(evt) {
                var matches   = evt.target.result.match(/^data:(.*?);base64,(.*)$/);
                var imageData = matches[2];

                formData.append("file[]", CIPAPI.forms.b64toBlob(imageData, stored.mimeType), stored.fileName);
                log.debug('Added image (' + stored.mimeType + '): ' + stored.imageURL);
                imagesBeingQueued--;
                    
                if (imagesBeingQueued == 0) {
                  log.debug("All images loaded - sending report");
                  sendCurrentReport();
                }
              };
              reader.readAsDataURL(file);
            }, function(err) {
              imagesBeingQueued--;
              log.error("ERROR CODE: " + err.code);
            });
          }, function(err) {
            imagesBeingQueued--;
            log.error("ERROR CODE: " + err.code);
          }); 
        }
        
        // Else the old fashioned way which does not seem to work for phonegap anyhow
        else {
          var deferredImage = $('<img />');
          
          deferredImage.on('load', function(evt) {
            // Convert to data URI and parse then add to existing form
            var dataURL   = CIPAPI.forms.imageToDataURL(deferredImage.get(0));
            var matches   = dataURL.match(/^data:(.*?);base64,(.*)$/);
            var imageData = matches[2];

            formData.append("file[]", CIPAPI.forms.b64toBlob(imageData, stored.mimeType), stored.fileName);
            log.debug('Added image: ' + stored.imageURL);
            imagesBeingQueued--;
          
            if (imagesBeingQueued == 0) {
              log.debug("All images loaded - sending report");
              sendCurrentReport();
            }
          });
          
          deferredImage.attr('src', stored.imageURL);
        }
      });
      
      // Kick the send now if there are no deferred image loads
      if (imagesBeingQueued == 0) {
        log.debug("Sending without deferred image load");
        sendCurrentReport();
      }
    }
    
    sendNextReport(); // Kick it off!
  }
  
})(window);
