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
  CIPAPI.device = {};

  var log = log4javascript.getLogger("CIPAPI.device");

  function loadFromDevice() {
    // Set from device
    CIPAPI.device.cordova  = typeof device != 'undefined' && device.cordova  ? device.cordova  : 'Unknown';
    CIPAPI.device.model    = typeof device != 'undefined' && device.model    ? device.model    : 'Unknown';
    CIPAPI.device.platform = typeof device != 'undefined' && device.platform ? device.platform : 'Unknown';
    CIPAPI.device.uuid     = typeof device != 'undefined' && device.uuid     ? device.uuid     : 'Unknown';
    CIPAPI.device.version  = typeof device != 'undefined' && device.version  ? device.version  : 'Unknown';
  
    // Statistics
    var statsGroup = 'Device';
    $(document).on('cipapi-stats-fetch', function() {
      CIPAPI.stats.state(statsGroup, 'Cordova',  CIPAPI.device.cordova);
      CIPAPI.stats.state(statsGroup, 'Model',    CIPAPI.device.model);
      CIPAPI.stats.state(statsGroup, 'Platform', CIPAPI.device.platform);
      CIPAPI.stats.state(statsGroup, 'UUID',     CIPAPI.device.uuid);
      CIPAPI.stats.state(statsGroup, 'Version',  CIPAPI.device.version);
    });
  }

  // Set defaults
  loadFromDevice();
  
  // If phonegap - reload when ready
  if (window.cordova) {
    document.addEventListener("deviceready", loadFromDevice);
  }
  
})(window);
