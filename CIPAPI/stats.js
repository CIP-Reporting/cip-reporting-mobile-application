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
  CIPAPI.stats = {};

  var log = log4javascript.getLogger("CIPAPI.stats");

  // The actual data store
  var statistics = {};

  // A little about ourselves
  $(document).on('cipapi-stats-fetch', function() {
    CIPAPI.stats.state('Application', 'Version', CIPAPI.config.applicationVersion);
  });
  
  // Helper
  function initCheck(group, name, def) {
    if (typeof statistics[group] == 'undefined') {
      statistics[group] = {};
    }

    if (typeof statistics[group][name] == 'undefined') {
      statistics[group][name] = def;
    }
  }
  
  // Reset all the stats
  CIPAPI.stats.reset = function() {
    statistics = {};
  }

  // Increment a counter
  CIPAPI.stats.count = function(group, name) {
    initCheck(group, name, 0);
    statistics[group][name]++;
  }

  // Store a total
  CIPAPI.stats.total = function(group, name, total) {
    initCheck(group, name, 0);
    statistics[group][name] = total;
  }
  
  // Store a state
  CIPAPI.stats.state = function(group, name, state) {
    initCheck(group, name, 'Unknown');
    statistics[group][name] = state;
  }

  // Store a timestamp
  CIPAPI.stats.timestamp = function(group, name) {
    initCheck(group, name, 'Unknown');
    var now = new Date();
    statistics[group][name] = now.toLocaleString();
  }

  // Get the statistics store
  CIPAPI.stats.fetch = function() {
    $(document).trigger('cipapi-stats-fetch');
    
    var started = new Date();  
    CIPAPI.stats.state('Application', 'Current Time', started.toLocaleString());
    CIPAPI.stats.state('Application', 'Current Timestamp', parseInt($.now() / 1000, 10));
    
    return statistics;
  }

  var started = new Date();  
  CIPAPI.stats.state('Application', 'Version', 'Unknown');
  CIPAPI.stats.state('Application', 'Started', started.toLocaleString());
  
})(window);
