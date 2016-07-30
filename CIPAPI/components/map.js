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

  var log = log4javascript.getLogger("CIPAPI.components.map");

  // Create a new map object
  CIPAPI.components.map = function(mapId, maxDistance) {
    // Movable marker
    var movableMarker = null;
  
    // Draw the map    
    log.debug("Max distance: " + maxDistance + " miles");
    log.debug("Home Latitude: " + CIPAPI.settings.LATITUDEDEF + ", Home Longitude: " + CIPAPI.settings.LONGITUDEDEF);
    var map = new OpenLayers.Map(mapId, {
      controls: [ 
        new OpenLayers.Control.MousePosition({ displayProjection: new OpenLayers.Projection("EPSG:4326") }),
        new OpenLayers.Control.Navigation({ mouseWheelOptions: { interval: 100 }})
      ]    
    });
    
//    var road = new OpenLayers.Layer.Bing({ key: 'Ah5DaQHi1c4nWh7fW7b-CLUh0_PxcW6V1gwJCoKaBwl4TG1Vbx5-1TFWkHRgdanB', type: "Road" });
    var road = new OpenLayers.Layer.OSM();
    var markerLayer = new OpenLayers.Layer.Markers("Markers", { srs: 'epsg:4326' });
    map.addLayers([road, markerLayer]);

    // Add manual controls
    map.addControl(new OpenLayers.Control.PanZoomBar());

    // Figure out the best zoom level and then center US using that zoom    
    var bestFit = 0;
    var bestMiles = 0;
    for (z = 0; z < map.getNumZoomLevels(); z++) {
      var mapHeightMiles = (map.getResolutionForZoom(z) / 1609.344) * Math.min($('#' + mapId).width(), $('#' + mapId).height());
      if ((mapHeightMiles / 2) > maxDistance) {
        bestFit = z;
        bestMiles = mapHeightMiles;
      }
    }
    log.debug("bestFit for " + maxDistance + " miles = " + bestMiles + " (" + bestFit + ")");
    
    map.setCenter(new OpenLayers.LonLat(CIPAPI.settings.LONGITUDEDEF, CIPAPI.settings.LATITUDEDEF).transform(
        new OpenLayers.Projection("EPSG:4326"),
        map.getProjectionObject()
    ), bestFit);

    // Draw where WE are on the map in pretty green!
    var size = new OpenLayers.Size(21, 25);
    var offset = new OpenLayers.Pixel(-(size.w/2), -size.h);
    var icon = new OpenLayers.Icon("./lib/OpenLayers/img/marker-green.png", size, offset);
    if (CIPAPI.settings.LONGITUDEDEF != '' && CIPAPI.settings.LATITUDEDEF != '') {
      markerLayer.addMarker(new OpenLayers.Marker(new OpenLayers.LonLat(CIPAPI.settings.LONGITUDEDEF, CIPAPI.settings.LATITUDEDEF).transform(new OpenLayers.Projection("EPSG:4326"), new OpenLayers.Projection("EPSG:900913")), icon));
    }
    
    return {
      // Move the movable marker around
      setMovableMarker: function(latitude, longitude) {
        // Make sure we have a valid map
        if (map === null) {
          return;
        }
        
        log.debug("Moving marker to latitude: " + latitude + ", longitude: " + longitude);
        
        // Remove any previous marker
        if (movableMarker !== null) {
          markerLayer.removeMarker(movableMarker);
        }
        
        // Place the new marker
        var size = new OpenLayers.Size(21, 25);
        var offset = new OpenLayers.Pixel(-(size.w/2), -size.h);
        var icon = new OpenLayers.Icon("./lib/OpenLayers/img/marker-gold.png", size, offset);
        movableMarker = new OpenLayers.Marker(new OpenLayers.LonLat(longitude, latitude).transform(new OpenLayers.Projection("EPSG:4326"), new OpenLayers.Projection("EPSG:900913")), icon)
        markerLayer.addMarker(movableMarker);
        
        // Zoom the bounds to 1.2 (120%) of the size to ensure markers are always visible
        map.zoomToExtent(markerLayer.getDataExtent().scale(1.2)); // Zoom all purdy...
        
        return movableMarker;
      },
      
      // Create a stationary marker
      setMarker: function(latitude, longitude, hoverhtml) {
        // Make sure we have a valid map
        if (map === null) {
          return;
        }
        
        log.debug("Creating marker at latitude: " + latitude + ", longitude: " + longitude);
        
        // Place the new marker
        var size = new OpenLayers.Size(21, 25);
        var offset = new OpenLayers.Pixel(-(size.w/2), -size.h);
        var icon = new OpenLayers.Icon("./lib/OpenLayers/img/marker-gold.png", size, offset);
        var newMarker = new OpenLayers.Marker(new OpenLayers.LonLat(longitude, latitude).transform(new OpenLayers.Projection("EPSG:4326"), new OpenLayers.Projection("EPSG:900913")), icon)
        markerLayer.addMarker(newMarker);
        
        // Place hover marker if specified        
        if (typeof hoverhtml == 'string') {        
          var popup = null;
          newMarker.events.register('mouseover', newMarker, function(evt) {
            popup = new OpenLayers.Popup.FramedCloud("Popup",
              new OpenLayers.LonLat(longitude, latitude).transform(new OpenLayers.Projection("EPSG:4326"), new OpenLayers.Projection("EPSG:900913")),
              null,
              '<div class="openlayerhover">' + hoverhtml + '</div>',
              null,
              false
            );
          
            map.addPopup(popup);
          });

          newMarker.events.register('mouseout', newMarker, function(evt) {popup.hide();});
        }        
        
        // Zoom the bounds to 1.2 (120%) of the size to ensure markers are always visible
        map.zoomToExtent(markerLayer.getDataExtent().scale(1.2)); // Zoom all purdy...
        
        return newMarker;
      },
      
      // Clean up ... Clean up ... Everybody Clean Up!
      destroy: function() {
        log.debug("Destroying map");
        map.destroy();
        map = null;
      }
    };
  }
  
})(window);
