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
  CIPAPI.flashlight = {};
  
  var log = log4javascript.getLogger("CIPAPI.flashlight");

  // Make sure we have a flashlight to work with
  var hasFlashlight = CIPAPI.config.enableBarcodeScanner;
  if (hasFlashlight && typeof cordova == 'undefined') hasFlashlight = false;
  if (hasFlashlight && typeof cordova.plugins == 'undefined') hasFlashlight = false;
  if (hasFlashlight && typeof cordova.plugins.flashlight == 'undefined') hasFlashlight = false;

  log.debug(hasFlashlight ? 'Flashlight available' : 'Flashlight NOT available');
  
  CIPAPI.flashlight.on = function() {
    if (!hasFlashlight) return;
    cordova.plugins.flashlight.switchOn();
  }
  
  CIPAPI.flashlight.off = function() {
    if (!hasFlashlight) return;
    cordova.plugins.flashlight.switchOff();
  }
  
  CIPAPI.flashlight.toggle = function() {
    if (!hasFlashlight) return;
    cordova.plugins.flashlight.toggle();
  }

  // When configuration is set re-evaluate the flashlight configuration
  $(document).on('cipapi-config-set', function() {
    hasFlashlight = CIPAPI.config.enableBarcodeScanner;
    if (hasFlashlight && typeof cordova == 'undefined') hasFlashlight = false;
    if (hasFlashlight && typeof cordova.plugins == 'undefined') hasFlashlight = false;
    if (hasFlashlight && typeof cordova.plugins.flashlight == 'undefined') hasFlashlight = false;
  });
  
  $(document).on ('cipapi-mobile-barcode-scan-start', function() { CIPAPI.flashlight.on();  });
  $(document).off('cipapi-mobile-barcode-scan-stop',  function() { CIPAPI.flashlight.off(); });
  
})(window);
