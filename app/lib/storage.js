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
  CIPAPI.storage = {};

  var log = log4javascript.getLogger("CIPAPI.storage");

  var db        = {}; // Start with an empty DB
  var isLoaded  = false;
  var storageDB = false;
  var pageSize  = 1024 * 512; // Half meg per request  
  
  // Deferred write tracking
  var inProgress  = 0;
  var isDeferred  = false;
  var maxLockTime = 120; // Seconds
  
  function resetDB() {
    if (!storageDB) return;

    log.debug("Reset Begin");
    storageDB.executeSql('DELETE FROM kvp WHERE 1', [ ],
      function(tx)     { log.debug('Reset complete'); },
      function(tx, er) { log.error('Write back (del) failed:' + er.message); }
    );
  }
  
  function checkDeferred() {
    if (isDeferred) {
      isDeferred = false;
      log.warn("Firing deferred write back");
      setTimeout(writeBack, 100);
    }
  }
  
  function writeBack() {
    if (!storageDB) return;

    if (inProgress > 0) {
      if (Math.floor(Date.now() / 1000) > inProgress + maxLockTime) {
        log.error("Write in progress exceeded maximum time - releasing lock");
        inProgress = 0;
      } else {
        log.warn("Write in progress - write back deferred");
        isDeferred = true;
      }
    }
    
    // Use a timestamp as a mutex so we can avoid locking forever some how...
    inProgress = Math.floor(Date.now() / 1000);
    
    log.debug("Write Back Begin");
    storageDB.executeSql('DELETE FROM kvp WHERE kk = ?', [ CIPAPI.credentials.getCredentialHash() ],
      function(resultSet) {
        var serializedDB = JSON.stringify(db);
        storageDB.executeSql('INSERT INTO kvp (kk, vv) VALUES(?, ?)', [ CIPAPI.credentials.getCredentialHash(), serializedDB ],
          function(resultSet) {
            log.debug("Write Back Complete (" + filesize(serializedDB.length) + ")");
            inProgress = 0;
            checkDeferred();
          },
          function(er) { 
            log.error('Write back (ins) failed: ' + er.message); 
            inProgress = 0;
            checkDeferred();
          }
        )
      },
      function(er) { 
        log.error('Write back (del) failed:' + er.message); 
        inProgress = 0;
        checkDeferred();
      }
    );
  }
  
  function initError(msg, warn) {
    if (warn) {
      log.warn(msg);
    } else {
      log.error(msg);
    }
    
    isLoaded = true;
    CIPAPI.router.validateMetadata();
    $(document).trigger('cipapi-storage-ready');
  }

  function initSuccess() {
    isLoaded = true;
    log.debug("Storage Ready");
    CIPAPI.router.validateMetadata();
    $(document).trigger('cipapi-storage-ready');
  }
  
  function readBack() {
    db = {}; // Clear the in-memory DB
    
    if (window.sqlitePlugin) {
      // Initialize the storage engine (if not already initialized)
      if (!storageDB) {
        log.debug("Using SQLite");
        storageDB = window.sqlitePlugin.openDatabase({name: "CIP-Reporting.db", location: 'default', androidLockWorkaround: 1});
      }
      
      if (storageDB) {
        var serializedDB = ''; var pageSize = 1024 * 512; // Half meg per request
        function readDataInPaginatedFormatToWorkAroundStupidBugsInSQLIteDriver(offset, hash) {
          log.debug("Offset: " + offset);
          storageDB.executeSql('SELECT SUBSTR(vv, ' + offset + ', ' + pageSize + ') AS vv FROM kvp WHERE kk = ?', [ hash ],
          function(resultSet) {
            // If no results, it may be our first initialization for this user
            if (resultSet.rows.length == 0) {
              if (serializedDB.length == 0) {
                return initSuccess();
              } else {
                return initError("Failed to read back record"); 
              }              
            }
              
            var record = resultSet.rows.item(0).vv;
            var length = record ? record.length : 0;
            log.debug("Length: " + length);
            
            // Recurse...
            if (length > 0) {
              serializedDB += resultSet.rows.item(0).vv;
              return readDataInPaginatedFormatToWorkAroundStupidBugsInSQLIteDriver(offset + pageSize, hash);
            }
            
            log.debug("Record found (" + serializedDB.length + ") ... Deserializing");

            db = JSON.parse(serializedDB);
            log.debug("Deserialized, ready for action");
            initSuccess();
          },
          function(er) { 
            log.error("Failed to read back");
            initError(er.message); 
          });
        }
        
        log.debug("Initializing database ...");
        storageDB.executeSql('CREATE TABLE IF NOT EXISTS kvp (kk VARCHAR PRIMARY KEY, vv VARCHAR)', [],
          function(resultSet) { 
            log.debug("Storage Initialized ... Reading Back"); 
            return readDataInPaginatedFormatToWorkAroundStupidBugsInSQLIteDriver(0, CIPAPI.credentials.getCredentialHash());
          },
          function(er) { 
            log.error("Failed to initialize");
            initError(er.message); 
          }
        );
      } else {
        initError("No persistence engine available, using in memory DB");
      }
    } else {
      initError("No persistence engine available, using in memory DB", true); // Just warn
    }
  }
  
  // The API
  CIPAPI.storage.getItem       = function(key)      { return db[key] ? db[key] : false; }
  CIPAPI.storage.setItem       = function(key, val) { db[key] = val; writeBack(); }
  CIPAPI.storage.removeItem    = function(key)      { delete db[key]; writeBack(); }
  CIPAPI.storage.clear         = function()         { db = {}; resetDB(); }

  // Some debuggery...
  CIPAPI.storage.getEngine     = function()         { return storageDB; }
  CIPAPI.storage.readBack      = function()         { return readBack(); }
  CIPAPI.storage.writeBack     = function()         { return writeBack(); }
  CIPAPI.storage.checkDeferred = function()         { checkDeferred(); }
  CIPAPI.storage.getPageSize   = function()         { return pageSize; }
  CIPAPI.storage.setPageSize   = function(size)     { pageSize = size; return pageSize; }
  
  // When configuration is set re-load the db
  $(document).on('cipapi-config-set', function() { readBack(); });

  // Execute my veto power
  $(document).on('cipapi-metadata-validate', function(evt, validation) {
    log.debug("VETO: " + (isLoaded ? 'NO' : 'YES'));
    if (!isLoaded) {
      validation.validated = false;
    }
  });
  
})(window);
