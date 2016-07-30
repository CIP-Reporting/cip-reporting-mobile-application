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
  if (typeof CIPAPI.storage == 'undefined')CIPAPI.storage = {};

  var log = log4javascript.getLogger("CIPAPI.storage");
 
  var db          = {}; // Start with an empty DB
  var isLoaded    = false;
  var engine      = false;
  
  // Deferred write tracking
  var inProgress  = 0;
  var isDeferred  = false;
  var maxLockTime = 120; // Seconds

  function writeBack() { 
    if (inProgress > 0) {
      if (Math.floor(Date.now() / 1000) > inProgress + maxLockTime) {
        log.error('Write in progress exceeded maximum time - releasing lock');
        inProgress = 0;
      } else {
        log.warn('Write in progress - write back deferred');
        isDeferred = true;
        return;
      }
    }
    
    // Use a timestamp as a mutex so we can avoid locking forever some how...
    inProgress = Math.floor(Date.now() / 1000);
    
    engine.writeBack(db, function(success) {
      inProgress = 0;

      if (isDeferred) {
        isDeferred = false;
        log.warn("Firing deferred write back");
        setTimeout(writeBack, 100);
      }
    }); 
  }
  
  function readBack(cb) { 
    engine.readBack(function(result) {
      if (false !== result) {
        db = result;
      }
      if (cb) cb(result !== false);
    }); 
  }
  
  // The API
  CIPAPI.storage.getItem       = function(key)      { log.debug('GET ' + key); return db[key] ? db[key] : false; }
  CIPAPI.storage.setItem       = function(key, val) { log.debug('SET ' + key); db[key] = val;  writeBack(); }
  CIPAPI.storage.removeItem    = function(key)      { log.debug('DEL ' + key); delete db[key]; writeBack(); }
  CIPAPI.storage.clear         = function()         { log.debug('RST');        db = {};        writeBack(); }
  CIPAPI.storage.isDeferred    = function()         { return isDeferred; }
  CIPAPI.storage.setEngine     = function(e) { 
    var engineType = e ? e : CIPAPI.usersettings.storageDB.current;
    
    if (typeof CIPAPI.storage.engines[engineType] == 'undefined') {
      log.error('Engine type not available, defaulting to memory: ' + engineType);
      engineType = 'memory';
    }
    
    log.debug('Changing engine to: ' + engineType);
    engine = CIPAPI.storage.engines[engineType];
  };

  // Some debuggery
  CIPAPI.storage.getEngine = function() { return engine; };
  CIPAPI.storage.readBack  = function() { return readBack(); };
  CIPAPI.storage.writeBack = function() { return writeBack(); };
  CIPAPI.storage.getDB     = function() { return db; };

  // When user is logged out reset
  $(document).on('cipapi-credentials-reset', function() { 
    db = {};
    engine = false;
    isLoaded = false;
    inProgress = false;
    isDeferred = false;
    log.debug("Reset storage");
  });
  
  // When user settings are loaded init the DB
  $(document).on('cipapi-usersettings-loaded', function() { 
    log.debug('Setting engine and reading back');
    
    // Choose engine if available based on user setting
    CIPAPI.storage.setEngine();
    
    readBack(function(success) { 
      isLoaded = true;
      CIPAPI.router.validateMetadata();
      
      log.debug("Storage Ready");
      $(document).trigger('cipapi-storage-ready');
    }); 
  });

  // When user selects a different storage engine honor the change
  $(document).on('cipapi-usersettings-change', function(evt, setting) {
    if (setting.key != 'storageDB') return;
    
    CIPAPI.storage.setEngine(setting.value);
    writeBack();
  });
  
  // Execute my veto power
  $(document).on('cipapi-metadata-validate', function(evt, validation) {
    log.debug("VETO: " + (isLoaded ? 'NO' : 'YES'));
    if (!isLoaded) {
      validation.validated = false;
    }
  });
  
})(window);
