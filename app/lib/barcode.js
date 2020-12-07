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
  CIPAPI.barcode = {};
  
  var log = CIPAPI.logger.getLogger("CIPAPI.barcode");

  function processCIPFormQRURL(url) {
    log.debug('Decoding URL: ' + url);

    var parser = document.createElement('a');
    parser.href = url;

    if (parser.protocol != 'https:')                  throw 'Invalid QR Code Protocol: '  + parser.protocol;
    if (parser.hostname != 'www.cipreporting.com')    throw 'Invalid QR Code Host Name: ' + parser.hostname;

    // CIP Form QR Code Scan?
    if (parser.pathname.lastIndexOf('/qr/', 0) !== 0) throw 'Invalid pathname: ' + parser.pathname;

    var formName = decodeURIComponent(parser.pathname.substr(4)).split('+').join(' ');
    log.debug('QR Code Form Name: ' + formName);
    
    if (typeof CIPAPI.mobileforms[formName] == 'undefined') throw 'Form does not exist: ' + formName;
    
    var fieldValues = {};
    if (parser.search.lastIndexOf('?', 0) === 0) {
      fieldValues = CIPAPI.barcode.getJsonFromUrl(parser.search.substr(1));
    }
    
    var submit = parser.hash == '#submit';

    CIPAPI.main.renderForm(formName, false, false, fieldValues, parser.hash == '#submit');
  }

  function handleError(err) {
    log.error(err);
    
    bootbox.dialog({
      message: err,
        title: CIPAPI.translations.translate('Barcode Error'),
      buttons: {
        success: {
              label: '<span class="glyphicon glyphicon-thumbs-down"></span> ' + CIPAPI.translations.translate('Close'),
          className: "btn btn-lg btn-primary btn-custom",
        }
      }
    });
  }
  
  // This beast was taken (and modified) from Stack Overflow
  //
  // http://stackoverflow.com/questions/8486099/how-do-i-parse-a-url-query-parameters-in-javascript
  CIPAPI.barcode.getJsonFromUrl = function(query) {
    var result = {};
  
    query.split("&").forEach(function(part) {
      if (!part) return;
      
      part = part.split("+").join(" "); // replace every + with space, regexp-free version
      var eq = part.indexOf("=");
      var key = eq>-1 ? part.substr(0,eq) : part;
      var val = eq>-1 ? decodeURIComponent(part.substr(eq+1)) : "";
      var from = key.indexOf("[");
      
      if (from==-1) {
        result[decodeURIComponent(key)] = val;
      } else {
        var to = key.indexOf("]");
        var index = decodeURIComponent(key.substring(from+1,to));
        key = decodeURIComponent(key.substring(0,from));
        if (!result[key]) result[key] = [];
        if (!index) result[key].push(val);
        else result[key][index] = val;
      }
    });
  
    return result;
  }
  
  CIPAPI.barcode.scan = function(callback) {
    log.debug('Starting scanner');

    // Register a do-nothing custom back handler
    CIPAPI.navbar.registerBackHandler(function() { 
      log.debug('Phony back handler invoked');
    });

    try
    {
      // For testing barcode logins
      //return callback('https://www.cipreporting.com/lookup?host=https%3A%2F%2Friffsurf%3A4398&d=vote&token=e9063a31-13c4-5c6d-b36d-30539f33b18e');

      // Test a form QR code
      //return processCIPFormQRURL('https://www.cipreporting.com/qr/Quality+Incident?Customer+Location=The+Hamptons&Project+Number=12345&Problem+Description=Test&Product+Line=Straight&Part+Numbers=1231231#submit');

      var hasScanner = true;
      if (hasScanner && typeof cordova == 'undefined') hasScanner = false;
      if (hasScanner && typeof cordova.plugins == 'undefined') hasScanner = false;
      if (hasScanner && typeof cordova.plugins.barcodeScanner == 'undefined') hasScanner = false;
      
      // Allow a simulated barcode scanner via user prompt
      if (!hasScanner) {
        bootbox.prompt(CIPAPI.translations.translate('No Barcode Scanner Detected - Manual Entry Required'), function(code) {
          if (!code) return handleError('No Barcode Scanner');
          if ($.trim(code) == '') return handleError('No Barcode Scanner');

          // Allow for an optional call back function
          if (callback) {
            log.debug('Invoking callback');
            return callback(code);
          }

          if (code.lastIndexOf('https://www.cipreporting.com/qr/', 0) === 0) {
            log.debug('Processing CIP Form QR code');
            try {
              return processCIPFormQRURL(code);
            } catch(err) {
              return handleError(err);
            }
          }
        });    
        
        return;
      }
      
      $(document).trigger('cipapi-forms-media-capture-barcode');
      
      cordova.plugins.barcodeScanner.scan(
        // Success...
        function (result) { 
          if (result.cancelled) {
            log.debug('Cancelled');
            return;
          }
          
          // Allow for an optional call back function
          if (callback) {
            log.debug('Invoking callback');
            callback(result.text);
            return;
          }
          
          if (result.format == 'QR_CODE') {
            if (result.text.lastIndexOf('https://www.cipreporting.com/qr/', 0) === 0) {
              log.debug('Processing CIP Form QR code');
              try {
                return processCIPFormQRURL(result.text);
              } catch(err) {
                return handleError(err);
              }
            }
          }
          
          return handleError('Unhandled barcode (' + result.format + ') ' + result.text);
        }, 

        // Error...
        function (err) { return handleError(err); }
      );
    } catch(err) {
      return handleError(err);
    }
  }
  
})(window);
