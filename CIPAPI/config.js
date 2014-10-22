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
  CIPAPI.config = {};

  var log = log4javascript.getLogger("CIPAPI.config");

  var isLoaded = false;

  var defaultConfig = {};
  
  CIPAPI.config.setDefaults = function(config) {
    // Deep copies for all
    defaultConfig = jQuery.extend(true, {}, config);
    
    // Determine if we are packaged or not by application version being specified
    defaultConfig.isPackaged = defaultConfig.applicationVersion && defaultConfig.applicationVersion != '[APPVERSION]';

    CIPAPI.config = jQuery.extend(true, {}, defaultConfig);
  }
  
  function loadConfig() {
    if (!CIPAPI.credentials.areValid()) {
      log.debug("No credentials, defering attempts to load");
      return;
    }

    if (undefined !== CIPAPI.config.overrideIntegration) {
      log.debug("Loading config from server");
      CIPAPI.rest.GET({ 
        allow404: true, 
        url: '/api/versions/current/integrations/' + CIPAPI.config.overrideIntegration, 
        success: function(response) { 
          response.data.item[0].data.lastUpdated = $.now();
          $.extend(CIPAPI.config, response.data.item[0].data);
          log.debug("Config merged at " + CIPAPI.config.lastUpdated);
          
          // Store the configuration to local storage if so configured
          if (CIPAPI.config.persistConfig) {
            var storageKey = 'CIPAPI.config.' + CIPAPI.credentials.getCredentialHash();
            localStorage.setItem(storageKey, JSON.stringify(response.data.item[0].data));
            log.debug("Config stored in local storage");
          }
        },
        complete: function() {
          isLoaded = true;
          $(document).trigger('cipapi-config-set');
          CIPAPI.router.validateMetadata();
        }
      });
    } else {
      isLoaded = true;
      $(document).trigger('cipapi-config-set');
    }
  }

  // Execute my veto power
  $(document).on('cipapi-metadata-validate', function(evt, validation) {
    log.debug("VETO: " + (isLoaded ? 'NO' : 'YES'));
    if (!isLoaded) {
      validation.validated = false;
    }
  });
  
  // Attempt to reload configuration every 5 minutes unless another interval is specified (recommend cipapi-timing-never to disable completely)
  $(document).on('cipapi-timing-5sec', function(event, info) {
    var timingEvent = undefined === CIPAPI.config.reloadConfigInterval ? 'cipapi-timing-5min' : CIPAPI.config.reloadConfigInterval;
    if (CIPAPI.timing.shouldFire(CIPAPI.config.lastUpdated, timingEvent)) {
      loadConfig();
    }
  });
  
  // When credentials change reload current configuration override if not disabled
  $(document).on('cipapi-credentials-set', function() {
    CIPAPI.config = jQuery.extend(true, {}, defaultConfig);
    
    // If currently NOT loaded AND local storage is enabled try and load config values 
    // from local storage and do not load over the network if found.
    if (!isLoaded && CIPAPI.config.persistConfig) {
      try {
        var storageKey = 'CIPAPI.config.' + CIPAPI.credentials.getCredentialHash();
        var storedConfig = JSON.parse(localStorage.getItem(storageKey));
        if (storedConfig !== null && typeof storedConfig === 'object') {
          $.extend(CIPAPI.config, storedConfig);
          log.debug("Config merged from local storage");

          // Simulate full load
          isLoaded = true;
          $(document).trigger('cipapi-config-set');
          CIPAPI.router.validateMetadata();

          return; // Do no more!
        }
      } catch(e) {
        log.error("Failed to load configuration from local storage");
      }
    }
    
    isLoaded = false;
    loadConfig();
  });

  // When credentials are lost, reset our configuration
  $(document).on('cipapi-credentials-reset', function() {
    CIPAPI.config = jQuery.extend(true, {}, defaultConfig);
    isLoaded = false;
    
    // If backed by local storage delete the contents
    if (CIPAPI.config.persistConfig) {
      localStorage.removeItem('CIPAPI.config.' + CIPAPI.credentials.getCredentialHash());
      log.debug("Local storage cleared");
    }
  });
  
})(window);
