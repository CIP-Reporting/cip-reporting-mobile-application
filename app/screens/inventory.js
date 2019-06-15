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

  var log = CIPAPI.logger.getLogger("CIPAPI.inventory");

  var searchIndex = false;
  
  var lastInfo = false;
  
  // Helper function to clean a field name for API use
  function cleanFieldName(fieldName) {
    return fieldName.replace(/\W+/g, '_').toLowerCase();
  }

  // Primitive helper to encode HTML entities
  function encodeHtmlEntities(str) {
    return String(str).replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;').replace(/"/g, '&quot;');
  }
  
  // Process a new search
  function processNewSearch(config) {
    var searchTerm = $.trim($('input#search-bar').val());
    
    log.debug("Search term update: " + (searchTerm.length == 0 ? '[BLANK]' : searchTerm));

    var results = searchTerm.length == 0 ? [] : searchIndex.search(searchTerm, config.searchConfiguration ? config.searchConfiguration : {});

    var tbody = $('div#results table tbody');
    tbody.find('> *').remove();

    if (searchTerm.length == 0) {
      log.debug('No results - restoring full results list');
      $('div#records').removeClass('results-shown');
      $('div#results').removeClass('results-shown');
      return;
    }
    
    var numShown = 0;
    log.debug('' + results.length + ' results');
    $.each(results, function(i, o) {
      log.debug('Ref: ' + o.ref + ' (' + o.score + ')');

      if (o.score < config.minimumMatchScore) {
        log.debug("Minimum score threshold not met");
        return;
      }
      
      var clonedRow = $('div#records table tbody tr[data-group=' + o.ref + ']').clone(true, true);
      clonedRow.appendTo(tbody);
      numShown++;
    });
    
    if (numShown == 0) {
      log.debug('No results displayed - showing no results message');
      tbody.append('<tr><td class="no-results" colspan="' + config.columnFields.length + '">No matching results</td></tr>');
    }
    
    $('div#records').addClass('results-shown');
    $('div#results').addClass('results-shown');

    $('div#results > table').floatThead();
  }

  // Helper function to find an inventory by name  
  function findInventoryByName(name) {
    var inventory = false;
    
    $.each(CIPAPI.inventories, function(key, val) {
      if (val.config.name == name) inventory = val;
    });
    
    return inventory;
  }
  
  // Helper function to find the form icon
  function findIconByName(name) {
    var form = 'glyphicon-pencil';
    
    $.each(CIPAPI.config.apiForms, function(key, val) {
      if (key == name) form = val;
    });
    
    return form;
  }
  
  // Render an inventory
  function renderInventory(info) {
    var inventory = findInventoryByName(info.params.inventory);
    var items     = inventory.items;
    var config    = inventory.config;
    
    var html = '' +
      '  <div class="search-bar-container input-group">' +
      '    <input type="text" class="form-control" id="search-bar" placeholder="Search" />' +
      '    <span class="input-group-btn">' +
      '      <button id="search-btn" class="btn btn-default" type="button"><span class="glyphicon glyphicon-search"></span></button>';
    
    if (config.barcodeScanner) {
      html += '' +
        '      <button id="barcode-btn" class="btn btn-default" type="button"><span class="glyphicon glyphicon-barcode"></span></button>';
    }
      
    html += '' +
      '      <button id="reset-btn" class="btn btn-default" type="button"><span class="glyphicon glyphicon-repeat"></span></button>' +
      '    </span>' +
      '  </div>' +
      '  <div id="results"></div>' +
      '  <div id="records"></div>';

    $('div#inventory-content-area').html(html);
    
    $('#barcode-btn').click(function() {
      CIPAPI.barcode.scan(function(barcode) {
        if (config.barcodeRegex) {
          var re = new RegExp(config.barcodeRegex);
          var filtered = re.exec(barcode);
          barcode = filtered.length > 1 ? filtered[1] : '';
        }
        
        log.debug('Barcode Search: ' + barcode);
        $('input#search-bar').val(barcode).focus().change();
      });
    });
    
    $('#search-btn').click(function() {
      log.debug('Search');
      $('input#search-bar').change();
    });
    
    $('#reset-btn').click(function() {
      log.debug('Reset');
      $('input#search-bar').val('').focus().change();
    });
  
    $('input#search-bar').on('change', function(e) { processNewSearch(config); });
    
    // Initialize a new text index
    searchIndex = elasticlunr(function () {
      for (var a=0; a<config.columnFields.length; a++) {
        this.addField(cleanFieldName(config.columnFields[a]));
      }
      
      for (var b=0; b<config.summaryFields.length; b++) {
        this.addField(cleanFieldName(config.summaryFields[b]));
      }
      
      this.setRef('rowid');
    });
    
    var tbl = $('<table class="table-striped-doublerow table-striped-doublerow-noptr new-logview-table"></table>');
    var thd = $('<thead></thead>');
    var tr  = $('<tr></tr>');

    var numCol = config.columnFields.length;

    for (var i=0; i<numCol; i++) {
      var th = $('<th></th>').text(CIPAPI.translations.translate(config.columnFields[i]));
      tr.append(th);
    }
  
    thd.append(tr);
    tbl.append(thd);
    tbl.append('<tbody></tbody>');
    
    tbl.clone().appendTo('div#inventory-content-area #results');
    tbl.appendTo('div#inventory-content-area #records');

    var tbd = tbl.find('> tbody'); // Get the tbody in the table
    
    var rows = '';
    for (var j=0; j<items.length; j++) {
      var rowGrp  = 'rg_' + Math.random().toString(16).slice(2);
      var item = items[j];
      item.data.rowid = rowGrp;

      rows += '<tr class="table-striped-doublerow" data-group="' + rowGrp + '" data-offset="' + j + '">';

      for (var k=0; k<numCol; k++) {
        var fn = cleanFieldName(config.columnFields[k]);
        rows += '<td>' +  encodeHtmlEntities(item.data[fn] || '') + '</td>';
      }

      rows += '</tr><tr class="table-striped-doublerow" data-group="' + rowGrp + '" data-offset="' + j + '"><td class="logview-summary" colspan="' + numCol + '">';

      // Build and set the summary row
      var summary = ''; var numVisible = 0;
      for (var m=0; m<config.summaryFields.length; m++) {
        var fn  = cleanFieldName(config.summaryFields[m]);
        var key = config.summaryFields[m];
        var val = item.data[fn];

        numVisible += val == '' ? 0 : 1;
        
        var extraCss = (val == '') ? ' hidden' : (numVisible > 1 ? (
          config.breakSummaryFields ? ' breaking-delimiter' : ' prefix-delimiter'
        ) : '');
        
        summary += '<span data-field-name="' + key + '" class="summary-field fresh' + extraCss + '"><span class="summary-key">' + 
          CIPAPI.translations.translate(key) + '</span>: <span class="summary-value">' + encodeHtmlEntities(val) + '</span></span> ';
      }

      rows += summary + '</td></tr>';

      // Add the whole document
      searchIndex.addDoc(item.data);
    }    
    
    tbd.html(rows);

    // Add a click handler to view the an item if configured
    tbd.find('> tr').click(function() {
      var clickData = { 
        inventory: info.params.inventory, 
        item: $(this).attr('data-offset')
      }
      
      if (config.directToActions) {
        clickData.actions = 1;
      }
      
      CIPAPI.router.goTo('inventory', clickData);
    });
    
    $('div#inventory-content-area #records > table').floatThead();
  }
  
  // Render an inventory item
  function renderInventoryItem(info) {
    var inventory = findInventoryByName(info.params.inventory);
    var items     = inventory.items;
    var config    = inventory.config;

    if (!items || !config) {
      log.error('Failed to locate inventory: ' + info.params.inventory)
      $('div#inventory-content-area').html('<h3>Failed to Locate Inventory</h3>');
      return;
    }
    
    var item = items[info.params.item];
    if (!item) {
      log.error('Failed to locate item: ' + info.params.item)
      $('div#inventory-content-area').html('<h3>Failed to Locate Item</h3>');
      return;
    }
    
    var formIcon = config.forms && config.forms.length > 0 ? '<a href="javascript: void(0)" class="inventory-item-form">Forms</a>' : '';
    
    $('div#inventory-content-area').html('<div id="inventory-item-content-area">' + formIcon + item.data[cleanFieldName(config.htmlField)] + '</div>');

    $('a.inventory-item-form').addClass('btn btn-primary btn-md btn-custom cipmobile-item-form-btn').html('<span class="glyphicon glyphicon-pencil"></span>').click(function() {
      CIPAPI.router.goTo('inventory', { inventory: info.params.inventory, item: info.params.item, actions: 1 });
    });
  }
  
  // Render action buttons for an item
  function renderActionButtons(info) {
    var inventory = findInventoryByName(info.params.inventory);
    var items     = inventory.items;
    var config    = inventory.config;
    
    if (!items || !config) {
      log.error('Failed to locate inventory: ' + info.params.inventory)
      $('div#inventory-content-area').html('<h3>Failed to Locate Inventory</h3>');
      return;
    }
    
    var item = items[info.params.item];
    if (!item) {
      log.error('Failed to locate item: ' + info.params.item)
      $('div#inventory-content-area').html('<h3>Failed to Locate Item</h3>');
      return;
    }
    
    var description = CIPAPI.translations.translate('To submit an action select and complete one of these available forms:');
    
    $('div#inventory-content-area').html('<div id="inventory-actions-content-area"><form class="form-cip-reporting"><div class="col-xs-12"><h2>' +
      item['description'] + 
      '</h2><span>' + 
      description +
      '</span></div><div class="form-button-list"></div></form></div>');

    $.each(config.forms, function(key, val) {
      var span = '<span class="glyphicon ' + findIconByName(val) + '"></span> ';
      $('div#inventory-content-area div.form-button-list').append('<div class="col-xs-12 col-sm-12 col-md-6 col-lg-4" ><a data-objid="' + item.data['id'] + '" data-form="' + val + '" class="btn btn-primary btn-lg btn-custom">' + span + val + '</a></div>');
    });

    $('div#inventory-content-area form div div a').each(function() {
      $(this).click(function() {
        var btn = $(this);
        return CIPAPI.router.goTo('main', { action: 'form', form: btn.attr('data-form'), links: config.objectType + '-' + btn.attr('data-objid') });
      });
    });
    
    if (config.autoClickSingleAction && $('div#inventory-content-area form div div a').length == 1) {
      $('div#inventory-content-area form div div a').trigger('click');m
    }
  }

  // Render the full inventory  
  function renderInventoryScreen(info) {
    log.debug('Render Start');

    if (!info) info = lastInfo;
    lastInfo = info;
    
    if (info.params.actions) {
      // Render action buttons for an item
      renderActionButtons(info);
    }
    else if (info.params.item) {
      // Render an individual inventory item
      renderInventoryItem(info);
    } else {
      // Render the entire inventory
      renderInventory(info);
    }

    log.debug('Render Finish');
  }
  
  // Monitor for config changes and update button lists when displayed
  $(document).on('cipapi-mobile-inventories-set', function(event, info) {
    if ($('div#inventory-content-area').length > 0) {
      // Clean up and re-draw
      $('div#inventory-content-area > *').remove();
      renderInventoryScreen();
    }
  });

  $(document).on('cipapi-handle-inventory', function(event, info) { renderInventoryScreen(info); });
  $(document).on('cipapi-update-inventory', function(event, info) { renderInventoryScreen(info); });
  
})(window);
