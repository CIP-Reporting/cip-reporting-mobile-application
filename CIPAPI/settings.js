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
  CIPAPI.settings = {};

  var log = log4javascript.getLogger("CIPAPI.settings");

  var isLoaded = false;
  
  function loadSettings() {
    if (!CIPAPI.credentials.areValid()) {
      log.debug("No credentials, defering attempts to load");
      return;
    }

    log.debug("Loading settings");
    CIPAPI.rest.GET({ 
      url: '/api/versions/current/facts/settings', 
      success: function(response) { 
        response.data.item[0].data.lastUpdated = $.now();
        CIPAPI.settings = response.data.item[0].data;
        $(document).trigger('cipapi-settings-set');
        log.debug("Settings loaded");
        isLoaded = true;
        
        // Store the settings to local storage if so configured
        if (CIPAPI.config.persistSettings) {
          var storageKey = 'CIPAPI.settings.' + CIPAPI.credentials.getCredentialHash();
          localStorage.setItem(storageKey, JSON.stringify(response.data.item[0].data));
          log.debug("Settings stored in local storage");
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
  
  // Attempt to reload settings every 5 minutes unless another interval is specified (recommend cipapi-timing-never to disable completely)
  $(document).on('cipapi-timing-5sec', function(event, info) {
    var timingEvent = undefined === CIPAPI.config.reloadSettingsInterval ? 'cipapi-timing-5min' : CIPAPI.config.reloadSettingsInterval;
    if (CIPAPI.timing.shouldFire(CIPAPI.settings.lastUpdated, timingEvent)) {
      loadSettings();
    }
  });

  // When credentials change reload current settings if not disabled
  $(document).on('cipapi-credentials-set', function() {
    CIPAPI.settings = {};

    // If currently NOT loaded AND local storage is enabled try and load settings values 
    // from local storage and do not load over the network if found.
    if (!isLoaded && CIPAPI.config.persistSettings) {
      try {
        var storageKey = 'CIPAPI.settings.' + CIPAPI.credentials.getCredentialHash();
        var storedSettings = JSON.parse(localStorage.getItem(storageKey));
        if (storedSettings !== null && typeof storedSettings === 'object') {
          CIPAPI.settings = storedSettings;
          log.debug("Settings merged from local storage");

          // Simulate full load
          isLoaded = true;
          $(document).trigger('cipapi-settings-set');
          CIPAPI.router.validateMetadata();

          return; // Do no more!
        }
      } catch(e) {
        log.error("Failed to load configuration from local storage");
      }
    }

    isLoaded = false;
    loadSettings();
  });
  
  // When credentials are lost, reset our configuration
  $(document).on('cipapi-credentials-reset', function() {
    CIPAPI.settings = {};
    isLoaded = false;

    // If backed by local storage delete the contents
    if (CIPAPI.config.persistSettings) {
      localStorage.removeItem('CIPAPI.settings.' + CIPAPI.credentials.getCredentialHash());
      log.debug("Local storage cleared");
    }
  });
})(window);
