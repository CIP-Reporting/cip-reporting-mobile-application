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
  if (typeof CIPAPI.storage == 'undefined') CIPAPI.storage = {};
  if (typeof CIPAPI.storage.engines == 'undefined') CIPAPI.storage.engines = {};
  
  var log = CIPAPI.logger.getLogger("CIPAPI.storage.sqlite");

  if (typeof cordova == 'undefined') {
    log.warn('Storage not available - no cordova engine');
    return;
  }
  
  if (typeof sqlitePlugin == 'undefined' && typeof openDatabase == 'undefined') {
    log.warn('Storage not available - not found');
    return;
  }
  
  // Single SQLite database storage
  
  var sqlDB = false;

  function getDB(cb) {
    if (false === sqlDB) {
      log.debug('Initializing');
      
      var openFunc = false;
      if (CIPAPI.usersettings.preferNativeSQLite.current == 'enabled') {
        log.debug('Prefer native SQLite');
        
        if (typeof openDatabase == 'function') {
          log.debug('Using native SQLite');
          openFunc = openDatabase;
        } else {
          log.debug('Using plugin SQLite');
          openFunc = sqlitePlugin.openDatabase;
        }        
      } else {
        log.debug('Prefer plugin SQLite');
        
        if (typeof sqlitePlugin != 'undefined') {
          log.debug('Using plugin SQLite');
          openFunc = sqlitePlugin.openDatabase;
        } else {
          log.debug('Using native SQLite');
          openFunc = openDatabase;
        }
      }
      
      if (openFunc === false) {
        log.error('Failed to acquire an SQL storage engine');
        return cb(false);
      }
      
      sqlDB = openFunc('CIP-Reporting.db', '1.0', '', 1);
        
      sqlDB.transaction(function(tx) {
        log.debug('Started initialization transaction scope');
        tx.executeSql('CREATE TABLE IF NOT EXISTS kvp (kk VARCHAR PRIMARY KEY, vv VARCHAR)', [], 
          function(resultSet) { log.debug('Intialization complete');    return cb(sqlDB); },
          function(er)        { log.error('Create table error: ' + er); return cb(false); });
      },
      function(er) { log.error('Create table transaction error: ' + er); return cb(false); });
    } 
    else {
      log.debug('Database already initialized');
      return cb(sqlDB);
    }
  }
  
  function readBack(cb) { 
    log.debug('Read back initiated');
    getDB(function(sqlDB) {
      if (sqlDB === false) {
        log.error('Unable to get database');
        return cb({});
      }

      log.debug('Starting read back transaction scope');
      sqlDB.transaction(function(tx) {
        log.debug('Started read back transaction scope');
        tx.executeSql('SELECT vv FROM kvp WHERE kk = ?', [ CIPAPI.credentials.getCredentialHash() ], function(tx, resultSet) {
          if (resultSet.rows.length == 0) { 
            log.debug('No results - returning empty db');
            return cb({}); 
          }
          
          log.debug('Record located (' + filesize(resultSet.rows.item(0).vv.length) + ')');
          try {
            var record = JSON.parse(resultSet.rows.item(0).vv);
            log.debug('Deserialized results successfully');
            return cb(record);
          } catch(e) {
            log.error('Failed to deserialize results');
            return cb({});
          }
        },
        function(er) { log.error('Read back error: ' + er); return cb({}); });
      },
      function(er) { log.error('Read back transaction error: ' + er); return cb({}); });
    });
  }
  
  function writeBack(db, cb) { 
    log.debug('Write back initiated');
    getDB(function(sqlDB) {
      if (sqlDB === false) {
        log.error('Unable to get database');
        return cb(false);
      }

      log.debug('Starting write back transaction scope');
      sqlDB.transaction(function(tx) {
        log.debug('Started write back transaction scope');
        tx.executeSql('DELETE FROM kvp WHERE kk = ?', [ CIPAPI.credentials.getCredentialHash() ]);

        var serializedDB = JSON.stringify(db);
        log.debug('Inserting data (' + filesize(serializedDB.length) + ')');
        tx.executeSql('INSERT INTO kvp (kk, vv) VALUES(?, ?)', [ CIPAPI.credentials.getCredentialHash(), serializedDB ], function(txr, resultSet) {
          log.debug('Write back success');
          return cb(true);
        },
        function(er) { log.error('Write back error: ' + er); return cb(false); });
      },
      function(er) { log.error('Write back delete transaction error: ' + er); return cb(false); });
    });
  }
  
  CIPAPI.storage.engines.sqlite = {
        getDB: getDB,
     readBack: function(cb)     { readBack(cb); },
    writeBack: function(db, cb) { writeBack(db, cb); }
  }
  
  log.debug('Storage available for use');
  
})(window);
