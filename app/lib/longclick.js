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
  CIPAPI.longclick = {};

  var log = log4javascript.getLogger("CIPAPI.longclick");

  // Adapted from http://stackoverflow.com/questions/2625210/long-press-in-javascript
  CIPAPI.longclick.monitor = function(node, singleclick, longclick) {
    var longpress = false;
    var presstimer = null;
    var longtarget = null;
    
    var cancel = function(e) {
      if (presstimer !== null) {
        clearTimeout(presstimer);
        presstimer = null;
      }
    };
    
    var click = function(e) {
      if (presstimer !== null) {
        clearTimeout(presstimer);
        presstimer = null;
      }
      
      if (longpress) { return false; }

      singleclick.call(this);
    };

    var start = function(e) {
      console.log(e);
      
      if (e.type === "click" && e.button !== 0) {
        return;
      }
      
      longpress = false;
      
      presstimer = setTimeout(function() {
        longpress = true;
        longclick.call(this);
      }, 1000);
      
      return false;
    };
    
    node.addEventListener("mousedown",   start);
    node.addEventListener("touchstart",  start);
    node.addEventListener("click",       click);
    node.addEventListener("mouseout",    cancel);
    node.addEventListener("touchend",    cancel);
    node.addEventListener("touchleave",  cancel);
    node.addEventListener("touchcancel", cancel);
  }
  
})(window);
