'use strict';

/* To be moved to another script */

var InputMethodAPIEnabler =
  require('input-method-api-enabler').InputMethodAPIEnabler;
var self = require('sdk/self');

var enabler = new InputMethodAPIEnabler();

enabler.enable();

var tabs = require("sdk/tabs");

tabs.open('data:text/html,<input>');

var panel = require("sdk/panel").Panel({
  width: 180,
  height: 180,
  focus: false,
  contentURL: self.data.url('') + 'test.html'
});

enabler.onfocuschange = function(focus) {
  if (focus) {
    panel.show({focus: false});
  } else {
    panel.hide();
  }
};
