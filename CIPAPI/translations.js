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
  CIPAPI.translations = {};

  var log = log4javascript.getLogger("CIPAPI.translations");

  var isLoaded = false;
  
  CIPAPI.translations.collection = { lastUpdated: 0, translations: {} };
  
  // Translate or pass through a string value
  CIPAPI.translations.translate = function(str) {
    if (CIPAPI.translations.collection.translations.hasOwnProperty(str)) {
      return CIPAPI.translations.collection.translations[str];
    }
    
    return str;
  }
  
  function loadTranslations() {
    if (!CIPAPI.credentials.areValid()) {
      log.debug("No credentials, defering attempts to load");
      return;
    }

    log.debug("Loading translations");
    CIPAPI.rest.GET({ 
      url: '/api/versions/current/facts/translations', 
      success: function(response) { 
        CIPAPI.translations.collection.lastUpdated = $.now();
        CIPAPI.translations.collection.translations = response.data.item[0].data;
        $(document).trigger('cipapi-translations-set');
        log.debug("Translations loaded");
        isLoaded = true;
        
        // Store the translations to local storage if so configured
        if (CIPAPI.config.persistTranslations) {
          var storageKey = 'CIPAPI.translations.' + CIPAPI.credentials.getCredentialHash();
          localStorage.setItem(storageKey, JSON.stringify(CIPAPI.translations.collection));
          log.debug("Translations stored in local storage");
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
    var timingEvent = undefined === CIPAPI.config.reloadTranslationsInterval ? 'cipapi-timing-5min' : CIPAPI.config.reloadTranslationsInterval;
    if (CIPAPI.timing.shouldFire(CIPAPI.translations.collection.lastUpdated, timingEvent)) {
      loadTranslations();
    }
  });

  // When credentials change reload current translations if not disabled
  $(document).on('cipapi-credentials-set', function() {
    CIPAPI.translations.collection = { lastUpdated: 0, translations: {} };

    // If currently NOT loaded AND local storage is enabled try and load translation values 
    // from local storage and do not load over the network if found.
    if (!isLoaded && CIPAPI.config.persistTranslations) {
      try {
        var storageKey = 'CIPAPI.translations.' + CIPAPI.credentials.getCredentialHash();
        var storedTranslations = JSON.parse(localStorage.getItem(storageKey));
        if (storedTranslations !== null && typeof storedTranslations === 'object') {
          CIPAPI.translations.collection = storedTranslations;
          log.debug("Translations merged from local storage");

          // Simulate full load
          isLoaded = true;
          $(document).trigger('cipapi-translations-set');
          CIPAPI.router.validateMetadata();

          return; // Do no more!
        }
      } catch(e) {
        log.error("Failed to load configuration from local storage");
      }
    }

    isLoaded = false;
    loadTranslations();
  });
  
  // When credentials are lost, reset our configuration
  $(document).on('cipapi-credentials-reset', function() {
    CIPAPI.translations.collection = { lastUpdated: 0, translations: {} };
    isLoaded = false;

    // If backed by local storage delete the contents
    if (CIPAPI.config.persistTranslations) {
      localStorage.removeItem('CIPAPI.translations.' + CIPAPI.credentials.getCredentialHash());
      log.debug("Local storage cleared");
    }
  });
})(window);
