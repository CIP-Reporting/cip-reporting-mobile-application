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
  CIPAPI.orgunits = {};

  var log = CIPAPI.logger.getLogger("CIPAPI.orgunits");

  var isLoaded = false;
  
  CIPAPI.orgunits.collection = { lastUpdated: 0, orgunits: [] };
  
  function loadOrgUnits() {
    if (!CIPAPI.credentials.areValid()) {
      log.debug("No credentials, defering attempts to load");
      return;
    }

    log.debug("Loading Org Units");
    CIPAPI.rest.GET({ 
      url: '/api/versions/current/facts/orgunits', 
      success: function(response) { 
        CIPAPI.orgunits.collection.lastUpdated = $.now();
        CIPAPI.orgunits.collection.orgunits = response.data.item[0].data;
        $(document).trigger('cipapi-orgunits-set');
        log.debug("Org Units loaded");
        isLoaded = true;
        
        // Store the org units to local storage if so configured
        if (CIPAPI.config.persistOrgUnits) {
          var storageKey = 'CIPAPI.orgunits.' + CIPAPI.credentials.getCredentialHash();
          localStorage.setItem(storageKey, JSON.stringify(CIPAPI.orgunits.collection));
          log.debug("Org units stored in local storage");
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
    var timingEvent = undefined === CIPAPI.config.reloadOrgUnitsInterval ? 'cipapi-timing-5min' : CIPAPI.config.reloadOrgUnitssInterval;
    if (CIPAPI.timing.shouldFire(CIPAPI.orgunits.collection.lastUpdated, timingEvent)) {
      loadOrgUnits();
    }
  });

  // When credentials change reload current org units if not disabled
  $(document).on('cipapi-credentials-set', function() {
    // If currently NOT loaded AND local storage is enabled try and load org units values 
    // from local storage and do not load over the network if found.
    if (!isLoaded && CIPAPI.config.persistOrgUnits) {
      try {
        var storageKey = 'CIPAPI.orgunits.' + CIPAPI.credentials.getCredentialHash();
        var storedOrgUnits = JSON.parse(localStorage.getItem(storageKey));
        if (storedOrgUnits !== null && typeof storedOrgUnits === 'object') {
          CIPAPI.orgunits.collection = storedOrgUnits;
          log.debug("Org units merged from local storage");

          // Simulate full load
          isLoaded = true;
          $(document).trigger('cipapi-orgunits-set');
          CIPAPI.router.validateMetadata();

          return; // Do no more!
        }
      } catch(e) {
        log.error("Failed to load configuration from local storage");
      }
    }

    isLoaded = false;
    loadOrgUnits();
  });
  
  // When credentials are lost, reset our configuration
  $(document).on('cipapi-credentials-reset', function() {
    CIPAPI.orgunits.collection = { lastUpdated: 0, orgunits: [] };
    isLoaded = false;

    // If backed by local storage delete the contents
    if (CIPAPI.config.persistOrgUnits) {
      localStorage.removeItem('CIPAPI.orgunits.' + CIPAPI.credentials.getCredentialHash());
      log.debug("Local storage cleared");
    }
  });
})(jQuery, window);
