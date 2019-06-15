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
  CIPAPI.profiles = {};

  var log = CIPAPI.logger.getLogger("CIPAPI.profiles");

  var isLoaded = false;
  
  CIPAPI.profiles.collection = { lastUpdated: 0, profiles: [] };
  
  // Helpers
  function isModule(candidate) {
    return candidate.module_icon && candidate.module_name && candidate.module_url;
  }
  
  function isProfile(candidate) {
    return !isModule(candidate);
  }
  
  function sortByOrder(a, b) {
    if (a.module_order < b.module_order) return -1;
    if (a.module_order > b.module_order) return 1;
    return 0;
  }

  // Return an array of profiles available to the current user
  CIPAPI.profiles.getProfiles = function() {
    var profiles = [];
    
    $.each(CIPAPI.profiles.collection.profiles, function(offset, item) {
      if (isProfile(item)) {
        profiles.push(item);
      }
    });
    
    return profiles;
  }
  
  // Return an array of modules available to the current user
  CIPAPI.profiles.getModules = function() {
    var modules = [];
    
    $.each(CIPAPI.profiles.collection.profiles, function(offset, item) {
      if (isModule(item)) {
        modules.push(item);
      }
    });
    
    return modules.sort(sortByOrder);
  }
  
  function loadProfiles() {
    if (!CIPAPI.credentials.areValid()) {
      log.debug("No credentials, defering attempts to load");
      return;
    }

    log.debug("Loading profiles");
    CIPAPI.rest.GET({ 
      url: '/api/versions/current/facts/profiles', 
      success: function(response) { 
        CIPAPI.profiles.collection.lastUpdated = $.now();
        CIPAPI.profiles.collection.profiles = response.data.item[0].data;
        $(document).trigger('cipapi-profiles-set');
        log.debug("Profiles loaded");
        isLoaded = true;
        
        // Store the profiles to local storage if so configured
        if (CIPAPI.config.persistProfiles) {
          var storageKey = 'CIPAPI.profiles.' + CIPAPI.credentials.getCredentialHash();
          localStorage.setItem(storageKey, JSON.stringify(CIPAPI.profiles.collection));
          log.debug("Profiles stored in local storage");
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
    var timingEvent = undefined === CIPAPI.config.reloadProfilesInterval ? 'cipapi-timing-5min' : CIPAPI.config.reloadProfilesInterval;
    if (CIPAPI.timing.shouldFire(CIPAPI.profiles.collection.lastUpdated, timingEvent)) {
      loadProfiles();
    }
  });

  // When credentials change reload current profiles if not disabled
  $(document).on('cipapi-credentials-set', function() {
    CIPAPI.profiles.collection = { lastUpdated: 0, profiles: [] };

    // If currently NOT loaded AND local storage is enabled try and load profiles values 
    // from local storage and do not load over the network if found.
    if (!isLoaded && CIPAPI.config.persistProfiles) {
      try {
        var storageKey = 'CIPAPI.profiles.' + CIPAPI.credentials.getCredentialHash();
        var storedProfiles = JSON.parse(localStorage.getItem(storageKey));
        if (storedProfiles !== null && typeof storedProfiles === 'object') {
          CIPAPI.profiles.collection = storedProfiles;
          log.debug("Profiles merged from local storage");

          // Simulate full load
          isLoaded = true;
          $(document).trigger('cipapi-profiles-set');
          CIPAPI.router.validateMetadata();

          return; // Do no more!
        }
      } catch(e) {
        log.error("Failed to load configuration from local storage");
      }
    }

    isLoaded = false;
    loadProfiles();
  });
  
  // When credentials are lost, reset our configuration
  $(document).on('cipapi-credentials-reset', function() {
    CIPAPI.profiles.collection = { lastUpdated: 0, profiles: [] };
    isLoaded = false;

    // If backed by local storage delete the contents
    if (CIPAPI.config.persistProfiles) {
      localStorage.removeItem('CIPAPI.profiles.' + CIPAPI.credentials.getCredentialHash());
      log.debug("Local storage cleared");
    }
  });
})(jQuery, window);
