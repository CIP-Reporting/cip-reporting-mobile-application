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
  CIPAPI.customlogs = {};

  var log = log4javascript.getLogger("CIPAPI.customlogs");

  var isLoaded = false;
  
  CIPAPI.customlogs.collection = { lastUpdated: 0, customlogs: {} };
  
  CIPAPI.customlogs.reverse = function() {
    var reversed = {};
    if (!isLoaded) return reversed;

    $.each(CIPAPI.customlogs.collection.customlogs, function(customLog, reportTypes) {
      $.each(reportTypes, function(i, reportType) {
        if (!reversed[reportType]) reversed[reportType] = [];
        reversed[reportType].push(customLog);
      });
    });

    return reversed;
  }

  function loadCustomLogs() {
    if (!CIPAPI.credentials.areValid()) {
      log.debug("No credentials, defering attempts to load");
      return;
    }

    log.debug("Loading Custom Logs");
    CIPAPI.rest.GET({ 
      url: CIPAPI.config.scheduleURL || '/api/versions/current/facts/customlogs', 
      success: function(response) { 
        CIPAPI.customlogs.collection.lastUpdated = $.now();
        CIPAPI.customlogs.collection.customlogs = response.data.item[0].data;
        $(document).trigger('cipapi-customlogs-set');
        log.debug("Custom logs loaded");
        log.debug(JSON.stringify(CIPAPI.customlogs.collection.customlogs));
        isLoaded = true;
        
        // Store the custom logs to local storage if so configured
        if (CIPAPI.config.persistCustomLogs) {
          var storageKey = 'CIPAPI.customlogs.' + CIPAPI.credentials.getCredentialHash();
          localStorage.setItem(storageKey, JSON.stringify(CIPAPI.customlogs.collection));
          log.debug("Custom logs stored in local storage");
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
    var timingEvent = undefined === CIPAPI.config.reloadCustomLogsInterval ? 'cipapi-timing-5min' : CIPAPI.config.reloadCustomLogsInterval;
    if (CIPAPI.timing.shouldFire(CIPAPI.customlogs.collection.lastUpdated, timingEvent)) {
      loadCustomLogs();
    }
  });

  // When credentials change reload current custom logs if not disabled
  $(document).on('cipapi-credentials-set', function() {
    CIPAPI.customlogs.collection = { lastUpdated: 0, customlogs: {} };

    // If currently NOT loaded AND local storage is enabled try and load translation values 
    // from local storage and do not load over the network if found.
    if (!isLoaded && CIPAPI.config.persistCustomLogs) {
      try {
        var storageKey = 'CIPAPI.customlogs.' + CIPAPI.credentials.getCredentialHash();
        var storedCustomLogs = JSON.parse(localStorage.getItem(storageKey));
        if (storedCustomLogs !== null && typeof storedCustomLogs === 'object') {
          CIPAPI.customlogs.collection = storedCustomLogs;
          log.debug("Custom logs merged from local storage");

          // Simulate full load
          isLoaded = true;
          $(document).trigger('cipapi-customlogs-set');
          CIPAPI.router.validateMetadata();

          return; // Do no more!
        }
      } catch(e) {
        log.error("Failed to load configuration from local storage");
      }
    }

    isLoaded = false;
    loadCustomLogs();
  });
  
  // When credentials are lost, reset our configuration
  $(document).on('cipapi-credentials-reset', function() {
    CIPAPI.customlogs.collection = { lastUpdated: 0, customlogs: {} };
    isLoaded = false;

    // If backed by local storage delete the contents
    if (CIPAPI.config.persistCustomLogs) {
      localStorage.removeItem('CIPAPI.customlogs.' + CIPAPI.credentials.getCredentialHash());
      log.debug("Local storage cleared");
    }
  });
})(window);
