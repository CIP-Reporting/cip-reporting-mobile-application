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
  CIPAPI.casestore = {};

  var log = log4javascript.getLogger("CIPAPI.casestore");

  // If we are not configured into case mode just return early
  if (CIPAPI.config.caseModeForm === false) {
    log.debug("Not in case mode - case store is disabled");
    return;
  }
  
  // Statistics
  var statsGroup = 'Case Store';
  CIPAPI.stats.total(statsGroup, 'Total Cases',    0);
  CIPAPI.stats.total(statsGroup, 'New Cases',      0);
  CIPAPI.stats.total(statsGroup, 'Case Updates',   0);
  CIPAPI.stats.total(statsGroup, 'Total Reports',  0);
  CIPAPI.stats.total(statsGroup, 'New Reports',    0);
  CIPAPI.stats.total(statsGroup, 'Report Updates', 0);
  CIPAPI.stats.total(statsGroup, 'Case Removals',  0);
  CIPAPI.stats.total(statsGroup, 'Case Syncs',     0);
  CIPAPI.stats.total(statsGroup, 'Case Sets',      0);

  // Try and find the case in the collection and return that offset
  // or return false if not found.
  function getCaseOffset(caseStore, reportUUID) {
    for (var i=0; i<caseStore.length; i++) {
      if (caseStore[i].reportData.serializedData.reportUUID == reportUUID) {
        return i;
      }
    }
    
    log.debug("Case not found");
    return false;
  }
  
  // Try and find the report within the specific case record and return that offset
  // or return false if not found.
  function getChildReportOffset(caseRecord, reportUUID) {
    for (var i=0; i<caseRecord.relatedReports.length; i++) {
      if (caseRecord.relatedReports[i].reportData.serializedData.reportUUID == reportUUID) {
        log.debug("Found existing report at offset " + i);
        return i;
      }
    }
    
    log.debug("Report not found");
    return false;
  }
  
  // Monitor for reports added to the store
  $(document).on('cipapi-reportstore-add', function(event, info) {
    var storageKey = 'CIPAPI.casestore.' + CIPAPI.credentials.getCredentialHash();

    var caseStore = null;
    try {
      caseStore = CIPAPI.storage.getItem(storageKey);
      if (!Array.isArray(caseStore)) caseStore = new Array();
    } catch(e) {
      caseStore = new Array();
    }

    // If this is a new case just add it to the list...
    if (CIPAPI.config.caseModeForm == info.reportData.formName) {
      var caseOffset = getCaseOffset(caseStore, info.reportData.serializedData.reportUUID);
      if (caseOffset === false) {
        log.debug("New case submitted");
        caseStore.push({ reportData: info.reportData, relatedReports: [] });
        CIPAPI.stats.count(statsGroup, 'New Case');
      } else {
        log.debug("Updating existing case");
        caseStore[caseOffset].reportData = info.reportData;
        CIPAPI.stats.count(statsGroup, 'Case Updates');
      }
    } else { // Child form
      var caseOffset = getCaseOffset(caseStore, info.reportData.serializedData.reportRelUUID);
      if (caseOffset !== false) {
        var reportOffset = getChildReportOffset(caseStore[caseOffset], info.reportData.serializedData.reportUUID);
        if (reportOffset === false) {
          log.debug("New child report submitted");
          caseStore[caseOffset].relatedReports.push({ reportData: info.reportData });
          CIPAPI.stats.count(statsGroup, 'New Report');
        } else {
          log.debug("Updating existing child report");
          caseStore[caseOffset].relatedReports[reportOffset].reportData = info.reportData;
          CIPAPI.stats.count(statsGroup, 'Report Updates');
        }
      } else {
        log.error("Failed to find case for child form");
      }
    }

    // Count reports
    var totalReports = 0;
    for (var i=0; i<caseStore.length; i++) {
      totalReports++; // Count parent case
      totalReports += caseStore[i].relatedReports.length;
    }
    
    CIPAPI.stats.total(statsGroup, 'Total Cases',   caseStore.length);
    CIPAPI.stats.total(statsGroup, 'Total Reports', totalReports);

    // Set back to storage
    CIPAPI.storage.setItem(storageKey, caseStore);
  });
  
  // Get the case collection
  CIPAPI.casestore.getCases = function() {
    var storageKey = 'CIPAPI.casestore.' + CIPAPI.credentials.getCredentialHash();

    var caseStore = null;
    try {
      caseStore = CIPAPI.storage.getItem(storageKey);
      if (!Array.isArray(caseStore)) caseStore = new Array();
    } catch(e) {
      caseStore = new Array();
    }
    
    return caseStore;
  }
  
  // Get the case collection
  CIPAPI.casestore.setCases = function(caseStore) {
    log.debug('Setting case store');

    // Count reports
    var totalReports = 0;
    for (var i=0; i<caseStore.length; i++) {
      totalReports++; // Count parent case
      totalReports += caseStore[i].relatedReports.length;
    }
    
    CIPAPI.stats.total(statsGroup, 'Total Cases',   caseStore.length);
    CIPAPI.stats.total(statsGroup, 'Total Reports', totalReports);
    CIPAPI.stats.count(statsGroup, 'Case Sets');
    
    // Set back to storage
    var storageKey = 'CIPAPI.casestore.' + CIPAPI.credentials.getCredentialHash();
    CIPAPI.storage.setItem(storageKey, caseStore);
  }
  
  // Get child form UUIDs for a case by a given form name
  CIPAPI.casestore.getCaseChildrenMetadataDB = function(caseUUID, childFormName, atLeastOne) {
    var cases = CIPAPI.casestore.getCases();
    var caseOffset = getCaseOffset(cases, caseUUID);
    if (false === caseOffset) { 
      log.error("Failed to find case for child report " + caseUUID);
      return false; 
    }
    
    var UUIDs = []; var metadata = [];
    for (var i=0; i<cases[caseOffset].relatedReports.length; i++) {
      if (cases[caseOffset].relatedReports[i].reportData.formName == childFormName) {
        UUIDs.push(cases[caseOffset].relatedReports[i].reportData.serializedData.reportUUID);
        metadata.push(cases[caseOffset].relatedReports[i].reportData.formMetadata);
      }
    }
    
    // If no UUIDs exist for this child form and we are requested to always have
    // at least one of each form create a false UUID which may be created.
    if (atLeastOne && UUIDs.length == 0) {
      UUIDs.push(CIPAPI.uuid.get());
      metadata.push(false);
    }
    
    return { uuids: UUIDs, metadata: metadata }
  }
  
  // Helper function to calculate the percent completion of a case
  CIPAPI.casestore.getCaseCompletePercent = function(caseRecord) {

    var totalForms = caseRecord.relatedReports.length;
    var totalPoints = totalForms * 100; // 100 Percent / Points per form
    var actualPoints = 0; // Start at 0
    
    // Next add in percent complete of any child forms
    for (var i=0; i<caseRecord.relatedReports.length; i++) {
      actualPoints += caseRecord.relatedReports[i].reportData.formMetadata.percentComplete;
    }
    
    return Math.floor(100 * (actualPoints / totalPoints));
  }
  
  // Try and find a child form by UUID within a given case specified by UUID
  CIPAPI.casestore.getChildReportForCaseByChildUUID = function(caseUUID, childUUID) {
    var cases = CIPAPI.casestore.getCases();
    var caseOffset = getCaseOffset(cases, caseUUID);
    if (false === caseOffset) {
      return false;
    }
    
    for (var i=0; i<cases[caseOffset].relatedReports.length; i++) {
      if (cases[caseOffset].relatedReports[i].reportData.serializedData.reportUUID == childUUID) {
        return cases[caseOffset].relatedReports[i].reportData;
      }
    }
    
    return false;
  }

  // Remove a case from the device
  CIPAPI.casestore.removeCase = function(caseUUID) {
    var caseStore = CIPAPI.casestore.getCases();
    var caseOffset = getCaseOffset(caseStore, caseUUID);
    if (false === caseOffset) {
      return false;
    }

    // Remove it!
    log.debug('Removing case ' + caseUUID + ' at offset ' + caseOffset);
    var removedCase = caseStore.splice(caseOffset, 1);
    
    // Count reports
    var totalReports = 0;
    for (var i=0; i<caseStore.length; i++) {
      totalReports++; // Count parent case
      totalReports += caseStore[i].relatedReports.length;
    }
    
    CIPAPI.stats.total(statsGroup, 'Total Cases',   caseStore.length);
    CIPAPI.stats.total(statsGroup, 'Total Reports', totalReports);
    CIPAPI.stats.count(statsGroup, 'Case Removals');

    // Set back to storage
    var storageKey = 'CIPAPI.casestore.' + CIPAPI.credentials.getCredentialHash();
    CIPAPI.storage.setItem(storageKey, caseStore);
    
    return removedCase;
  }

  // Add a case to the device
  CIPAPI.casestore.addCase = function(newCase) {
    var caseStore = CIPAPI.casestore.getCases();
    
    log.debug('Adding case ' + newCase.reportData.serializedData.reportUUID + ' at offset ' + caseStore.length);
    
    caseStore.push(newCase);
    
    // Count reports
    var totalReports = 0;
    for (var i=0; i<caseStore.length; i++) {
      totalReports++; // Count parent case
      totalReports += caseStore[i].relatedReports.length;
    }
    
    CIPAPI.stats.total(statsGroup, 'Total Cases',   caseStore.length);
    CIPAPI.stats.total(statsGroup, 'Total Reports', totalReports);
    CIPAPI.stats.count(statsGroup, 'New Cases');
    
    // Set back to storage
    var storageKey = 'CIPAPI.casestore.' + CIPAPI.credentials.getCredentialHash();
    CIPAPI.storage.setItem(storageKey, caseStore);
    
    return newCase;
  }
  
  // Remove all cases from the device
  CIPAPI.casestore.removeAllCases = function() {
    log.debug('Removing all cases');

    CIPAPI.stats.total(statsGroup, 'Total Cases',   0);
    CIPAPI.stats.total(statsGroup, 'Total Reports', 0);

    CIPAPI.storage.removeItem('CIPAPI.casestore.' + CIPAPI.credentials.getCredentialHash());    
    return CIPAPI.casestore.getCases();
  }    

  // Monitor for forms updates ... a lazy way to hook into the process over all to update
  $(document).on('cipapi-mobile-forms-updated', function() { 
    var key = CIPAPI.config.caseModeSyncForm;

    if (key === false) {
      log.debug("Not updating cases, not configured");
      return;
    }
    
    if (CIPAPI.reportstore.getNumberOfStoredReports() > 0) {
      log.debug("Pending reports exist - not updating cases");
      return;
    }
    
    log.debug("Updating cases");
    
    CIPAPI.rest.GET({ 
      url: '/api/versions/current/integrations/' + escape(CIPAPI.config.useSingleURL ? CIPAPI.config.overrideIntegration : key),
      query: CIPAPI.config.useSingleURL ? key : false,
      success: function(response) { 
        var caseStore = response.data.item[0].data;
        CIPAPI.stats.count(statsGroup, 'Case Syncs');
        CIPAPI.casestore.setCases(caseStore);
        $(document).trigger('cipapi-mobile-cases-set');
      }
    });
  });
  
})(window);
