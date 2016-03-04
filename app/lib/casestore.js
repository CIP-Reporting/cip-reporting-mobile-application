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
  
  // Helper to determine percent complete of a report
  function calculatePercentageComplete(formName, formValues) {
    var form = CIPAPI.mobileforms[formName];
    if (!form) return 0;
    
    var visibleFields = 0;
    var completedFields = 0;
    $.each(form.form, function(key, obj) {
      if (obj.htmlClass.match(/cipform_invisible/)) return; // Invisible
      if (obj.type && obj.type == 'help') return; // No value for help fields
      if (obj.type && obj.type == 'null') return; // No value for null fields
      
      visibleFields++;
      if (formValues[obj.key]) completedFields++;
    });
    
    return Math.floor(100 * (completedFields / visibleFields));
  }
  
  // Monitor for reports added to the store
  $(document).on('cipapi-reportstore-add', function(event, info) {
    var storageKey = 'CIPAPI.casestore.' + CIPAPI.credentials.getCredentialHash();

    var caseStore = null;
    try {
      caseStore = JSON.parse(localStorage.getItem(storageKey));
      if (!Array.isArray(caseStore)) caseStore = new Array();
    } catch(e) {
      caseStore = new Array();
    }

    // Calculate the percentage complete for this item
    var percentComplete = calculatePercentageComplete(info.reportData.formName, info.reportData.serializedData);
    log.debug("Percent complete: " + percentComplete);
    
    // If this is a new case just add it to the list...
    if (CIPAPI.config.caseModeForm == info.reportData.formName) {
      var caseOffset = getCaseOffset(caseStore, info.reportData.serializedData.reportUUID);
      if (caseOffset === false) {
        log.debug("New case submitted");
        caseStore.push({ reportData: info.reportData, relatedReports: [], percentComplete: percentComplete });
        CIPAPI.stats.count(statsGroup, 'New Case');
      } else {
        log.debug("Updating existing case");
        caseStore[caseOffset].reportData = info.reportData;
        caseStore[caseOffset].percentComplete = percentComplete;
        CIPAPI.stats.count(statsGroup, 'Case Updates');
      }
    } else { // Child form
      var caseOffset = getCaseOffset(caseStore, info.reportData.serializedData.reportRelUUID);
      if (caseOffset !== false) {
        var reportOffset = getChildReportOffset(caseStore[caseOffset], info.reportData.serializedData.reportUUID);
        if (reportOffset === false) {
          log.debug("New child report submitted");
          caseStore[caseOffset].relatedReports.push({ reportData: info.reportData, percentComplete: percentComplete });
          CIPAPI.stats.count(statsGroup, 'New Report');
        } else {
          log.debug("Updating existing child report");
          caseStore[caseOffset].relatedReports[reportOffset].reportData = info.reportData;
          caseStore[caseOffset].relatedReports[reportOffset].percentComplete = percentComplete;
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
    localStorage.setItem(storageKey, JSON.stringify(caseStore));
  });
  
  // Get the case collection
  CIPAPI.casestore.getCases = function() {
    var storageKey = 'CIPAPI.casestore.' + CIPAPI.credentials.getCredentialHash();

    var caseStore = null;
    try {
      caseStore = JSON.parse(localStorage.getItem(storageKey));
      if (!Array.isArray(caseStore)) caseStore = new Array();
    } catch(e) {
      caseStore = new Array();
    }
    
    return caseStore;
  }
  
  // Does a child form exist for a given case UUID?
  CIPAPI.casestore.caseChildExists = function(caseUUID, childFormName) {
    var cases = CIPAPI.casestore.getCases();
    var caseOffset = getCaseOffset(cases, caseUUID);
    if (false === caseOffset) { 
      log.error("Failed to find case for child report " + caseUUID);
      return false; 
    }
    
    for (var i=0; i<cases[caseOffset].relatedReports.length; i++) {
      if (cases[caseOffset].relatedReports[i].reportData.formName == childFormName) {
        return cases[caseOffset].relatedReports[i].percentComplete;
      }
    }

    return false;
  }
  
  // Helper function to calculate the percent completion of a case
  CIPAPI.casestore.getCaseCompletePercent = function(caseRecord) {
    var totalForms = Object.keys(CIPAPI.mobileforms).length;
    var totalPoints = totalForms * 100; // 100 Percent / Points per form
    var actualPoints = 0; // Start at 0
    
    // First add in case form completion itself...
    actualPoints += caseRecord.percentComplete;
    
    // Next add in percent complete of any child forms
    for (var i=0; i<caseRecord.relatedReports.length; i++) {
      actualPoints += caseRecord.relatedReports[i].percentComplete;
    }
    
    return Math.floor(100 * (actualPoints / totalPoints));
  }
  
  // Try and find a form by name within a given case specified by UUID
  CIPAPI.casestore.getChildReportForCaseByFormName = function(caseUUID, formName) {
    var cases = CIPAPI.casestore.getCases();
    var caseOffset = getCaseOffset(cases, caseUUID);
    if (false === caseOffset) {
      return false;
    }
    
    for (var i=0; i<cases[caseOffset].relatedReports.length; i++) {
      if (cases[caseOffset].relatedReports[i].reportData.formName == formName) {
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
    localStorage.setItem(storageKey, JSON.stringify(caseStore));
    
    return removedCase;
  }

  // Remove all cases from the device
  CIPAPI.casestore.removeAllCases = function() {
    log.debug('Removing all cases');
    CIPAPI.stats.reset();
    localStorage.removeItem('CIPAPI.casestore.' + CIPAPI.credentials.getCredentialHash());    
    return CIPAPI.casestore.getCases();
  }    

})(window);
