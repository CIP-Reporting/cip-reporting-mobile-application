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
  CIPAPI.rest = {};

  var log = log4javascript.getLogger("CIPAPI.rest");

  var numTransactions = 0;
  
  // Statistics
  var statsGroup = 'API Transactions';
  CIPAPI.stats.total(statsGroup, 'Total GET',        0);
  CIPAPI.stats.total(statsGroup, 'Total POST',       0);
  CIPAPI.stats.total(statsGroup, 'Total PUT',        0);
  CIPAPI.stats.total(statsGroup, 'Total DELETE',     0);
  CIPAPI.stats.total(statsGroup, 'Total Errors',     0);
  CIPAPI.stats.total(statsGroup, 'Last Transaction', 'Never');

  $(document).on('cipapi-stats-fetch', function() {
    CIPAPI.stats.total(statsGroup, 'Total Pending', numTransactions);
  });

  // Iterate known API parameters and compose the query string
  function encodeApiParameters(opts) {
    var params = [];
    
    if (typeof opts.sort == 'string') {
      params.push('sort=' + escape(opts.sort));
    }
    
    if (typeof opts.order == 'string') {
      params.push('order=' + escape(opts.order))
    }
    
    if (Object.prototype.toString.call(opts.fields) === '[object Array]') {
      params.push('fields=' + opts.fields.join(','));
    }
    
    return params.length == 0 ? '' : '?' + params.join('&');
  }

  // Shared error handler for rest requests
  function restErrorHandler(xhr, ajaxOptions, thrownError) {
    // Be warned - early attempts to catch other errors seems to interfere with CORS OPTIONS requests
    if (xhr.status == 401 || !CIPAPI.credentials.areValid()) {
      return CIPAPI.router.goTo('login', { action: 'unauthorized' }); // Unuauthorized!
    }

    // If 404 and 404 is allowed do not log an error
    if (this.allow404 && xhr.status == 404) {
      return;
    }

    $(document).trigger('cipapi-rest-error', thrownError);
    CIPAPI.stats.count(statsGroup, 'Total Errors');
    log.error('(' + xhr.status + ') ' + xhr.responseText + ' -> ' + thrownError);
  }

  // Is the REST engine idle?
  CIPAPI.rest.isIdle = function() { return numTransactions == 0; }
  
  // Encode the basic auth header
  CIPAPI.rest.encodeBasicAuth = function(user, password) {
    var tok = user + ':' + password;
    var hash = btoa(tok);
    return "Basic " + hash;
  }

  // GET  
  CIPAPI.rest.GET = function(opts) {
    $(document).trigger('cipapi-rest-active');
    CIPAPI.stats.count(statsGroup, 'Total GET');
    CIPAPI.stats.timestamp(statsGroup, 'Last Transaction');
    numTransactions++;
    
    var credentials = CIPAPI.credentials.get();

    return $.ajax({
      type: "GET",
      url: credentials.host + opts.url + '.js' + encodeApiParameters(opts),
      dataType: 'json',
      success: opts.success,
      complete: opts.complete,
      headers: { "Authorization": CIPAPI.rest.encodeBasicAuth(credentials.user, credentials.pass) },
      error: restErrorHandler,
      allow404: typeof opts.allow404 != 'undefined'
    }).always(function() {
      if (--numTransactions == 0) $(document).trigger('cipapi-rest-inactive');
    });
  }
  
  // post  
  CIPAPI.rest.post = function(opts) {
    $(document).trigger('cipapi-rest-active');
    CIPAPI.stats.count(statsGroup, 'Total POST');
    CIPAPI.stats.timestamp(statsGroup, 'Last Transaction');
    numTransactions++;
    
    var credentials = CIPAPI.credentials.get();

    return $.ajax({
      type: "POST",
      processData: false, // Needed for ajax file upload
      contentType: false, // Needed for ajax file upload
      data: opts.data,
      url: credentials.host + opts.url + '.js' + encodeApiParameters(opts),
      dataType: 'json',
      success: opts.success,
      complete: opts.complete,
      headers: { "Authorization": CIPAPI.rest.encodeBasicAuth(credentials.user, credentials.pass) },
      error: restErrorHandler,
      allow404: typeof opts.allow404 != 'undefined'
    }).always(function() {
      if (--numTransactions == 0) $(document).trigger('cipapi-rest-inactive');
    });
  }
  
})(window);
