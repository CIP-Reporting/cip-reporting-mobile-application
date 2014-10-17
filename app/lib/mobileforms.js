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
  CIPAPI.mobileforms = {};

  var log = log4javascript.getLogger("CIPAPI.mobileforms");

  var isLoaded = false;

  // Statistics
  var statsGroup = 'Mobile Forms';
  CIPAPI.stats.total(statsGroup, 'Form Updates', 0);
  CIPAPI.stats.total(statsGroup, 'Last Update',  'Never');
  
  $(document).on('cipapi-stats-fetch', function() {
    var totalForms = 0;
    
    var i;
    for (i in CIPAPI.mobileforms) {
      if (CIPAPI.mobileforms.hasOwnProperty(i)) {
        totalForms++;
      }
    }
    
    CIPAPI.stats.total(statsGroup, 'Total Form', totalForms);
  });
  
  function loadForms() {
    if (!CIPAPI.credentials.areValid()) {
      log.debug("No credentials, defering attempts to load");
      return;
    }

    log.debug("Loading forms from server");
    CIPAPI.stats.count(statsGroup, 'Form Updates');

    // Load up each ajax request into an array of ajax requests to go fetch all forms
    var requests = [];
    $.each(CIPAPI.config.apiForms, function(key, val) {
      requests.push(CIPAPI.rest.GET({ 
        url: '/api/versions/current/integrations/' + escape(key), 
        success: function(response) { 
          CIPAPI.mobileforms[key] = response.data.item[0].data;
          log.debug("Loaded Form: " + key);
        }
      }));
    });

    // KUNG FU - wait until all are done!    
    $.when.apply(null, requests).then(function() {
      isLoaded = true;
      $(document).trigger('cipapi-mobile-forms-set');
      CIPAPI.stats.timestamp(statsGroup, 'Last Update');
        
      // Store the forms to local storage if so configured
      if (CIPAPI.config.persistForms) {
        var storageKey = 'CIPAPI.mobileforms.' + CIPAPI.credentials.getCredentialHash();
        localStorage.setItem(storageKey, JSON.stringify(CIPAPI.mobileforms));
        log.debug("Forms stored in local storage");
      }
      
      CIPAPI.router.validateMetadata();
    });
  }

  // Execute my veto power
  $(document).on('cipapi-metadata-validate', function(evt, validation) {
    log.debug("VETO: " + (isLoaded ? 'NO' : 'YES'));
    if (!isLoaded) {
      validation.validated = false;
    }
  });
  
  // When configuration is set re-load the forms list
  $(document).on('cipapi-config-set', function() {
    CIPAPI.mobileforms = {};

    // If currently NOT loaded AND local storage is enabled try and load forms
    // from local storage and do not load over the network if found.
    if (!isLoaded && CIPAPI.config.persistForms) {
      try {
        var storageKey = 'CIPAPI.mobileforms.' + CIPAPI.credentials.getCredentialHash();
        var storedForms = JSON.parse(localStorage.getItem(storageKey));
        if (storedForms !== null && typeof storedForms === 'object') {
          CIPAPI.mobileforms = storedForms;
          log.debug("Forms merged from local storage");

          // Simulate full load
          isLoaded = true;
          $(document).trigger('cipapi-mobile-forms-set');
          CIPAPI.router.validateMetadata();

          return; // Do no more!
        }
      } catch(e) {
        log.error("Failed to load forms from local storage");
      }
    }

    loadForms();
  });
  
  // When credentials are lost, reset our configuration
  $(document).on('cipapi-pre-logout', function() {
    CIPAPI.mobileforms = {};
    isLoaded = false;

    // If backed by local storage delete the contents
    if (CIPAPI.config.persistForms) {
      localStorage.removeItem('CIPAPI.mobileforms.' + CIPAPI.credentials.getCredentialHash());
      log.debug("Local storage cleared");
    }
  });
})(window);
