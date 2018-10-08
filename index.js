(function (root, factory) {
  if (typeof define === 'function' && define.amd) {
    define(['Pomelo'], factory())
  } else if (typeof exports === 'object') {
    global.WebSocket = require('ws')
    module.exports = factory()
  } else {
    root.Pomelo = factory()
  }
}(this, function () {
  return require('./core')
}))
