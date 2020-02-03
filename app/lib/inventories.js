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
  CIPAPI.inventories = [];

  var log = CIPAPI.logger.getLogger("CIPAPI.inventories");

  var isLoaded = false;

  // Statistics
  var statsGroup = 'Inventories';
  CIPAPI.stats.total(statsGroup, 'Inventory Updates', 0);
  CIPAPI.stats.total(statsGroup, 'Last Update', 'Never');
  
  $(document).on('cipapi-stats-fetch', function() {
    CIPAPI.stats.total(statsGroup, 'Total Inventories', CIPAPI.inventories.length);
  });
  
  // Helper function to clean a field name for API use
  function cleanFieldName(fieldName) {
    return fieldName.replace(/\W+/g, '_').toLowerCase();
  }
  
  // Helper function to clean up and merge the field lists
  function getFieldList(columnFields, summaryFields, htmlField) {
    var fieldList = [];
    
    for (var i=0; i<columnFields.length; i++) {
      fieldList.push(cleanFieldName(columnFields[i]));
    }
    
    for (var j=0; j<summaryFields.length; j++) {
      fieldList.push(cleanFieldName(summaryFields[j]));
    }
    
    if (htmlField) {
      fieldList.push(cleanFieldName(htmlField));
    }
    
    return fieldList.sort();
  }

  function loadInventories() {
    if (!CIPAPI.credentials.areValid()) {
      log.debug("No credentials, defering attempts to load");
      return;
    }

    log.debug("Loading inventories from server");
    CIPAPI.stats.count(statsGroup, 'Inventory Updates');

    // Load up each ajax request into an array of ajax requests to go fetch all inventories
    var requests = [];
    $.each(CIPAPI.config.inventories, function(key, val) {
      requests.push(CIPAPI.batch.GET({ 
           url: val.url,
          sort: cleanFieldName(val.sortField),
         order: val.sortOrder,
        fields: getFieldList(val.columnFields, val.summaryFields, val.htmlField ? val.htmlField : false),
         query: val.query,
        success: function(response) { 
          if (key === 0 && CIPAPI.inventories.length) CIPAPI.inventories = []; // First successful pass?
          CIPAPI.inventories.push({ config: val, items: response.data.item });
          log.debug("Loaded Inventory: " + val.name);
        }
      }));
    });

    // KUNG FU - wait until all are done!    
    $.when.apply(null, requests).then(function() {
      isLoaded = true;
      $(document).trigger('cipapi-mobile-inventories-set');
      $(document).trigger('cipapi-mobile-inventories-updated');
      CIPAPI.stats.timestamp(statsGroup, 'Last Update');
        
      // Store the inventories to local storage if so configured
      if (CIPAPI.config.persistInventories) {
        var storageKey = 'CIPAPI.inventories.' + CIPAPI.credentials.getCredentialHash();
        var json = JSON.stringify(CIPAPI.inventories);
        var compressed = LZString.compress(json);
        log.debug('Local Storage Compression: ' + json.length + ' (before) ' + compressed.length + ' (after)');

        try {
          localStorage.setItem(storageKey, compressed);
          log.debug("Inventories stored in local storage");
        } catch(e) {
          log.error("Failed to store inventories to local storage");
        }
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
  
  // When configuration is set re-load the inventories list
  $(document).on('cipapi-config-set', function() {
    // If currently NOT loaded AND local storage is enabled try and load inventories
    // from local storage and do not load over the network if found.
    if (!isLoaded && CIPAPI.config.persistInventories) {
      try {
        var storageKey = 'CIPAPI.inventories.' + CIPAPI.credentials.getCredentialHash();
        var compressed = localStorage.getItem(storageKey);
        var storedInventories = null;
        
        if (compressed !== null) {
          var decompressed = LZString.decompress(compressed);
          log.debug('Local Storage Decompression: ' + compressed.length + ' (before) ' + decompressed.length + ' (after)');
          storedInventories = JSON.parse(decompressed);
        }
        
        if (storedInventories !== null && typeof storedInventories === 'object') {
          CIPAPI.inventories = storedInventories;
          log.debug("Inventories merged from local storage");

          // Simulate full load
          isLoaded = true;
          $(document).trigger('cipapi-mobile-inventories-set');
          CIPAPI.router.validateMetadata();

          return; // Do no more!
        }
      } catch(e) {
        log.error("Failed to load inventories from local storage");
      }
    }

    loadInventories();
  });
  
  // When credentials are lost, reset our configuration
  $(document).on('cipapi-pre-logout', function() {
    CIPAPI.inventories = [];
    isLoaded = false;

    // If backed by local storage delete the contents
    if (CIPAPI.config.persistInventories) {
      localStorage.removeItem('CIPAPI.inventories.' + CIPAPI.credentials.getCredentialHash());
      log.debug("Local storage cleared");
    }
  });
})(window);
