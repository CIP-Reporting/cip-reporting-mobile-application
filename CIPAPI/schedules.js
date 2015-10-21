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
  CIPAPI.schedules = {};

  var log = log4javascript.getLogger("CIPAPI.schedules");

  var isLoaded = false;
  
  CIPAPI.schedules.collection = { lastUpdated: 0, schedules: {} };
  
  function loadSchedules() {
    if (!CIPAPI.credentials.areValid()) {
      log.debug("No credentials, defering attempts to load");
      return;
    }

    log.debug("Loading schedules");
    CIPAPI.rest.GET({ 
      url: CIPAPI.config.scheduleURL || '/api/versions/current/facts/schedules', 
      success: function(response) { 
        CIPAPI.schedules.collection.lastUpdated = $.now();
        CIPAPI.schedules.collection.schedules = response.data.item[0].data;
        $(document).trigger('cipapi-schedules-set');
        log.debug("Schedules loaded");
        log.debug(JSON.stringify(CIPAPI.schedules.collection.schedules));
        isLoaded = true;
        
        // Store the schedules to local storage if so configured
        if (CIPAPI.config.persistSchedules) {
          var storageKey = 'CIPAPI.schedules.' + CIPAPI.credentials.getCredentialHash();
          localStorage.setItem(storageKey, JSON.stringify(CIPAPI.schedules.collection));
          log.debug("Schedules stored in local storage");
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
    var timingEvent = undefined === CIPAPI.config.reloadSchedulesInterval ? 'cipapi-timing-5min' : CIPAPI.config.reloadSchedulesInterval;
    if (CIPAPI.timing.shouldFire(CIPAPI.schedules.collection.lastUpdated, timingEvent)) {
      loadSchedules();
    }
  });

  // When credentials change reload current schedules if not disabled
  $(document).on('cipapi-credentials-set', function() {
    CIPAPI.schedules.collection = { lastUpdated: 0, schedules: {} };

    // If currently NOT loaded AND local storage is enabled try and load translation values 
    // from local storage and do not load over the network if found.
    if (!isLoaded && CIPAPI.config.persistSchedules) {
      try {
        var storageKey = 'CIPAPI.schedules.' + CIPAPI.credentials.getCredentialHash();
        var storedSchedules = JSON.parse(localStorage.getItem(storageKey));
        if (storedSchedules !== null && typeof storedSchedules === 'object') {
          CIPAPI.schedules.collection = storedSchedules;
          log.debug("Schedules merged from local storage");

          // Simulate full load
          isLoaded = true;
          $(document).trigger('cipapi-schedules-set');
          CIPAPI.router.validateMetadata();

          return; // Do no more!
        }
      } catch(e) {
        log.error("Failed to load configuration from local storage");
      }
    }

    isLoaded = false;
    loadSchedules();
  });
  
  // When credentials are lost, reset our configuration
  $(document).on('cipapi-credentials-reset', function() {
    CIPAPI.schedules.collection = { lastUpdated: 0, schedules: {} };
    isLoaded = false;

    // If backed by local storage delete the contents
    if (CIPAPI.config.persistSchedules) {
      localStorage.removeItem('CIPAPI.schedules.' + CIPAPI.credentials.getCredentialHash());
      log.debug("Local storage cleared");
    }
  });
})(window);
