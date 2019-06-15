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
(function($, window, undefined) {

  if (typeof CIPAPI == 'undefined') CIPAPI = {};
  CIPAPI.logger = {};

  CIPAPI.logger.rootLevel = 100;

  CIPAPI.logger.loggers = {};

  CIPAPI.logger.setRootLogLevel = function(level) {
    CIPAPI.logger.rootLevel = level;
  }

  function getNow() {
    function padLeft(str, len) {
      var pad = "000000";
      return pad.substring(0, len - str.length) + str;
    }
    
    var d = new Date();
    
    var h  = padLeft('' + d.getHours(),        2);
    var m  = padLeft('' + d.getMinutes(),      2);
    var s  = padLeft('' + d.getSeconds(),      2);
    var ms = padLeft('' + d.getMilliseconds(), 3);
    
    return h + ":" + m + ":" + s + "," + ms;
  }

  CIPAPI.logger.getLogger = function(namespace) {
    if (!CIPAPI.logger.loggers[namespace]) {
      CIPAPI.logger.loggers[namespace] = (function() {
        var namespaceLevel = 100;
        
        function __log(level, levelName, msg) {
          if (Math.max(namespaceLevel, CIPAPI.logger.rootLevel) < level) return;
          
          var formatted = namespace + ' ' + levelName + ' - ' + msg;
          
          if (console && console.re) {
            return console.re.log(formatted);
          }
          
          if      (level == 6 && console && console.trace) return console.trace(getNow() + ' ' + formatted);
          else if (level == 5 && console && console.debug) return console.debug(getNow() + ' ' + formatted);
          else if (level == 4 && console && console.info)  return console.info (getNow() + ' ' + formatted);
          else if (level == 3 && console && console.warn)  return console.warn (getNow() + ' ' + formatted);
          else if (level == 2 && console && console.error) return console.error(getNow() + ' ' + formatted);
          else if (level == 1 && console && console.error) return console.error(getNow() + ' ' + formatted);
          else if (console && console.log)                 return console.log  (getNow() + ' ' + formatted);
          
          return false;
        }
        
        return {
          trace: function(msg) { return __log(6, 'TRACE', msg); },
          debug: function(msg) { return __log(5, 'DEBUG', msg); },
           info: function(msg) { return __log(4, 'INFO',  msg); },
           warn: function(msg) { return __log(3, 'WARN',  msg); },
          error: function(msg) { return __log(2, 'ERROR', msg); },
          fatal: function(msg) { return __log(1, 'FATAL', msg); },
          
          setLogLevel: function(level) { namespaceLevel = level; }
        }
      })();
    }
    
    return CIPAPI.logger.loggers[namespace];
  }
  
})(jQuery, window);
