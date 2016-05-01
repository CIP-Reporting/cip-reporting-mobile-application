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
  
  function resetDB() {
    if (!storageDB) return;

    log.debug("Reset Begin");
    storageDB.executeSql('DELETE FROM kvp WHERE 1', [ ],
      function(tx)     { log.debug('Reset complete'); },
      function(tx, er) { log.error('Write back (del) failed:' + er.message); }
    );
  }
  
  function writeBack() {
    if (!storageDB) return;
    
    log.debug("Write Back Begin");
    storageDB.executeSql('DELETE FROM kvp WHERE kk = ?', [ CIPAPI.credentials.getCredentialHash() ],
      function(resultSet) {
        var serializedDB = JSON.stringify(db);
        storageDB.executeSql('INSERT INTO kvp (kk, vv) VALUES(?, ?)', [ CIPAPI.credentials.getCredentialHash(), serializedDB ],
          function(resultSet) {
            log.debug("Write Back Complete (" + filesize(serializedDB.length) + ")");
          },
          function(er) { 
            log.error('Write back (ins) failed: ' + er.message); 
          }
        )
      },
      function(er) { 
        log.error('Write back (del) failed:' + er.message); 
      }
    );
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
    
    if (window.openDatabase || window.sqlitePlugin) {
      // Initialize the storage engine (if not already initialized)
      if (!storageDB) {
        // If available use HTML5 SQL API but prefers SQLite
        if (window.sqlitePlugin) {
          log.debug("Using SQLite");
          storageDB = window.sqlitePlugin.openDatabase({name: "CIP-Reporting.db", location: 'default', androidLockWorkaround: 1});
        }
      }
      
      if (storageDB) {
        log.debug("Initializing database ...");
        storageDB.executeSql('CREATE TABLE IF NOT EXISTS kvp (kk VARCHAR PRIMARY KEY, vv BLOB)', [],
          function(resultSet) { 
            log.debug("Storage Initialized ... Reading Back"); 
            storageDB.executeSql('SELECT vv FROM kvp WHERE kk = ?', [ CIPAPI.credentials.getCredentialHash() ],
              function(resultSet) {
                log.debug('Read Back Complete ...');
                if (resultSet.rows.length) {
                  var serializedDB = resultSet.rows.item(0).vv;
                  var length = serializedDB ? filesize(serializedDB.length) : 'NULL';
                  log.debug("Record found (" + length + ") ... Deserializing");

                  db = JSON.parse(serializedDB);
                  log.debug("Deserialized, ready for action");
                } else {
                  log.warn("Key not found, using empty DB");
                }

                isLoaded = true;
                log.debug("Storage Ready");
                CIPAPI.router.validateMetadata();
                $(document).trigger('cipapi-storage-ready');
              },
              function(er) { 
                log.error("Failed to read back");
                initError(er.message); 
              }
            );
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
      initError("No persistence engine available, using in memory DB");
    }
  });
  
  // The API
  CIPAPI.storage.getItem    = function(key)      { return db[key] ? db[key] : false; }
  CIPAPI.storage.setItem    = function(key, val) { db[key] = val; writeBack(); }
  CIPAPI.storage.removeItem = function(key)      { delete db[key]; writeBack(); }
  CIPAPI.storage.clear      = function()         { db = {}; resetDB(); }
  CIPAPI.storage.getEngine  = function()         { return storageDB; }
  
  // Execute my veto power
  $(document).on('cipapi-metadata-validate', function(evt, validation) {
    log.debug("VETO: " + (isLoaded ? 'NO' : 'YES'));
    if (!isLoaded) {
      validation.validated = false;
    }
  });
  
})(window);
