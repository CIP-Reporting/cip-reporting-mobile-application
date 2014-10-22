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
  CIPAPI.geolocation = {};

  var log = log4javascript.getLogger("CIPAPI.geolocation");

  // Track the current watch for config updates
  var watchHandle = false;
  
  // Defaults...
  CIPAPI.geolocation.latitude         = '0';
  CIPAPI.geolocation.longitude        = '0';
  CIPAPI.geolocation.altitude         = '0';
  CIPAPI.geolocation.accuracy         = '0';
  CIPAPI.geolocation.altitudeAccuracy = '0';
  CIPAPI.geolocation.heading          = '0';
  CIPAPI.geolocation.speed            = '0';
  CIPAPI.geolocation.timestamp        = '0';
  
  // Statistics
  var statsGroup = 'Geo Location';
  $(document).on('cipapi-stats-fetch', function() {
    CIPAPI.stats.total(statsGroup, 'Latitude',          CIPAPI.geolocation.latitude);
    CIPAPI.stats.total(statsGroup, 'Longitude',         CIPAPI.geolocation.longitude);
    CIPAPI.stats.total(statsGroup, 'Altitude',          CIPAPI.geolocation.altitude);
    CIPAPI.stats.total(statsGroup, 'Accuracy',          CIPAPI.geolocation.accuracy);
    CIPAPI.stats.total(statsGroup, 'Altitude Accuracy', CIPAPI.geolocation.altitudeAccuracy);
    CIPAPI.stats.total(statsGroup, 'Heading',           CIPAPI.geolocation.heading);
    CIPAPI.stats.total(statsGroup, 'Speed',             CIPAPI.geolocation.speed);
    CIPAPI.stats.total(statsGroup, 'Timestamp',         CIPAPI.geolocation.timestamp);
  });

  // onSuccess - Accepts a Position object, which contains the current GPS coordinates
  var onSuccess = function(position) {
    CIPAPI.geolocation.latitude         = position.coords.latitude;
    CIPAPI.geolocation.longitude        = position.coords.longitude;
    CIPAPI.geolocation.altitude         = position.coords.altitude;
    CIPAPI.geolocation.accuracy         = position.coords.accuracy;
    CIPAPI.geolocation.altitudeAccuracy = position.coords.altitudeAccuracy;
    CIPAPI.geolocation.heading          = position.coords.heading;
    CIPAPI.geolocation.speed            = position.coords.speed;
    CIPAPI.geolocation.timestamp        = position.timestamp;
    
    log.debug("Position Updated: " + CIPAPI.geolocation.latitude + " / " + CIPAPI.geolocation.longitude);
    
    $(document).trigger('cipapi-geolocation-updated', position.coords);
  };

  // onError - Receives a PositionError object
  function onError(error) {
    log.error("Code " + error.code + ": " + error.message);
  }

  // Only hook in after core initialization
  $(document).on('cipapi-init', function() {
    if (window.cordova) {
      watchHandle = navigator.geolocation.watchPosition(onSuccess, onError, { 
        enableHighAccuracy: CIPAPI.config.usePreciseGPS
      });
    }
  });

  // On configuration change reset the watch  
  $(document).on('cipapi-config-set', function() {
    if (window.cordova) {
      log.debug("Clearing watch");
      navigator.geolocation.clearWatch(watchHandle);
      
      log.debug("Restarting watch");
      watchHandle = navigator.geolocation.watchPosition(onSuccess, onError, { 
        enableHighAccuracy: CIPAPI.config.usePreciseGPS
      });
    }
  });

  // Turn off the watch when paused
  document.addEventListener("pause", function() {
    log.debug("Clearing watch");
    navigator.geolocation.clearWatch(watchHandle);
  }, false);
  
  // Re-start the watch when resumed
  document.addEventListener("resume", function() {
    log.debug("Restarting watch");
    watchHandle = navigator.geolocation.watchPosition(onSuccess, onError, { 
      enableHighAccuracy: CIPAPI.config.usePreciseGPS
    });
  }, false);
  
})(window);
