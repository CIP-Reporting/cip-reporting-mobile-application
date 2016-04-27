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

  var db                = {}; // Start with an empty DB
  var isLoaded          = false;
  var storageDB         = false;
  var persistenceEngine = false;
  
  // If available use HTML5 SQL API but prefers SQLite
  if (window.openDatabase) persistenceEngine = window;
  if (window.sqlitePlugin) persistenceEngine = window.sqlitePlugin;

  function resetDB() {
    if (!storageDB) return;

    log.debug("Reset Begin");
    storageDB.transaction(function(tx) {
      tx.executeSql('DELETE FROM kvp WHERE 1', [ ],
        function(tx)     { log.debug('Reset complete'); },
        function(tx, er) { log.error('Write back (del) failed:' + er.message); }
      );
    });
  }
  
  function writeBack() {
    if (!storageDB) return;
    
    log.debug("Write Back Begin");
    storageDB.transaction(function(tx) {
      tx.executeSql('DELETE FROM kvp WHERE kk = ?', [ CIPAPI.credentials.getCredentialHash() ],
        function(tx) {
          var serializedDB = JSON.stringify(db);
          tx.executeSql('INSERT INTO kvp (kk, vv) VALUES(?, ?)', [ CIPAPI.credentials.getCredentialHash(), serializedDB ],
            function(tx) {
              log.debug("Write Back Complete (" + filesize(serializedDB.length) + ")");
            },
            function(tx, er) { log.error('Write back (ins) failed: ' + er.message); }
          )
        },
        function(tx, er) { log.error('Write back (del) failed:' + er.message); }
      );
    });
  }
  
  function initError(msg) {
    log.error(msg);
    isLoaded = true;
    CIPAPI.router.validateMetadata();
    $(document).trigger('cipapi-storage-ready');
  }

  // When configuration is set re-load the db
  $(document).on('cipapi-config-set', function() {
    db = {}; // Clear the in-memory DB
    
    if (persistenceEngine) {
      if (persistenceEngine === window) log.debug("Using native HTML5 SQL API");
      if (persistenceEngine === window.sqlitePlugin) log.debug("Using SQLite");
      
      storageDB = persistenceEngine.openDatabase("CIP-Reporting", "1.0", "CIP Reporting Persistent Report Store", -1);
      
      if (storageDB) {
        storageDB.transaction(function(tx) {
          tx.executeSql('CREATE TABLE IF NOT EXISTS kvp (kk VARCHAR PRIMARY KEY, vv BLOB)', [],
            function(tx) { 
              log.debug("Storage Initialized ... Reading Back"); 
              tx.executeSql('SELECT vv FROM kvp WHERE kk = ?', [ CIPAPI.credentials.getCredentialHash() ],
                function(tx, res) {
                  if (res.rows.length) {
                    var serializedDB = res.rows.item(0).vv;
                    db = JSON.parse(serializedDB);
                    log.debug("Read Back Complete (" + filesize(serializedDB.length) + ")");
                  } else {
                    log.warn("Key not found, using empty DB");
                  }

                  isLoaded = true;
                  log.debug("Storage Ready");
                  CIPAPI.router.validateMetadata();
                  $(document).trigger('cipapi-storage-ready');
                },
                function(er) { initError(er.message); }
              );
            },
            function(er) { initError(er.message); }
          );
        });
      }
    } else {
      initError("No persistence engine available, using in memory DB");
    }
  });
  
  // The API
  CIPAPI.storage.getItem    = function(key)      { return db[key] ? db[key] : false; }
  CIPAPI.storage.setItem    = function(key, val) { db[key] = val; writeBack(); }
  CIPAPI.storage.removeItem = function(key)      { delete db[key]; writeBack(); }
  CIPAPI.storage.clear      = function()         { db = {}; resetDB(); }
  
  // Execute my veto power
  $(document).on('cipapi-metadata-validate', function(evt, validation) {
    log.debug("VETO: " + (isLoaded ? 'NO' : 'YES'));
    if (!isLoaded) {
      validation.validated = false;
    }
  });
  
})(window);
