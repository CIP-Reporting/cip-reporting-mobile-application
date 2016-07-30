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
  CIPAPI.usersettings = {};

  var log = log4javascript.getLogger("CIPAPI.usersettings");

  var credentialHash = false;
  
  // Helper function to set a value onto a user setting
  function __set(key, value) {
    if (!CIPAPI.usersettings[key]) {
      log.error('User settings key does not exist: ' + key);
      return false;
    }
    
    if (!CIPAPI.usersettings[key].options[value]) {
      log.error('Invalid value for user setting ' + key + ': ' + value);
      return false;
    }
    
    // Update current value and store in local storage
    var storageKey = 'CIPAPI.usersettings.' + key + '.' + credentialHash;
    CIPAPI.usersettings[key].current = value;
    localStorage.setItem(storageKey, CIPAPI.usersettings[key].current);
    log.info('Changed ' + key + ' to: ' + value);
    
    // Fire an event!
    $(document).trigger('cipapi-usersettings-change', { key: key, value: value });
    
    return value;
  }
  
  // Helper function to (re)initialize user settings
  function initialize(eventName) {
    var newCredentialHash = CIPAPI.credentials.getCredentialHash();
    if (newCredentialHash == credentialHash) {
      log.warn('Taking no action because credential hash did not change');
      return CIPAPI.usersettings;
    }
    
    credentialHash = newCredentialHash;

    log.debug('Reloading user settings');
    
    var settings = {
      storageDB: { 
              title: CIPAPI.translations.translate('Offline Storage Engine'),
        description: CIPAPI.translations.translate('What storage system to use for storing reports pending transmission'),
                set: function(vv) { return __set('storageDB', vv); },
              reset: function()   { return __set('storageDB', 'sqlite'); },
            current: 'sqlite', 
            options: {
              'sqlite': CIPAPI.translations.translate('Use an SQLite database stored in a single file on the device file system (default)'),
                'file': CIPAPI.translations.translate('Use a JSON database stored in a single file on the device file system'),
              'memory': CIPAPI.translations.translate('Use an in memory database which can lead to data loss in the case of an application crash')
        }
      },
      fileDBBlockSize: {
              title: CIPAPI.translations.translate('File Storage Block Size'),
        description: CIPAPI.translations.translate('How large file write blocks can be when using a JSON database stored in a single file'),
                set: function(vv) { return __set('fileDBBlockSize', vv); },
              reset: function()   { return __set('fileDBBlockSize', '1M'); },
            current: '1024', 
            options: {
                 '32': CIPAPI.translations.translate('32K'),
                 '64': CIPAPI.translations.translate('64K'),
                '128': CIPAPI.translations.translate('128K'),
                '256': CIPAPI.translations.translate('256K'),
                '512': CIPAPI.translations.translate('512K'),
               '1024': CIPAPI.translations.translate('1M'),
              '16384': CIPAPI.translations.translate('16M'),
              '32768': CIPAPI.translations.translate('32M'),
              '65536': CIPAPI.translations.translate('64M')
        }
      }
    };
    
    // Read possible user setting overrides
    $.each(settings, function(key, val) {
      var storageKey = 'CIPAPI.usersettings.' + key + '.' + credentialHash;
      var savedValue = localStorage.getItem(storageKey);
      if (savedValue) {
        savedValue = '' + savedValue;
        if (settings[key].options[savedValue]) {
          settings[key].current = savedValue;
          log.info('Changed ' + key + ' to: ' + savedValue);
        } else {
          log.warn('Cannot change ' + key + ' to: ' + savedValue);
        }
      } else {
        log.info('Default for ' + key + ' remains: ' + settings[key].current);
      }
    });
    
    CIPAPI.usersettings = settings;

    // Fire an event!
    $(document).trigger(eventName);
  }
  
  // When credentials are lost, reset, or set reload user settings
  $(document).on('cipapi-credentials-set',   function() { initialize('cipapi-usersettings-loaded'); });
  $(document).on('cipapi-credentials-reset', function() { initialize('cipapi-usersettings-reset'); });
  
})(window);
