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

  var log = CIPAPI.logger.getLogger("CIPAPI.vote");

  function getEncryptionKey(iv) {
    // Prefer manually entered pre-shared key
    var key = CIPAPI.usersettings.preSharedKey.current.trim();
    if (key !== '') {
      return CryptoJS.enc.Hex.parse(key);
    }
    // Else derive a key from the QR code token
    var token = CIPAPI.storage.getItem('unlock-token');
    if (!token) token = 'never gonna work';
    var creds = CIPAPI.credentials.get();
    var salt = creds.pass + iv.toString();
    
    var key = CryptoJS.PBKDF2(token, salt, {
      keySize: 256/32,
      iterations: 100
    });
    
    return key;
  }

  function decryptPayload(payload) {
    var parts = payload.split(':', 2);        
    var iv    = CryptoJS.enc.Base64.parse(parts[0]);
    var data  = parts[1];
    var key   = getEncryptionKey(iv);

    var decrypted = CryptoJS.AES.decrypt(data, key, { 
      iv: iv, 
      mode: CryptoJS.mode.CBC
    });
    
    var json = CryptoJS.enc.Utf8.stringify(decrypted);

    return JSON.parse(json);
  }

  function submitVote(api, id, vote, extra) {
    var success = false;
    
    CIPAPI.rest.post({ 
      url: '/api/versions/current/integrations/' + api, 
      data: JSON.stringify({ action: 'vote', id: vote, target: id, extra: extra }),
      success: function(response) { 
        try {
          var result = decryptPayload(response.data.item[0].data);

          if (result.success) {
            success = true;

            if (result.alert) {
              bootbox.alert(result.alert, function() {
                CIPAPI.router.goTo('vote!list=' + api);
              });
            }
            else {
              CIPAPI.router.goTo('vote!list=' + api);
            }
          }
        }
        catch(err) {
          log.error('Failed to Decrypt');
          log.error(err);
        }
      },
      complete: function() {
        if (!success) {
          bootbox.alert(CIPAPI.translations.translate('Failed to Vote - No Network Connection - Please Try Again'));
        }
      }
    });
  }
              
  function fetchAndRenderVote(api, id) {
    log.debug("Fetching vote for ID " + id);

    var success = false;

    CIPAPI.rest.post({ 
      url: '/api/versions/current/integrations/' + api, 
      data: JSON.stringify({ action: 'fetch', id: id }),
      success: function(response) { 
        try {
          var result = decryptPayload(response.data.item[0].data);

          if (result.success) {
            $('div#vote-content-area').html('<div id="vote-content"></div>');
            $('div#vote-content-area #vote-content').append(result.html);
            
            $('div#vote-content-area').append('<form class="form-cip-reporting"></form>');
            $('div#vote-content-area form').append('<div class="form-button-list"></div>');
            $('div#vote-content-area form').append('<div style="clear: both;"></div>');

            for (var i=0; i<result.buttons.length; i++) {
              var extraClass = result.buttons[i].class ? (' ' + result.buttons[i].class) : '';
              var span = result.buttons[i].icon && result.buttons[i].icon.match(/^glyphicon/) ? '<span class="glyphicon ' + result.buttons[i].icon + '"></span> ' : '';
              $('div#vote-content-area form div.form-button-list').append('<div class="col-xs-12 col-sm-12 col-md-6 col-lg-4' + extraClass + '"><a data-id="' + 
                result.buttons[i].id + '" class="btn btn-primary btn-lg btn-custom">' + span + result.buttons[i].html + '</a></div>');
            }
            
            $('div#vote-content-area form div.form-button-list a').on('click', function() {
              var vote = $(this).attr('data-id');

              // Find the original button detail as it may have prompt or confirm requirements
              for (var j=0; j<result.buttons.length; j++) {
                if (result.buttons[j].id != vote) continue; // No match
                
                // Confirm?
                if (result.buttons[j].confirm) {
                  bootbox.confirm(result.buttons[j].confirm, function(result){
                    if (result) {
                      submitVote(api, id, vote, false);
                    }
                  });
                }
                
                // Prompt?
                else if (result.buttons[j].prompt) {
                  bootbox.prompt(result.buttons[j].prompt, function(result){ 
                    if (result) {
                      submitVote(api, id, vote, result);
                    }
                  });
                }

                // Signature?
                else if (result.buttons[j].signature) {
                  CIPAPI.signature.name = result.buttons[j].name ? result.buttons[j].name : false;
                  CIPAPI.signature.capture(function(result) {
                    if (result) {
                      submitVote(api, id, vote, result.pngURL);
                    }
                  }, result.buttons[j].message ? result.buttons[j].message : false);
                }
                
                // Fire it!
                else {
                  submitVote(api, id, vote, false);
                }
              }
            });

            success = true; // All good thanks!
          }
        }
        catch(err) {
          log.error('Failed to Decrypt');
          log.error(err);
        }
      },
      complete: function() {
        if (!success) {
          $('div#vote-content-area').html(
            '<div class="cipapi-vote-load">' +
            '  <i class="fa fa-chain-broken"></i>' + 
            '  <span class="cipapi-vote-title">' + CIPAPI.translations.translate('No Network Connection') + '</span>' + 
            '  <a class="btn btn-primary btn-lg btn-custom cip-api-refresh cip-api-refresh-bad"><span class="glyphicon glyphicon-repeat"></span> ' + CIPAPI.translations.translate('Try Again') + '</a>' +
            '</div>');
        }

        $('div#vote-content-area div.cipapi-vote-load a.btn').on('click', function() {
          CIPAPI.router.goTo('vote!fetch=' + api + '!id=' + id);
        });
      }
    });
  }

  function fetchAndRenderVotes(api) {
    log.debug("Fetching list of pending votes");

    var success = false;

    CIPAPI.rest.post({ 
      url: '/api/versions/current/integrations/' + api, 
      data: JSON.stringify({ action: 'list' }),
      success: function(response) { 
        try {
          var result = decryptPayload(response.data.item[0].data);

          if (result.success) {
            if (result.votes.length > 0) {
              $('div#vote-content-area').html('<form class="form-cip-reporting"></form>');
              
              var title = CIPAPI.translations.translate('Cast Your Vote');
              var description = CIPAPI.translations.translate('To cast your vote select and complete one of these available votes:');
              var header = '' +
                '<div class="col-xs-12">' +
                '  <h2>' + title + '</h2>' +
                '  <span>' + description + '</span>' +
                '</div>';
              $('div#vote-content-area form').append(header);
              $('div#vote-content-area form').append('<div class="form-button-list"></div>');

              for (var i=0; i<result.votes.length; i++) {
                var extraClass = result.votes[i].class ? (' ' + result.votes[i].class) : '';
                var span = result.votes[i].icon && result.votes[i].icon.match(/^glyphicon/) ? '<span class="glyphicon ' + result.votes[i].icon + '"></span> ' : '';
                $('div#vote-content-area form div.form-button-list').append('<div class="col-xs-12 col-sm-12 col-md-6 col-lg-4' + extraClass + '"><a data-id="' + 
                  result.votes[i].id + '" class="btn btn-primary btn-lg btn-custom">' + span + result.votes[i].html + '</a></div>');
              }
              
              $('div#vote-content-area').append(
              '<div class="cipapi-clear-both"></div>' +
              '<div class="cipapi-vote-load">' +
              '  <a class="btn btn-primary btn-lg btn-custom cip-api-refresh cip-api-refresh-good"><span class="glyphicon glyphicon-repeat"></span> ' + CIPAPI.translations.translate('Refresh') + '</a>' +
              '</div>');
              
              $('div#vote-content-area form div.form-button-list a').on('click', function() {
                var id = $(this).attr('data-id');
                CIPAPI.router.goTo('vote!fetch=' + api + '!id=' + id);
              });
            }
            else {
              // No votes pending...
              $('div#vote-content-area').html(
                '<div class="cipapi-vote-load">' +
                '  <i class="fa fa-thumbs-up"></i>' + 
                '  <span class="cipapi-vote-title">' + CIPAPI.translations.translate('No Pending Votes') + '</span>' + 
                '  <a class="btn btn-primary btn-lg btn-custom cip-api-refresh cip-api-refresh-good"><span class="glyphicon glyphicon-repeat"></span> ' + CIPAPI.translations.translate('Refresh') + '</a>' +
                '</div>');
            }

            success = true; // All good thanks!
          }
        }
        catch(err) {
          log.error('Failed to Decrypt');
          log.error(err);
        }
      },
      complete: function() {
        if (!success) {
          $('div#vote-content-area').html(
            '<div class="cipapi-vote-load">' +
            '  <i class="fa fa-chain-broken"></i>' + 
            '  <span class="cipapi-vote-title">' + CIPAPI.translations.translate('No Network Connection') + '</span>' + 
            '  <a class="btn btn-primary btn-lg btn-custom cip-api-refresh cip-api-refresh-bad"><span class="glyphicon glyphicon-repeat"></span> ' + CIPAPI.translations.translate('Try Again') + '</a>' +
            '</div>');
        }

        $('div#vote-content-area div.cipapi-vote-load a.btn').on('click', function() {
          CIPAPI.router.goTo('vote!list=' + api);
        });
      }
    });
  }

  $(document).on('cipapi-handle-vote cipapi-update-vote', function(event, info) {
    $('div#vote-content-area > *').remove();

    $('div#vote-content-area').html(
      '<div class="cipapi-vote-load">' +
      '  <i class="fa fa-spin fa-spinner"></i>' + 
      '  <span class="cipapi-vote-title">' + CIPAPI.translations.translate('Loading') + '</span>' + 
      '</div>');

    if (info.params.list) {
      fetchAndRenderVotes(info.params.list);
    }
    
    if (info.params.fetch) {
      fetchAndRenderVote(info.params.fetch, info.params.id);
    }
  });
  
})(window);
