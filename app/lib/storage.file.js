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

  var log = CIPAPI.logger.getLogger("CIPAPI.storage.file");
 
  if (typeof cordova == 'undefined') {
    log.warn('Storage not available');
    return;
  }
  
  // Single JSON DB file storage engine
  //
  // Credit: https://www.neontribe.co.uk/cordova-file-plugin-examples/
  // 
  // Way too complicated in the documentation on how to use the local file storage API
  
  function writeToFile(fileName, data, cb) {
    log.debug('Writing to file: ' + fileName);

    var errorHandler = function (fileName, cb, e) {
      var msg = '';
      switch (e.code) {
        case FileError.QUOTA_EXCEEDED_ERR:       msg = 'Storage quota exceeded'; break;
        case FileError.NOT_FOUND_ERR:            msg = 'File not found';         break;
        case FileError.SECURITY_ERR:             msg = 'Security error';         break;
        case FileError.INVALID_MODIFICATION_ERR: msg = 'Invalid modification';   break;
        case FileError.INVALID_STATE_ERR:        msg = 'Invalid state';          break;
        default:                                 msg = 'Unknown error';          break;
      };
               
      log.error('Error (' + fileName + '): ' + msg);
      data = null;
      if (cb) cb(false);
    }
              
    log.debug('Resolving data directory'); 
    window.resolveLocalFileSystemURL(cordova.file.dataDirectory, function (directoryEntry) {

      log.debug('Data directory resolved, creating file');
      directoryEntry.getFile(fileName, { create: true }, function (fileEntry) {

        log.debug('File created, setting up writer');
        fileEntry.createWriter(function (fileWriter) {
          
          fileWriter.onwriteend = function(e) { // Truncated!
            log.debug('Truncation of file "' + fileName + '" completed');
            fileWriter.onwriteend = null; // Avoid the death loop!
            
            log.debug('Creating JSON string');
            data = JSON.stringify(data, null, '\t');
            log.debug('Creating blob');
            data = new Blob([data], { type: 'text/plain' });
    
            var written = 0;
            var BLOCK_SIZE = 1024 * parseInt(CIPAPI.usersettings.fileDBBlockSize.current, 10);

            function writeNext() {
              var sz = Math.min(BLOCK_SIZE, data.size - written);
              var sub = data.slice(written, written + sz);
              log.debug('Writing block ' + filesize(sz));

              fileWriter.write(sub);
              sub = null;
              written += sz;
              fileWriter.onwrite = function(evt) {
                if (CIPAPI.storage.isDeferred()) {
                  log.warn('Deferred write pending, aborting write of file "' + fileName + '" (' + filesize(fileWriter.length) + ')');
                  data = null;
                  if (cb) { cb(false); }
                }
                else if (written >= data.size) {
                  log.debug('Write of file "' + fileName + '" completed (' + filesize(fileWriter.length) + ')');
                  data = null;
                  if (cb) { cb(true); }
                }
                else writeNext();
              };
            }

            log.debug('Kicking off write process');
            writeNext();
          };

          fileWriter.onerror = function (e) { // Rut-Roh!
            log.error('' + e.toString());
            data = null;
            if (cb) { cb(false); }
          };

          // Truncate the file
          log.debug('Truncating destination file ' + fileName);
          fileWriter.truncate(0);
          
        }, errorHandler.bind(null, fileName, cb));
      }, errorHandler.bind(null, fileName, cb));
    }, errorHandler.bind(null, fileName, cb));
  }
  
  function readFromFile(fileName, cb) {
    log.debug('Reading from file: ' + fileName);

    var errorHandler = function (fileName, cb, e) {
      var msg = '';
      switch (e.code) {
        case FileError.QUOTA_EXCEEDED_ERR:       msg = 'Storage quota exceeded'; break;
        case FileError.NOT_FOUND_ERR:            msg = 'File not found';         break;
        case FileError.SECURITY_ERR:             msg = 'Security error';         break;
        case FileError.INVALID_MODIFICATION_ERR: msg = 'Invalid modification';   break;
        case FileError.INVALID_STATE_ERR:        msg = 'Invalid state';          break;
        default:                                 msg = 'Unknown error';          break;
      };
               
      log.error('Error (' + fileName + '): ' + msg);
      if (cb) cb(false);
    }
   
    var pathToFile = cordova.file.dataDirectory + fileName;

    log.debug('Resolving local file system URL: ' + pathToFile);    
    window.resolveLocalFileSystemURL(pathToFile, function (fileEntry) {
      log.debug('File resolved');
      fileEntry.file(function (file) {
        var reader = new FileReader();

        reader.onloadend = function (e) {
          log.debug('Read of file "' + fileName + '" completed (' + filesize(this.result.length) + ')');
          var result = false;
          try {
            result = JSON.parse(this.result);
          } catch(err) {
            log.error('Failed to JSON decode file contents');
            result = {};
          }
          cb(result);
        };

        log.debug('Reading file "' + fileName);
        reader.readAsText(file);
      }, errorHandler.bind(null, fileName, cb));
    }, errorHandler.bind(null, fileName, cb));
  }
  
  CIPAPI.storage.engines.file = {
     readBack: function(cb)     { readFromFile(CIPAPI.credentials.getCredentialHash() + '.json', cb); },
    writeBack: function(db, cb) { writeToFile (CIPAPI.credentials.getCredentialHash() + '.json', db, cb); }
  }
  
  log.debug('Storage available for use');
  
})(window);
