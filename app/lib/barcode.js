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
  
  var log = log4javascript.getLogger("CIPAPI.barcode");

  // This beast was taken (and modified) from Stack Overflow
  //
  // http://stackoverflow.com/questions/8486099/how-do-i-parse-a-url-query-parameters-in-javascript
  function getJsonFromUrl(query) {
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
  
  function processCIPFormQRURL(url) {
    log.debug('Decoding URL: ' + url);

    var parser = document.createElement('a');
    parser.href = url;

    if (parser.protocol != 'https:')                  throw 'Invalid QR Code Protocol: '  + parser.protocol;
    if (parser.hostname != 'www.cipreporting.com')    throw 'Invalid QR Code Host Name: ' + parser.hostname;
    if (parser.pathname.lastIndexOf('/qr/', 0) !== 0) throw 'Invalid pathname: ' + parser.pathname;
    
    var formName = decodeURIComponent(parser.pathname.substr(4)).split('+').join(' ');
    log.debug('QR Code Form Name: ' + formName);
    
    if (typeof CIPAPI.mobileforms[formName] == 'undefined') throw 'Form does not exist: ' + formName;
    
    var fieldValues = {};
    if (parser.search.lastIndexOf('?', 0) === 0) {
      fieldValues = getJsonFromUrl(parser.search.substr(1));
    }
    
    var submit = parser.hash == '#submit';

    CIPAPI.main.renderForm(formName, false, fieldValues, parser.hash == '#submit');
  }

  function handleError(err) {
    log.error(err);
    CIPAPI.navbar.goBack();
    
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
  
  CIPAPI.barcode.scan = function() {
    log.debug('Starting scanner');

    try
    {
      // Some debuggery...
      if (false) {
        processCIPFormQRURL('https://www.cipreporting.com/qr/Quality+Incident?Customer+Location=The+Hamptons&Project+Number=12345&Problem+Description=Test&Product+Line=Straight&Part+Numbers=1231231#submit');
        return;
      }

      var hasScanner = true;
      if (hasScanner && typeof cordova == 'undefined') hasScanner = false;
      if (hasScanner && typeof cordova.plugins == 'undefined') hasScanner = false;
      if (hasScanner && typeof cordova.plugins.barcodeScanner == 'undefined') hasScanner = false;
      if (!hasScanner) throw 'No Scanner';

      $(document).trigger('cipapi-mobile-barcode-scan-start');

      cordova.plugins.barcodeScanner.scan(
        // Success...
        function (result) { 
          $(document).trigger('cipapi-mobile-barcode-scan-stop');
          
          if (result.cancelled) {
            log.debug('Cancelled');
            return;
          }
          
          if (result.format == 'QR_CODE') {
            if (result.text.lastIndexOf('https://www.cipreporting.com/qr/', 0) === 0) {
              log.debug('Processing CIP Form QR code');
              return processCIPFormQRURL(result.text);
            }
          }
          
          return handleError('Unhandled barcode (' + result.format + ') ' + result.text);
        }, 

        // Error...
        function (err) { 
          $(document).trigger('cipapi-mobile-barcode-scan-stop');
          return handleError(err); 
        }
      );
    } catch(err) {
      return handleError(err);
    }
  }
  
})(window);
