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
  if (typeof CIPAPI.components == 'undefined') CIPAPI.components = {};

  var log = log4javascript.getLogger("CIPAPI.components.logview");

  // Create a log view control
  CIPAPI.components.logview = function(config) {
    // Default the config options
    if (typeof config == 'undefined') config = {};
    if (typeof config.selector      == 'undefined') config.selector      = 'div#main-content-area-view';
    if (typeof config.guid          == 'undefined') config.guid          = 'lv' + Math.random().toString(16).slice(2);
    if (typeof config.name          == 'undefined') config.name          = 'Log View';
    if (typeof config.total         == 'undefined') config.total         = 0; // Read only
    if (typeof config.count         == 'undefined') config.count         = 0; // Read only
    if (typeof config.offset        == 'undefined') config.offset        = 0;
    if (typeof config.viewURL       == 'undefined') config.viewURL       = '/api/versions/current/objects/cores';
    if (typeof config.sortField     == 'undefined') config.sortField     = 'Start Time';
    if (typeof config.sortOrder     == 'undefined') config.sortOrder     = 'asc';
    if (typeof config.columnFields  == 'undefined') config.columnFields  = [ 'Report Number', 'Report Type', 'Report Group', 'Start Time', 'End Time' ];
    if (typeof config.summaryFields == 'undefined') config.summaryFields = [ 'Note' ];
    if (typeof config.viewData      == 'undefined') config.viewData      = { data: { item: [] } };
    if (typeof config.droppable     == 'undefined') config.droppable     = false;
    if (typeof config.header        == 'undefined') config.header        = true;
    if (typeof config.hover         == 'undefined') config.hover         = true;
    if (typeof config.rowClass      == 'undefined') config.rowClass      = 'table-striped-doublerow';
    if (typeof config.hoverClass    == 'undefined') config.hoverClass    = 'table-striped-doublerow-hover';
    if (typeof config.dragoverClass == 'undefined') config.dragoverClass = 'table-striped-doublerow-dragover';
    if (typeof config.summaryClass  == 'undefined') config.summaryClass  = 'logview-summary';
    if (typeof config.dragOutTimer  == 'undefined') config.dragOutTimer  = false; // Read only
    if (typeof config.query         == 'undefined') config.query         = false; // No query by default
    if (typeof config.wellnessCheck == 'undefined') config.wellnessCheck = false;
    if (typeof config.scrollPos     == 'undefined') config.scrollPos     = 0;  // Keep track of scroll Pos on refresh/updates
    
    // Helper function to pad digits for proper sorting
    // 'sort_10_a' < 'sort_9_a' would be incorrect; need it to be 'sort_10_a' < 'sort_09_a'
    function pad(num, size) {
       var s = num+"";
       while (s.length < size) s = "0" + s;
       return s;
    }

    // Helper function to clean a field name for API use
    function cleanFieldName(fieldName) {
      return fieldName.replace(/\W+/g, '_').toLowerCase();
    }
    
    // Helper function to clean up and merge the field lists
    function getFieldList(columnFields, summaryFields) {
      var fieldList = [];
      
      for (var i=0; i<columnFields.length; i++) {
        fieldList.push(cleanFieldName(columnFields[i]));
      }
      
      for (var j=0; j<summaryFields.length; j++) {
        fieldList.push(cleanFieldName(summaryFields[j]));
      }
      
      return fieldList.sort();
    }
    
    // Add some hover highlights
    function addRowHover(row) {
      row.mouseenter(function() {
        var elem = $(this);
        elem.addClass(config.hoverClass);
        elem.siblings('[data-group=' + elem.attr('data-group') + ']').addClass(config.hoverClass);
      }).mouseleave(function() {
        var elem = $(this);
        elem.removeClass(config.hoverClass);
        elem.siblings('[data-group=' + elem.attr('data-group') + ']').removeClass(config.hoverClass);
      });
    }
    
    // Update the view - will create if not exists
    function update() {
      var updateGuid = config.guid + '_ug_' + Math.random().toString(16).slice(2);
      log.debug("Updating log view " + config.name + ' (' + updateGuid + ')');
      
      // Get or create the pagination controls
      var pgn = $(config.selector + ' > div.logview-pagination');
      
      if (pgn.length != 1) {
        log.debug("Pagination controls do not exist - creating...");
        
        pgn = $('<div class="logview-pagination"></div>');
        var innerPgn = $('<div></div>');
        
        innerPgn.append('<i class="fa fa-step-backward logview-first"></i>');
        innerPgn.append('<i class="fa fa-play fa-rotate-180 logview-previous"></i>');
        innerPgn.append('<span class="logview-counts">0 - 0 / 0</span>');
        innerPgn.append('<i class="fa fa-play logview-next"></i>');
        innerPgn.append('<i class="fa fa-step-forward logview-last"></i>');
        
        pgn.append(innerPgn);
        
        function maxOffset() { return config.total - (config.total % parseInt(CIPAPI.settings.ITEMSPERPAGE, 10)); }
        
        pgn.find('i.logview-first').click(function()    { config.offset = 0; config.refresh(config.update); });
        pgn.find('i.logview-previous').click(function() { config.offset = Math.max(config.offset - parseInt(CIPAPI.settings.ITEMSPERPAGE, 10), 0); config.refresh(config.update); });
        pgn.find('i.logview-next').click(function()     { config.offset = Math.min(config.offset + parseInt(CIPAPI.settings.ITEMSPERPAGE, 10), maxOffset()); config.refresh(config.update); });
        pgn.find('i.logview-last').click(function()     { config.offset = maxOffset(); config.refresh(config.update); });
      }
      
      // Update the totals
      var offset = parseInt(config.viewData.metadata.pagination.offset, 10);
      var count  = parseInt(config.viewData.metadata.pagination.count,  10);
      var total  = parseInt(config.viewData.metadata.pagination.total,  10);
      var extra  = total == 0 ? 0 : 1;
      
      pgn.find('span.logview-counts').text((offset + extra) + ' - ' + (offset + count) + ' / ' + total);
      
      // Get or create the view table
      var tbl = $(config.selector + ' > div > table.table-striped-doublerow');

      if (tbl.length != 1) {
        log.debug("View table does not exist - creating...");
        tbl = $('<table class="table-striped-doublerow new-logview-table"></table>');
        var thd = $('<thead></thead>');
        
        if (config.header) {
          var tr = $('<tr></tr>');
      
          for (var i=0; i<config.columnFields.length; i++) {
            var th = $('<th></th>').text(config.columnFields[i]);
            tr.append(th);
          }
      
          thd.append(tr);
        }
        
        tbl.append(thd);
        tbl.append('<tbody></tbody>');
      }
      
      var tbd = tbl.find('> tbody'); // Get the tbody in the table
      
      // Add (if necessary), update rows, delete abandoned rows, and sort
      var items = config.viewData.data.item;
      
      // Used for sorting
      var maxDigits = items.length.toString().length;
     
      for (var j=0; j<items.length; j++) {
        var rowGrp  = config.guid + '_rg_' + Math.random().toString(16).slice(2);
        var row1ID  = config.guid + '_ri_' + items[j]['data']['id'] + '_1';
        var row2ID  = config.guid + '_ri_' + items[j]['data']['id'] + '_2';
        var numCol  = config.columnFields.length;
        var percent = 100 / numCol;
        
        var row1 = $('tr#' + row1ID);
        if (!row1.length) {
          log.debug("Primary row does not exist, creating primary and secondary for " + row1ID);
          
          // Create the primary row and load the basics
          row1 = $('<tr></tr>');
          row1.addClass(config.rowClass);
          row1.attr('data-group', rowGrp);
          
          // Add columns to the primary row - to be updated later
          for (var k=0; k<numCol; k++) {
            var td = $('<td width="' + percent + '%"></td>');
            td.attr('data-name', config.columnFields[k]);
            row1.append(td);
            
            // Attach an on-click handler and just pass the click off via an event which may be handled externally
            (function(items, j) {
              td.on('click', function() {
                var elem = $(this);
                $(document).trigger('cipapi-handle-logview-rowclick', {
                      dataID: items[j]['data']['id'],
                         col: elem,
                   colOffset: k,
                     colName: elem.attr('data-name'),
                         row: row1,
                     rowType: 'primary',
                      rowNum: j,
                       rowID: row1ID,
                      row1ID: row1ID,
                      row2ID: row2ID,
                    rowGroup: rowGrp,
                     logview: config
                }); 
              });
            })(items, j);
          }
          
          // Create the secondary row and load the basics with colspan
          row2 = $('<tr></tr>');
          row2.addClass(config.rowClass);
          row2.attr('data-group', rowGrp);

          var td = $('<td></td>');
          td.attr('data-name', 'Summary');
          td.attr('colspan',   numCol);
          row2.append(td);
          
          // Attach an on-click handler and just pass the click off via an event which may be handled externally
          (function(items, j) {
            td.on('click', function() {
              var elem = $(this);
              $(document).trigger('cipapi-handle-logview-rowclick', {
                    dataID: items[j]['data']['id'],
                       col: elem,
                 colOffset: 0,
                   colName: elem.attr('data-name'),
                       row: row2,
                   rowType: 'secondary',
                    rowNum: j,
                     rowID: row2ID,
                    row1ID: row1ID,
                    row2ID: row2ID,
                  rowGroup: rowGrp,
                   logview: config
              }); 
            });
          })(items, j);
            
          // If configured add hover class stuff
          if (config.hover) {
            addRowHover(row1);
            addRowHover(row2);
          }
        }
        
        // Set the new GUID for managing row deltas
        row1.attr('data-guid', updateGuid);
        row2.attr('data-guid', updateGuid);
        
        // Load the ID into each row for click handling
        row1.attr('data-id', items[j]['data']['id']);
        row2.attr('data-id', items[j]['data']['id']);
        
        var sortKey = pad(j, maxDigits);
        
        // Load the sort key into the rows
        row1.attr('data-sort',  'sort_' + sortKey + '_a');
        row2.attr('data-sort',  'sort_' + sortKey + '_b');
        
        // Set the data into the columns
        for (var l=0; l<numCol; l++) {
          var fn = cleanFieldName(config.columnFields[l]);
          row1.find('td').eq(l).addClass(items[j].data[fn] ? 'not-empty' : 'is-empty').text(items[j].data[fn] || '');  // if null, display blank field
        }
        
        // Build and set the summary row
        var summary = ''; var numVisible = 0;
        for (var m=0; m<config.summaryFields.length; m++) {
          var fn  = cleanFieldName(config.summaryFields[m]);
          var key = CIPAPI.translations.translate(config.summaryFields[m]);
          var val = items[j].data[fn];

          numVisible += val == '' ? 0 : 1;
          var extraCss = (val == '') ? ' hidden' : (numVisible > 1 ? ' prefix-delimiter' : '');
          summary += '<span data-field-name="' + config.summaryFields[m] + '" class="summary-field fresh' + extraCss + '"><span class="summary-key">' + key + '</span>: <span class="summary-value">' + val + '</span></span> ';
        }
        row2.find('td').html(summary).addClass(config.summaryClass);
        
        // (re)append the rows
        tbd.append(row1);
        tbd.append(row2);
      }
      
      // Delete abandoned rows
      tbl.find('> tbody > tr[data-guid!="' + updateGuid + '"]').each(function(offset, item) {
        var elem = $(item);
        log.debug("Removing row" + elem.attr('data-id'));
        elem.remove();
      });

      // Resort rows
      tbl.find('> tbody > tr').sort(function (a, b) {
        var contentA = $(a).attr('data-sort');
        var contentB = $(b).attr('data-sort');
        return (contentA < contentB) ? -1 : (contentA > contentB) ? 1 : 0;
      }).appendTo(tbl);
      
      // Set droppable if configured
      if (config.droppable) {
        tbl.find('> tbody > tr').droppable({
          accept: '*',
          over: function(event, ui) {
            clearTimeout(config.dragOutTimer);
            var elem = $(this);
            elem.siblings().removeClass(config.dragoverClass);
            elem.addClass(config.dragoverClass);
            elem.siblings('[data-group=' + elem.attr('data-group') + ']').addClass(config.dragoverClass);
          },
          out: function(event, ui) {
            // Tricky tricky tricky ... remove class via a timer because the out and over events do not fire in a particular order
            // which means over can fire first, set the class, and out fires last clearing it ... which seems fine until you consider
            // our double row layout where two rows act as one.  This can get into a fight and clear the highlight completely.  Make
            // these changes in a timer that can be cleared by the over function.  The over function also removes classes before
            // applying them so effectively over supercedes out via this timer regardless of the order the events fire.
            config.dragOutTimer = setTimeout(function() {
              var elem = $(this);
              elem.removeClass(config.dragoverClass);
              elem.siblings().removeClass(config.dragoverClass);
            }, 1);
          },
          drop: function(event, ui) {
            var elem = $(this);
            elem.removeClass(config.dragoverClass);
            elem.siblings().removeClass(config.dragoverClass);
            $(document).trigger('cipapi-handle-logview-drop', { row: $(this), item: ui.draggable });
          }
        });
      }
      
      $(config.selector).append(pgn);
      
      // Put table in a wrapper DIV for block level styling
      var tblWrapper = $('<div class="table-striped-doublerow-wrapper"></div>');
      tblWrapper.append(tbl);
      $(config.selector).append(tblWrapper);

      
      // Let the world know...
      $(document).trigger('cipapi-handle-logview-update', config); 

      // Finally maintain scroll position
      tbl.scrollParent().scrollTop(config.scrollPos);     
    }
    
    // Full redraw of the view
    function redraw() {
      log.debug("Refreshing log view " + config.name);
      $(config.selector).html('');
      update();
    }
    
    // Load data from the API with callback
    function refresh(callback) {
      log.debug("Refreshing view data for " + config.name);

      // Preserve scroll Pos before refresh/updates
      var scrollPos = 0;
      if ($(config.selector + ' > div > table.table-striped-doublerow').length > 0)
        scrollPos = $(config.selector + ' > div > table.table-striped-doublerow').scrollParent().scrollTop();

      CIPAPI.rest.GET({
        url: config.viewURL,
        sort: cleanFieldName(config.sortField),
        order: config.sortOrder,
        offset: config.offset,
        fields: getFieldList(config.columnFields, config.summaryFields),
        query: config.query,
        success: function(response) { 
          log.debug("View data received for " + config.name);
          config.viewData = response;
          
          config.total    = parseInt(config.viewData.metadata.pagination.total,  10);
          config.count    = parseInt(config.viewData.metadata.pagination.count,  10);
          config.offset   = parseInt(config.viewData.metadata.pagination.offset, 10);
          config.scrollPos = scrollPos;
          
          if (callback) {
            callback.call(config, response);
          }
        }
      });
    }
    
    // Load functions into the configuration and return it back to the caller
    config.update  = update;
    config.redraw  = redraw;
    config.refresh = refresh;

    return config;
  }
})(window);
