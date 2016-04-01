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

  var db = {}; // Start with an empty DB
  var storageKey = 'cipmobile-storage-key';
  
  var sqldbLocation = 2; // See https://github.com/litehelpers/Cordova-sqlite-storage/blob/a97198d/README.md
  var sqldbName = 'cipmobile.db';
  var sqldb = false;

  CIPAPI.storage.writeBack  = function() {
    var serializedDB = JSON.stringify(db);

    if (sqldb) {
      // Write back to SQLite DB
      sqldb.transaction(function(tx) {
        log.debug("Write back to SQLite storage");
        tx.executeSql("DELETE FROM kvp WHERE key = ?", [ storageKey ], function(tx, res) {
          tx.executeSql("INSERT INTO kvp SET key = ?, value = ?", [ storageKey, serializedDB ], function(tx, res) {
            log.debug("Write back complete");
          });
        });
      }, function(err) {
        log.error("Write back transaction failed: " + err.message);
      });
    } else {
      // Write back to local storage
      log.debug('Write back to local storage');
//      localStorage.setItem(storageKey, serializedDB);
      log.debug("Write back complete");
    }
  }
  
  CIPAPI.storage.readBack = function() {
    if (sqldb) {
      // Read back from SQLite DB
      log.debug('Read back from SQLite storage');
      sqldb.transaction(function(tx) {
        td.executeSql("SELECT value FROM kvp WHERE key = ?", [ storageKey ], function(tx, res) {
          if (res.rows.length == 1) {
            log.debug("Key found in SQLite DB - deserializing data");
            db = JSON.parse(res.rows.item(0).value);
            if (db === null) {
              log.debug("Failed to deserialize, initializing empty");
              db = {};
            }
          } else {
            log.debug("Key not found in SQLite DB");
            db = {};
          }
          log.debug("Read back complete");
        });
      });
    } else {
      // Else read back from local storage
      log.debug('Read back from local storage');
//      db = JSON.parse(localStorage.getItem(storageKey));
      if (db === null) {
        log.debug("Failed to deserialize, initializing empty");
        db = {};
      }
      log.debug("Read back complete");
    }
  }
  
  CIPAPI.storage.getItem    = function(key)      { return db[key] ? db[key] : false; }
  CIPAPI.storage.setItem    = function(key, val) { db[key] = val;  CIPAPI.storage.writeBack(); }
  CIPAPI.storage.removeItem = function(key)      { delete db[key]; CIPAPI.storage.writeBack(); }
  CIPAPI.storage.clear      = function()         { db = {};        CIPAPI.storage.writeBack(); }
  
  // Initialize SQLite storage if available
  if (window && window.sqlitePlugin) { 
    log.debug("Using SQLite storage");
    sqldb = window.sqlitePlugin.openDatabase({name: sqldbName, location: sqldbLocation});
    
    // Lazy initialize the SQLite database
    sqldb.transaction(function(tx) {
      tx.executeSql('CREATE TABLE IF NOT EXISTS kvp (key varchar(64) primary key, value blob)');
      log.debug("SQLite DB Ready");
      CIPAPI.storage.readBack();
    }, function(e) {
      log.error("SQLite DB NOT Ready: " + e.message);
      sqldb = false;
      CIPAPI.storage.readBack();
    });
  } else {
    log.debug("Using local storage");
    CIPAPI.storage.readBack();
  }
  
})(window);
