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
  CIPAPI.batch = {};

  var log = CIPAPI.logger.getLogger("CIPAPI.batch");

  // GET  
  CIPAPI.batch.GET = function(opts) {
    var total       = false;
    var offset      = false;
    var rowsPerPage = false;
    var data        = [];
    var requests    = [];
    
    log.debug("Starting request");

    var deferred = new $.Deferred(); // We will return a promise for tracking the requests
    
    var originalSuccess = opts.success; // We will call this later

    opts.success = function(response) { 
      // Override originalSuccess callback, so it doesn't get called on multiple requests
    }

    // Kick the first request off to get the first batch of data (which may be
    // all the data) but also the pagination numbers necessary for subsequent
    // requests. 
    requests.push(CIPAPI.rest.GET(opts));

    // Use 'when' to wait on the first request response
    $.when(requests[0]).done(function() {

      // After getting first response, we'll retrieve total, rowsPerPage, and offset
      // These variables used to calculate how many requests to make for paginated data source
      // total is the number of records in the data
      // rowsPerPage is the # of records per pagination
      // offset will equal rowsPerPage on the first pass. For each additional request, we will increment offset by rowsPerPage
      if (total       === false) total       = requests[0].responseJSON.metadata.pagination.total;
      if (rowsPerPage === false) rowsPerPage = requests[0].responseJSON.metadata.pagination.count;
      if (offset      === false) offset      = rowsPerPage;

      // Now fire off additional requests necessary (if any)
      while (offset < total) {

        // Create a deep copy of options config w/ adjusted offset
        requests.push(CIPAPI.rest.GET($.extend(true, opts, { offset: offset })));

        offset += rowsPerPage;     
      }

      // Now wait for them all to finish
      $.when.apply(window, requests).done(function() {
        log.debug("All done with requests");
       
        // Accumulte all pages onto the first page of results to simulate one result
        $.each(requests, function(idx,req) {
          if (idx > 0) {
            requests[0].responseJSON.data.item = requests[0].responseJSON.data.item.concat(req.responseJSON.data.item);
          }
        });

        // Assign count and total to the total # of results to simulate one aggregated result.
        requests[0].responseJSON.metadata.pagination.count = requests[0].responseJSON.data.item.length;
        requests[0].responseJSON.metadata.pagination.total = requests[0].responseJSON.data.item.length.toString();

        // Call the original success function with the combined request data
        if (originalSuccess) {
          originalSuccess(requests[0].responseJSON);
        }
        
        deferred.resolve(); // Resolve the promise
        
      });  // End of multiple requests      
    }) // End of 'done' section
    
    // return promise so that outside code cannot reject/resolve the deferred
    return deferred.promise();
  } // End of batch.GET
})(jQuery, window);
