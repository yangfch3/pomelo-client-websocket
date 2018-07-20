var root = this;

(function (global, factory) {
  typeof exports === 'object' && typeof module !== 'undefined' ? module.exports = factory() :
    typeof define === 'function' && define.amd ? define(factory) :
      (root.Pomelo = factory())
}(this, (function () {
  var localRoot = {}

  function myConsole (type) {
    if (root.process && root.process.env && +root.process.env['POMELO_CLIENT_DEBUG']
      || +root['debug'] > 0) {
      console[type].apply(console, Array.prototype.slice.call(arguments, 1))
    }
  }

  var has = Object.prototype.hasOwnProperty

  /* Refer to https://github.com/componentjs/require/blob/master/lib/require.js */
  function pomeloClient_require (path, parent, orig) {
    var resolved = pomeloClient_require.resolve(path)

    // lookup failed
    if (null == resolved) {
      orig = orig || path
      parent = parent || 'root'
      var err = new Error('Failed to require "' + orig + '" from "' + parent + '"')
      err.path = orig
      err.parent = parent
      err.pomeloClient_require = true
      throw err
    }

    var module = pomeloClient_require.modules[resolved]

    // perform real require()
    // by invoking the module's
    // registered function
    if (!module.exports) {
      module.exports = {}
      module.client = module.component = true
      module.call(this, module.exports, pomeloClient_require.relative(resolved), module)
    }

    return module.exports
  }

  pomeloClient_require.modules = {}
  pomeloClient_require.aliases = {}
  pomeloClient_require.resolve = function (path) {
    if (path.charAt(0) === '/') path = path.slice(1)
    var index = path + '/index.js'

    var paths = [
      path,
      path + '.js',
      path + '.json',
      path + '/index.js',
      path + '/index.json'
    ]

    for (var i = 0; i < paths.length; i++) {
      var path = paths[i]
      if (has.call(pomeloClient_require.modules, path)) return path
    }

    if (has.call(pomeloClient_require.aliases, index)) {
      return pomeloClient_require.aliases[index]
    }
  }
  pomeloClient_require.normalize = function (curr, path) {
    var segs = []

    if ('.' != path.charAt(0)) return path

    curr = curr.split('/')
    path = path.split('/')

    for (var i = 0; i < path.length; ++i) {
      if ('..' == path[i]) {
        curr.pop()
      } else if ('.' != path[i] && '' != path[i]) {
        segs.push(path[i])
      }
    }

    return curr.concat(segs).join('/')
  }
  pomeloClient_require.register = function (path, definition) {
    pomeloClient_require.modules[path] = definition
  }
  pomeloClient_require.alias = function (from, to) {
    if (!has.call(pomeloClient_require.modules, from)) {
      throw new Error('Failed to alias "' + from + '", it does not exist')
    }
    pomeloClient_require.aliases[to] = from
  }
  pomeloClient_require.relative = function (parent) {
    var p = pomeloClient_require.normalize(parent, '..')

    /**
     * lastIndexOf helper.
     */

    function lastIndexOf (arr, obj) {
      var i = arr.length
      while (i--) {
        if (arr[i] === obj) return i
      }
      return -1
    }

    /**
     * The relative require() itself.
     */

    function localRequire (path) {
      var resolved = localRequire.resolve(path)
      return pomeloClient_require(resolved, parent, path)
    }

    /**
     * Resolve relative to the parent.
     */

    localRequire.resolve = function (path) {
      var c = path.charAt(0)
      if ('/' == c) return path.slice(1)
      if ('.' == c) return pomeloClient_require.normalize(p, path)

      // resolve deps by returning
      // the dep in the nearest "deps"
      // directory
      var segs = parent.split('/')
      var i = lastIndexOf(segs, 'deps') + 1
      if (!i) i = 0
      path = segs.slice(0, i + 1).join('/') + '/deps/' + path
      return path
    }

    /**
     * Check if module is defined at `path`.
     */

    localRequire.exists = function (path) {
      return has.call(pomeloClient_require.modules, localRequire.resolve(path))
    }

    return localRequire
  }
  pomeloClient_require.register('component-indexof/index.js', function (exports, require, module) {

    var indexOf = [].indexOf

    module.exports = function (arr, obj) {
      if (indexOf) return arr.indexOf(obj)
      for (var i = 0; i < arr.length; ++i) {
        if (arr[i] === obj) return i
      }
      return -1
    }
  })
  pomeloClient_require.register('component-emitter/index.js', function (exports, require, module) {
    var index = require('indexof')
    module.exports = Emitter

    function Emitter (obj) {
      if (obj) return mixin(obj)
    }

    function mixin (obj) {
      for (var key in Emitter.prototype) {
        obj[key] = Emitter.prototype[key]
      }
      return obj
    }

    Emitter.prototype.on = function (event, fn) {
      this._callbacks = this._callbacks || {};
      (this._callbacks[event] = this._callbacks[event] || [])
        .push(fn)
      return this
    }
    Emitter.prototype.once = function (event, fn) {
      var self = this
      this._callbacks = this._callbacks || {}

      function on () {
        self.off(event, on)
        fn.apply(this, arguments)
      }

      fn._off = on
      this.on(event, on)
      return this
    }

    function off (event, fn) {
      this._callbacks = this._callbacks || {}

      // all
      if (0 == arguments.length) {
        this._callbacks = {}
        return this
      }

      // specific event
      var callbacks = this._callbacks[event]
      if (!callbacks) return this

      // remove all handlers
      if (1 == arguments.length) {
        delete this._callbacks[event]
        return this
      }

      // remove specific handler
      var i = index(callbacks, fn._off || fn)
      if (~i) callbacks.splice(i, 1)
      return this
    }
    Emitter.prototype.off = off
    Emitter.prototype.removeListener = off
    Emitter.prototype.removeAllListeners = off
    Emitter.prototype.emit = function (event) {
      this._callbacks = this._callbacks || {}
      var args = [].slice.call(arguments, 1)
        , callbacks = this._callbacks[event]

      if (callbacks) {
        callbacks = callbacks.slice(0)
        for (var i = 0, len = callbacks.length; i < len; ++i) {
          callbacks[i].apply(this, args)
        }
      }

      return this
    }
    Emitter.prototype.listeners = function (event) {
      this._callbacks = this._callbacks || {}
      return this._callbacks[event] || []
    }
    Emitter.prototype.hasListeners = function (event) {
      return !!this.listeners(event).length
    }

  })
  pomeloClient_require.register('NetEase-pomelo-protocol/lib/protocol.js', function (exports, require, module) {
    (function (exports, ByteArray, global) {
      var Protocol = exports

      var PKG_HEAD_BYTES = 4
      var MSG_FLAG_BYTES = 1
      var MSG_ROUTE_CODE_BYTES = 2
      var MSG_ID_MAX_BYTES = 5
      var MSG_ROUTE_LEN_BYTES = 1

      var MSG_ROUTE_CODE_MAX = 0xffff

      var MSG_COMPRESS_ROUTE_MASK = 0x1
      var MSG_TYPE_MASK = 0x7

      var Package = Protocol.Package = {}
      var Message = Protocol.Message = {}

      Package.TYPE_HANDSHAKE = 1
      Package.TYPE_HANDSHAKE_ACK = 2
      Package.TYPE_HEARTBEAT = 3
      Package.TYPE_DATA = 4
      Package.TYPE_KICK = 5

      Message.TYPE_REQUEST = 0
      Message.TYPE_NOTIFY = 1
      Message.TYPE_RESPONSE = 2
      Message.TYPE_PUSH = 3

      function UTF8Length (input) {
        var output = 0
        for (var i = 0; i < input.length; i++) {
          var charCode = input.charCodeAt(i)
          if (charCode > 0x7FF) {
            // Surrogate pair means its a 4 byte character
            // https://unicode.org/charts/PDF/UD800.pdf
            if (0xD800 <= charCode && charCode <= 0xDBFF) { // 11110xxx 10xxxxxx 10xxxxxx 10xxxxxx
              i++
              output++
            }
            output += 3 // 1110xxxx 10xxxxxx 10xxxxxx
          } else if (charCode > 0x7F) { // 110xxxxx 10xxxxxx
            output += 2
          } else {
            output++ // 0xxxxxxx
          }
        }
        return output
      }

      /**
       * pomele client encode
       * id message id;
       * route message route
       * msg message body
       * socketio current support string
       */
      Protocol.strencode = function (str) {
        if (typeof Buffer !== 'undefined' && ByteArray === Buffer) {
          // encoding defaults to 'utf8'
          return (new Buffer(str))
        } else {
          var byteArray = new ByteArray(UTF8Length(str))
          var offset = 0
          for (var i = 0; i < str.length; i++) {
            var charCode = str.charCodeAt(i)
            var codes = null
            if (charCode <= 0x7f) {
              codes = [charCode]
            } else if (charCode <= 0x7ff) {
              codes = [0xc0 | (charCode >> 6), 0x80 | (charCode & 0x3f)]
            } else if (charCode <= 0xffff) {
              if (0xD800 <= charCode && charCode <= 0xDBFF) {
                var lowCharCode = str.charCodeAt(++i) // 低位代理
                if (isNaN(lowCharCode)) {
                  throw new Error('低位代理为空，非法数据')
                }
                charCode = ((charCode - 0xD800) << 10) + (lowCharCode - 0xDC00) + 0x10000
                codes = [0xf0 | (charCode >> 18), 0x80 | ((charCode & 0x3f000) >> 12), 0x80 | ((charCode & 0xfc0) >> 6), 0x80 | (charCode & 0x3f)]
              } else {
                codes = [0xe0 | (charCode >> 12), 0x80 | ((charCode & 0xfc0) >> 6), 0x80 | (charCode & 0x3f)]
              }
            }
            for (var j = 0; j < codes.length; j++) {
              byteArray[offset] = codes[j]
              ++offset
            }
          }
          var _buffer = new ByteArray(offset)
          copyArray(_buffer, 0, byteArray, 0, offset)
          return _buffer
        }
      }

      /**
       * client decode
       * msg String data
       * return Message Object
       */
      Protocol.strdecode = function (buffer) {
        if (typeof Buffer !== 'undefined' && ByteArray === Buffer) {
          // encoding defaults to 'utf8'
          return buffer.toString()
        } else {
          var bytes = new ByteArray(buffer)
          var output = ''
          var offset = 0
          var charCode = 0
          var end = bytes.length
          while (offset < end) {
            if (bytes[offset] < 128) { // 0x80
              charCode = bytes[offset]
              offset += 1
            } else if (bytes[offset] < 224) { // 0xe0
              if (bytes[offset + 1] < 0) {
                throw new Error('非法数据')
              }
              charCode = ((bytes[offset] & 0x1f) << 6) + (bytes[offset + 1] & 0x3f)
              offset += 2
            } else {
              if (bytes[offset + 2] < 0) {
                throw new Error('非法数据')
              }
              if (bytes[offset] < 240) { // 0xf0
                charCode = ((bytes[offset] & 0x0f) << 12) + ((bytes[offset + 1] & 0x3f) << 6) + (bytes[offset + 2] & 0x3f)
                offset += 3
              } else {
                charCode = ((bytes[offset] & 0x07) << 18) + ((bytes[offset + 1] & 0x3f) << 12) + ((bytes[offset + 2] & 0x3f) << 6) + (bytes[offset + 3] & 0x3f)
                offset += 4
              }
            }
            if (charCode > 0xFFFF) {
              charCode -= 0x10000
              output += String.fromCharCode(0xD800 + (charCode >> 10)) // 高位

              charCode = 0xDC00 + (charCode & 0x3FF) // 低位
            }
            output += String.fromCharCode(charCode)
          }
          return output
        }
      }

      /**
       * Package protocol encode.
       *
       * Pomelo package format:
       * +------+-------------+------------------+
       * | type | body length |       body       |
       * +------+-------------+------------------+
       *
       * Head: 4bytes
       *   0: package type,
       *      1 - handshake,
       *      2 - handshake ack,
       *      3 - heartbeat,
       *      4 - data
       *      5 - kick
       *   1 - 3: big-endian body length
       * Body: body length bytes
       *
       * @param  {Number}    type   package type
       * @param  {ByteArray} body   body content in bytes
       * @return {ByteArray}        new byte array that contains encode result
       */
      Package.encode = function (type, body) {
        var length = body ? body.length : 0
        var buffer = new ByteArray(PKG_HEAD_BYTES + length)
        var index = 0
        buffer[index++] = type & 0xff
        buffer[index++] = (length >> 16) & 0xff
        buffer[index++] = (length >> 8) & 0xff
        buffer[index++] = length & 0xff
        if (body) {
          copyArray(buffer, index, body, 0, length)
        }
        return buffer
      }

      /**
       * Package protocol decode.
       * See encode for package format.
       *
       * @param  {ByteArray} buffer byte array containing package content
       * @return {Object}           {type: package type, buffer: body byte array}
       */
      Package.decode = function (buffer) {
        var bytes = new ByteArray(buffer)
        var type = bytes[0]
        var index = 1
        var length = ((bytes[index++]) << 16 | (bytes[index++]) << 8 | bytes[index++]) >>> 0
        var body = length ? new ByteArray(length) : null
        copyArray(body, 0, bytes, PKG_HEAD_BYTES, length)
        return {'type': type, 'body': body}
      }

      /**
       * Message protocol encode.
       *
       * @param  {Number} id            message id
       * @param  {Number} type          message type
       * @param  {Number} compressRoute whether compress route
       * @param  {Number|String} route  route code or route string
       * @param  {Buffer} msg           message body bytes
       * @return {Buffer}               encode result
       */
      Message.encode = function (id, type, compressRoute, route, msg) {
        // caculate message max length
        var idBytes = msgHasId(type) ? caculateMsgIdBytes(id) : 0
        var msgLen = MSG_FLAG_BYTES + idBytes

        if (msgHasRoute(type)) {
          if (compressRoute) {
            if (typeof route !== 'number') {
              throw new Error('error flag for number route!')
            }
            msgLen += MSG_ROUTE_CODE_BYTES
          } else {
            msgLen += MSG_ROUTE_LEN_BYTES
            if (route) {
              route = Protocol.strencode(route)
              if (route.length > 255) {
                throw new Error('route maxlength is overflow')
              }
              msgLen += route.length
            }
          }
        }

        if (msg) {
          msgLen += msg.length
        }

        var buffer = new ByteArray(msgLen)
        var offset = 0

        // add flag
        offset = encodeMsgFlag(type, compressRoute, buffer, offset)

        // add message id
        if (msgHasId(type)) {
          offset = encodeMsgId(id, idBytes, buffer, offset)
        }

        // add route
        if (msgHasRoute(type)) {
          offset = encodeMsgRoute(compressRoute, route, buffer, offset)
        }

        // add body
        if (msg) {
          offset = encodeMsgBody(msg, buffer, offset)
        }

        return buffer
      }

      /**
       * Message protocol decode.
       *
       * @param  {Buffer|Uint8Array} buffer message bytes
       * @return {Object}            message object
       */
      Message.decode = function (buffer) {
        var bytes = new ByteArray(buffer)
        var bytesLen = bytes.length || bytes.byteLength
        var offset = 0
        var id = 0
        var route = null

        // parse flag
        var flag = bytes[offset++]
        var compressRoute = flag & MSG_COMPRESS_ROUTE_MASK
        var type = (flag >> 1) & MSG_TYPE_MASK

        // parse id
        if (msgHasId(type)) {
          var byte = bytes[offset++]
          id = byte & 0x7f
          while (byte & 0x80) {
            id <<= 7
            byte = bytes[offset++]
            id |= byte & 0x7f
          }
        }

        // parse route
        if (msgHasRoute(type)) {
          if (compressRoute) {
            route = (bytes[offset++]) << 8 | bytes[offset++]
          } else {
            var routeLen = bytes[offset++]
            if (routeLen) {
              route = new ByteArray(routeLen)
              copyArray(route, 0, bytes, offset, routeLen)
              route = Protocol.strdecode(route)
            } else {
              route = ''
            }
            offset += routeLen
          }
        }

        // parse body
        var bodyLen = bytesLen - offset
        var body = new ByteArray(bodyLen)

        copyArray(body, 0, bytes, offset, bodyLen)

        return {
          'id': id, 'type': type, 'compressRoute': compressRoute,
          'route': route, 'body': body
        }
      }

      var copyArray = function (dest, doffset, src, soffset, length) {
        if ('function' === typeof src.copy) {
          // Buffer
          src.copy(dest, doffset, soffset, soffset + length)
        } else {
          // Uint8Array
          for (var index = 0; index < length; index++) {
            dest[doffset++] = src[soffset++]
          }
        }
      }

      var msgHasId = function (type) {
        return type === Message.TYPE_REQUEST || type === Message.TYPE_RESPONSE
      }

      var msgHasRoute = function (type) {
        return type === Message.TYPE_REQUEST || type === Message.TYPE_NOTIFY ||
          type === Message.TYPE_PUSH
      }

      var caculateMsgIdBytes = function (id) {
        var len = 0
        do {
          len += 1
          id >>= 7
        } while (id > 0)
        return len
      }

      var encodeMsgFlag = function (type, compressRoute, buffer, offset) {
        if (type !== Message.TYPE_REQUEST && type !== Message.TYPE_NOTIFY &&
          type !== Message.TYPE_RESPONSE && type !== Message.TYPE_PUSH) {
          throw new Error('unkonw message type: ' + type)
        }

        buffer[offset] = (type << 1) | (compressRoute ? 1 : 0)

        return offset + MSG_FLAG_BYTES
      }

      var encodeMsgId = function (id, idBytes, buffer, offset) {
        var index = offset + idBytes - 1
        buffer[index--] = id & 0x7f
        while (index >= offset) {
          id >>= 7
          buffer[index--] = id & 0x7f | 0x80
        }
        return offset + idBytes
      }

      var encodeMsgRoute = function (compressRoute, route, buffer, offset) {
        if (compressRoute) {
          if (route > MSG_ROUTE_CODE_MAX) {
            throw new Error('route number is overflow')
          }

          buffer[offset++] = (route >> 8) & 0xff
          buffer[offset++] = route & 0xff
        } else {
          if (route) {
            buffer[offset++] = route.length & 0xff
            copyArray(buffer, offset, route, 0, route.length)
            offset += route.length
          } else {
            buffer[offset++] = 0
          }
        }

        return offset
      }

      var encodeMsgBody = function (msg, buffer, offset) {
        copyArray(buffer, offset, msg, 0, msg.length)
        return offset + msg.length
      }

      module.exports = Protocol
    })('object' === typeof module ? module.exports : (this.Protocol = {}), 'object' === typeof module ? Buffer : Uint8Array, this)

  })
  pomeloClient_require.register('pomelonode-pomelo-protobuf/lib/client/protobuf.js', function (exports, require, module) {
    /* ProtocolBuffer client 0.1.0*/

    /**
     * pomelo-protobuf
     * @author <zhang0935@gmail.com>
     */

    /**
     * Protocol buffer root
     * In browser, it will be window.protbuf
     */
    (function (exports, global) {
      var Protobuf = exports

      Protobuf.init = function (opts) {
        //On the serverside, use serverProtos to encode messages send to client
        Protobuf.encoder.init(opts.encoderProtos)

        //On the serverside, user clientProtos to decode messages receive from clients
        Protobuf.decoder.init(opts.decoderProtos)
      }

      Protobuf.encode = function (key, msg) {
        return Protobuf.encoder.encode(key, msg)
      }

      Protobuf.decode = function (key, msg) {
        return Protobuf.decoder.decode(key, msg)
      }

      // exports to support for components
      module.exports = Protobuf
    })('object' === typeof module ? module.exports : (this.protobuf = {}), this)

    /**
     * constants
     */
    (function (exports, global) {
      var constants = exports.constants = {}

      constants.TYPES = {
        uInt32: 0,
        sInt32: 0,
        int32: 0,
        double: 1,
        string: 2,
        message: 2,
        float: 5
      }

    })('undefined' !== typeof protobuf ? protobuf : module.exports, this)

    /**
     * util module
     */
    (function (exports, global) {

      var Util = exports.util = {}

      Util.isSimpleType = function (type) {
        return (type === 'uInt32' ||
          type === 'sInt32' ||
          type === 'int32' ||
          type === 'uInt64' ||
          type === 'sInt64' ||
          type === 'float' ||
          type === 'double')
      }

    })('undefined' !== typeof protobuf ? protobuf : module.exports, this)

    /**
     * codec module
     */
    (function (exports, global) {

      var Codec = exports.codec = {}

      var buffer = new ArrayBuffer(8)
      var float32Array = new Float32Array(buffer)
      var float64Array = new Float64Array(buffer)
      var uInt8Array = new Uint8Array(buffer)

      Codec.encodeUInt32 = function (n) {
        var n = parseInt(n)
        if (isNaN(n) || n < 0) {
          return null
        }

        var result = []
        do {
          var tmp = n % 128
          var next = Math.floor(n / 128)

          if (next !== 0) {
            tmp = tmp + 128
          }
          result.push(tmp)
          n = next
        } while (n !== 0)

        return result
      }

      Codec.encodeSInt32 = function (n) {
        var n = parseInt(n)
        if (isNaN(n)) {
          return null
        }
        n = n < 0 ? (Math.abs(n) * 2 - 1) : n * 2

        return Codec.encodeUInt32(n)
      }

      Codec.decodeUInt32 = function (bytes) {
        var n = 0

        for (var i = 0; i < bytes.length; i++) {
          var m = parseInt(bytes[i])
          n = n + ((m & 0x7f) * Math.pow(2, (7 * i)))
          if (m < 128) {
            return n
          }
        }

        return n
      }

      Codec.decodeSInt32 = function (bytes) {
        var n = this.decodeUInt32(bytes)
        var flag = ((n % 2) === 1) ? -1 : 1

        n = ((n % 2 + n) / 2) * flag

        return n
      }

      Codec.encodeFloat = function (float) {
        float32Array[0] = float
        return uInt8Array
      }

      Codec.decodeFloat = function (bytes, offset) {
        if (!bytes || bytes.length < (offset + 4)) {
          return null
        }

        for (var i = 0; i < 4; i++) {
          uInt8Array[i] = bytes[offset + i]
        }

        return float32Array[0]
      }

      Codec.encodeDouble = function (double) {
        float64Array[0] = double
        return uInt8Array.subarray(0, 8)
      }

      Codec.decodeDouble = function (bytes, offset) {
        if (!bytes || bytes.length < (8 + offset)) {
          return null
        }

        for (var i = 0; i < 8; i++) {
          uInt8Array[i] = bytes[offset + i]
        }

        return float64Array[0]
      }

      Codec.encodeStr = function (bytes, offset, str) {
        for (var i = 0; i < str.length; i++) {
          var code = str.charCodeAt(i)
          var codes = encode2UTF8(code)

          for (var j = 0; j < codes.length; j++) {
            bytes[offset] = codes[j]
            offset++
          }
        }

        return offset
      }

      /**
       * Decode string from utf8 bytes
       */
      Codec.decodeStr = function (bytes, offset, length) {
        var array = []
        var end = offset + length

        while (offset < end) {
          var code = 0

          if (bytes[offset] < 128) {
            code = bytes[offset]

            offset += 1
          } else if (bytes[offset] < 224) {
            code = ((bytes[offset] & 0x3f) << 6) + (bytes[offset + 1] & 0x3f)
            offset += 2
          } else {
            code = ((bytes[offset] & 0x0f) << 12) + ((bytes[offset + 1] & 0x3f) << 6) + (bytes[offset + 2] & 0x3f)
            offset += 3
          }

          array.push(code)

        }

        var str = ''
        for (var i = 0; i < array.length;) {
          str += String.fromCharCode.apply(null, array.slice(i, i + 10000))
          i += 10000
        }

        return str
      }

      /**
       * Return the byte length of the str use utf8
       */
      Codec.byteLength = function (str) {
        if (typeof(str) !== 'string') {
          return -1
        }

        var length = 0

        for (var i = 0; i < str.length; i++) {
          var code = str.charCodeAt(i)
          length += codeLength(code)
        }

        return length
      }

      /**
       * Encode a unicode16 char code to utf8 bytes
       */
      function encode2UTF8 (charCode) {
        if (charCode <= 0x7f) {
          return [charCode]
        } else if (charCode <= 0x7ff) {
          return [0xc0 | (charCode >> 6), 0x80 | (charCode & 0x3f)]
        } else {
          return [0xe0 | (charCode >> 12), 0x80 | ((charCode & 0xfc0) >> 6), 0x80 | (charCode & 0x3f)]
        }
      }

      function codeLength (code) {
        if (code <= 0x7f) {
          return 1
        } else if (code <= 0x7ff) {
          return 2
        } else {
          return 3
        }
      }
    })('undefined' !== typeof protobuf ? protobuf : module.exports, this)

    /**
     * encoder module
     */
    (function (exports, global) {

      var protobuf = exports
      var MsgEncoder = exports.encoder = {}

      var codec = protobuf.codec
      var constant = protobuf.constants
      var util = protobuf.util

      MsgEncoder.init = function (protos) {
        this.protos = protos || {}
      }

      MsgEncoder.encode = function (route, msg) {
        //Get protos from protos map use the route as key
        var protos = this.protos[route]

        //Check msg
        if (!checkMsg(msg, protos)) {
          return null
        }

        //Set the length of the buffer 2 times bigger to prevent overflow
        var length = codec.byteLength(JSON.stringify(msg))

        //Init buffer and offset
        var buffer = new ArrayBuffer(length)
        var uInt8Array = new Uint8Array(buffer)
        var offset = 0

        if (!!protos) {
          offset = encodeMsg(uInt8Array, offset, protos, msg)
          if (offset > 0) {
            return uInt8Array.subarray(0, offset)
          }
        }

        return null
      }

      /**
       * Check if the msg follow the defination in the protos
       */
      function checkMsg (msg, protos) {
        if (!protos) {
          return false
        }

        for (var name in protos) {
          var proto = protos[name]

          //All required element must exist
          switch (proto.option) {
            case 'required' :
              if (typeof(msg[name]) === 'undefined') {
                return false
              }
            case 'optional' :
              if (typeof(msg[name]) !== 'undefined') {
                if (!!protos.__messages[proto.type]) {
                  checkMsg(msg[name], protos.__messages[proto.type])
                }
              }
              break
            case 'repeated' :
              //Check nest message in repeated elements
              if (!!msg[name] && !!protos.__messages[proto.type]) {
                for (var i = 0; i < msg[name].length; i++) {
                  if (!checkMsg(msg[name][i], protos.__messages[proto.type])) {
                    return false
                  }
                }
              }
              break
          }
        }

        return true
      }

      function encodeMsg (buffer, offset, protos, msg) {
        for (var name in msg) {
          if (!!protos[name]) {
            var proto = protos[name]

            switch (proto.option) {
              case 'required' :
              case 'optional' :
                offset = writeBytes(buffer, offset, encodeTag(proto.type, proto.tag))
                offset = encodeProp(msg[name], proto.type, offset, buffer, protos)
                break
              case 'repeated' :
                if (msg[name].length > 0) {
                  offset = encodeArray(msg[name], proto, offset, buffer, protos)
                }
                break
            }
          }
        }

        return offset
      }

      function encodeProp (value, type, offset, buffer, protos) {
        switch (type) {
          case 'uInt32':
            offset = writeBytes(buffer, offset, codec.encodeUInt32(value))
            break
          case 'int32' :
          case 'sInt32':
            offset = writeBytes(buffer, offset, codec.encodeSInt32(value))
            break
          case 'float':
            writeBytes(buffer, offset, codec.encodeFloat(value))
            offset += 4
            break
          case 'double':
            writeBytes(buffer, offset, codec.encodeDouble(value))
            offset += 8
            break
          case 'string':
            var length = codec.byteLength(value)

            //Encode length
            offset = writeBytes(buffer, offset, codec.encodeUInt32(length))
            //write string
            codec.encodeStr(buffer, offset, value)
            offset += length
            break
          default :
            if (!!protos.__messages[type]) {
              //Use a tmp buffer to build an internal msg
              var tmpBuffer = new ArrayBuffer(codec.byteLength(JSON.stringify(value)))
              var length = 0

              length = encodeMsg(tmpBuffer, length, protos.__messages[type], value)
              //Encode length
              offset = writeBytes(buffer, offset, codec.encodeUInt32(length))
              //contact the object
              for (var i = 0; i < length; i++) {
                buffer[offset] = tmpBuffer[i]
                offset++
              }
            }
            break
        }

        return offset
      }

      /**
       * Encode reapeated properties, simple msg and object are decode differented
       */
      function encodeArray (array, proto, offset, buffer, protos) {
        var i = 0

        if (util.isSimpleType(proto.type)) {
          offset = writeBytes(buffer, offset, encodeTag(proto.type, proto.tag))
          offset = writeBytes(buffer, offset, codec.encodeUInt32(array.length))
          for (i = 0; i < array.length; i++) {
            offset = encodeProp(array[i], proto.type, offset, buffer)
          }
        } else {
          for (i = 0; i < array.length; i++) {
            offset = writeBytes(buffer, offset, encodeTag(proto.type, proto.tag))
            offset = encodeProp(array[i], proto.type, offset, buffer, protos)
          }
        }

        return offset
      }

      function writeBytes (buffer, offset, bytes) {
        for (var i = 0; i < bytes.length; i++, offset++) {
          buffer[offset] = bytes[i]
        }

        return offset
      }

      function encodeTag (type, tag) {
        var value = constant.TYPES[type] || 2
        return codec.encodeUInt32((tag << 3) | value)
      }
    })('undefined' !== typeof protobuf ? protobuf : module.exports, this)

    /**
     * decoder module
     */
    (function (exports, global) {
      var protobuf = exports
      var MsgDecoder = exports.decoder = {}

      var codec = protobuf.codec
      var util = protobuf.util

      var buffer
      var offset = 0

      MsgDecoder.init = function (protos) {
        this.protos = protos || {}
      }

      MsgDecoder.setProtos = function (protos) {
        if (!!protos) {
          this.protos = protos
        }
      }

      MsgDecoder.decode = function (route, buf) {
        var protos = this.protos[route]

        buffer = buf
        offset = 0

        if (!!protos) {
          return decodeMsg({}, protos, buffer.length)
        }

        return null
      }

      function decodeMsg (msg, protos, length) {
        while (offset < length) {
          var head = getHead()
          var type = head.type
          var tag = head.tag
          var name = protos.__tags[tag]

          switch (protos[name].option) {
            case 'optional' :
            case 'required' :
              msg[name] = decodeProp(protos[name].type, protos)
              break
            case 'repeated' :
              if (!msg[name]) {
                msg[name] = []
              }
              decodeArray(msg[name], protos[name].type, protos)
              break
          }
        }

        return msg
      }

      /**
       * Test if the given msg is finished
       */
      function isFinish (msg, protos) {
        return (!protos.__tags[peekHead().tag])
      }

      /**
       * Get property head from protobuf
       */
      function getHead () {
        var tag = codec.decodeUInt32(getBytes())

        return {
          type: tag & 0x7,
          tag: tag >> 3
        }
      }

      /**
       * Get tag head without move the offset
       */
      function peekHead () {
        var tag = codec.decodeUInt32(peekBytes())

        return {
          type: tag & 0x7,
          tag: tag >> 3
        }
      }

      function decodeProp (type, protos) {
        switch (type) {
          case 'uInt32':
            return codec.decodeUInt32(getBytes())
          case 'int32' :
          case 'sInt32' :
            return codec.decodeSInt32(getBytes())
          case 'float' :
            var float = codec.decodeFloat(buffer, offset)
            offset += 4
            return float
          case 'double' :
            var double = codec.decodeDouble(buffer, offset)
            offset += 8
            return double
          case 'string' :
            var length = codec.decodeUInt32(getBytes())

            var str = codec.decodeStr(buffer, offset, length)
            offset += length

            return str
          default :
            if (!!protos && !!protos.__messages[type]) {
              var length = codec.decodeUInt32(getBytes())
              var msg = {}
              decodeMsg(msg, protos.__messages[type], offset + length)
              return msg
            }
            break
        }
      }

      function decodeArray (array, type, protos) {
        if (util.isSimpleType(type)) {
          var length = codec.decodeUInt32(getBytes())

          for (var i = 0; i < length; i++) {
            array.push(decodeProp(type))
          }
        } else {
          array.push(decodeProp(type, protos))
        }
      }

      function getBytes (flag) {
        var bytes = []
        var pos = offset
        flag = flag || false

        var b

        do {
          b = buffer[pos]
          bytes.push(b)
          pos++
        } while (b >= 128)

        if (!flag) {
          offset = pos
        }
        return bytes
      }

      function peekBytes () {
        return getBytes(true)
      }

    })('undefined' !== typeof protobuf ? protobuf : module.exports, this)

  })
  pomeloClient_require.register('pomelonode-pomelo-jsclient-websocket/lib/pomelo-client.js', function (exports, require, module) {
    (function () {
      var JS_WS_CLIENT_TYPE = 'js-websocket'
      var JS_WS_CLIENT_VERSION = '0.0.1'

      var Protocol = localRoot.Protocol
      var Package = Protocol.Package
      var Message = Protocol.Message
      var EventEmitter = localRoot.EventEmitter

      var RES_OK = 200
      var RES_FAIL = 500
      var RES_OLD_CLIENT = 501

      function Pomelo () {
        this.socket = null
        this.reqId = 0
        this.callbacks = {}
        this.handlers = {}

        this.handlers[Package.TYPE_HANDSHAKE] = handshake.bind(this)
        this.handlers[Package.TYPE_HEARTBEAT] = heartbeat.bind(this)
        this.handlers[Package.TYPE_DATA] = onData.bind(this)
        this.handlers[Package.TYPE_KICK] = onKick.bind(this)

        //Map from request id to route
        this.routeMap = {}

        this.heartbeatInterval = 0
        this.heartbeatTimeout = 0
        this.nextHeartbeatTimeout = 0
        this.gapThreshold = 100   // heartbeat gap threashold
        this.heartbeatId = null
        this.heartbeatTimeoutId = null

        this.handshakeCallback = null

        this.handshakeBuffer = {
          'sys': {
            type: JS_WS_CLIENT_TYPE,
            version: JS_WS_CLIENT_VERSION
          },
          'user': {}
        }

        this.initCallback = function () {}
      }

      Pomelo.prototype = new EventEmitter()
      var pro = Pomelo.prototype

      pro.init = function (params, cb) {
        this.initCallback = cb
        var host = params.host
        var port = params.port
        var scheme = params.scheme || 'ws'

        var url = scheme + '://' + host
        if (port) {
          url += ':' + port
        }

        this.handshakeBuffer.user = params.user
        this.handshakeCallback = params.handshakeCallback
        this.initWebSocket(url, cb)
        return this
      }

      pro.initByUrl = function (url, params, cb) {
        this.initCallback = cb

        this.handshakeBuffer.user = params.user
        this.handshakeCallback = params.handshakeCallback
        this.initWebSocket(url, cb)
        return this
      }

      var onopen = function (event) {
        var obj = Package.encode(Package.TYPE_HANDSHAKE, Protocol.strencode(JSON.stringify(this.handshakeBuffer)))
        this.send(obj)
      }
      var decoder = (function () {
        try {
          return new TextDecoder('utf-8')
        } catch (e) {
          return null
        }
      })()
      var onmessage = function (cb, event) {
        // M+
        var txt = decoder && decoder.decode(event.data).substr(4)
        txt && myConsole(txt.indexOf('"code":500') >= 0 ? 'error' : 'log', '%c收到消息', 'color: #DFC149;border: 1px solid #ccc', txt) // 排除心跳包

        this.processPackage(Package.decode(event.data), cb)
        // new package arrived, update the heartbeat timeout
        if (this.heartbeatTimeout) {
          this.nextHeartbeatTimeout = Date.now() + this.heartbeatTimeout
        }
      }
      var onerror = function (event) {
        this.emit('io-error', event)
        myConsole('error', 'socket error: ', event)
      }
      var onclose = function (event) {
        this.emit('close', event)
        myConsole('warn', 'socket close: ', event)
      }
      pro.initWebSocket = function (url, cb) {
        myConsole('info', 'connect to ' + url)

        this.socket = new WebSocket(url)
        this.socket.binaryType = 'arraybuffer'
        this.socket.onopen = onopen.bind(this)
        this.socket.onmessage = onmessage.bind(this, cb)
        this.socket.onerror = onerror.bind(this)
        this.socket.onclose = onclose.bind(this)
      }

      pro.disconnect = function () {
        if (this.socket) {
          if (this.socket.disconnect) this.socket.disconnect()
          if (this.socket.close) this.socket.close()
          myConsole('info', 'disconnect')
          this.socket = null
        }

        if (this.heartbeatId) {
          clearTimeout(this.heartbeatId)
          this.heartbeatId = null
        }
        if (this.heartbeatTimeoutId) {
          clearTimeout(this.heartbeatTimeoutId)
          this.heartbeatTimeoutId = null
        }
      }

      pro.request = function (route, msg, cb) {
        myConsole('log', '%c发出消息: ' + route, 'color: green;border: 1px solid #ccc', msg)

        if (arguments.length === 2 && typeof msg === 'function') {
          cb = msg
          msg = {}
        } else {
          msg = msg || {}
        }
        route = route || msg.route
        if (!route) {
          return
        }

        this.reqId++
        this.sendMessage(this.reqId, route, msg)

        this.callbacks[this.reqId] = cb
        this.routeMap[this.reqId] = route
      }

      pro.notify = function (route, msg) {
        msg = msg || {}
        this.sendMessage(0, route, msg)
      }

      pro.sendMessage = function (reqId, route, msg) {
        var type = reqId ? Message.TYPE_REQUEST : Message.TYPE_NOTIFY

        //compress message by protobuf
        var protos = !!this.data.protos ? this.data.protos.client : {}
        if (!!protos[route]) {
          msg = protobuf.encode(route, msg)
        } else {
          msg = Protocol.strencode(JSON.stringify(msg))
        }

        var compressRoute = 0
        if (this.dict && this.dict[route]) {
          route = this.dict[route]
          compressRoute = 1
        }

        msg = Message.encode(reqId, type, compressRoute, route, msg)
        var packet = Package.encode(Package.TYPE_DATA, msg)
        this.send(packet)
      }

      pro.send = function (packet) {
        if (this.socket && this.socket.readyState === WebSocket.OPEN) {
          this.socket.send(packet.buffer)
        } else {
          console.warn('socket is not open: readyState ' + this.socket.readyState)
        }
      }

      function heartbeatTimeoutCb () {
        var gap = this.nextHeartbeatTimeout - Date.now()
        if (gap > this.gapThreshold) {
          this.heartbeatTimeoutId = setTimeout(heartbeatTimeoutCb.bind(this), gap)
        } else {
          myConsole('error', 'server heartbeat timeout')
          this.emit('heartbeat timeout')
          this.disconnect()
        }
      }

      function heartbeat (data) {
        if (!this.heartbeatInterval) {
          // no heartbeat
          return
        }

        var obj = Package.encode(Package.TYPE_HEARTBEAT)
        if (this.heartbeatTimeoutId) {
          clearTimeout(this.heartbeatTimeoutId)
          this.heartbeatTimeoutId = null
        }

        if (this.heartbeatId) {
          // already in a heartbeat interval
          return
        }

        var self = this
        this.heartbeatId = setTimeout(function () {
          self.heartbeatId = null
          self.send(obj)

          self.nextHeartbeatTimeout = Date.now() + self.heartbeatTimeout
          self.heartbeatTimeoutId = setTimeout(heartbeatTimeoutCb.bind(self), self.heartbeatTimeout)
        }, this.heartbeatInterval)
      }

      function handshake (data) {
        data = JSON.parse(Protocol.strdecode(data))
        if (data.code === RES_OLD_CLIENT) {
          this.emit('error', 'client version not fullfill')
          return
        }

        if (data.code !== RES_OK) {
          this.emit('error', 'handshake fail')
          return
        }

        this.handshakeInit(data)

        var obj = Package.encode(Package.TYPE_HANDSHAKE_ACK)
        this.send(obj)
        this.emit('connect')
        if (this.initCallback) {
          this.initCallback(this.socket)
          this.initCallback = null
        }
      }

      function onData (data) {
        //probuff decode
        var msg = Message.decode(data)

        if (msg.id > 0) {
          msg.route = this.routeMap[msg.id]
          delete this.routeMap[msg.id]
          if (!msg.route) {
            return
          }
        }

        msg.body = this.deCompose(msg)

        this.processMessage(msg)
      }

      function onKick (data) {
        this.emit('onKick')
      }

      pro.processPackage = function (msg) {
        this.handlers[msg.type](msg.body)
      }

      pro.processMessage = function (msg) {
        if (!msg.id) {
          // server push message
          this.emit('__CLIENT_ROUTE', msg.route, msg.body)
          this.emit(msg.route, msg.body)
          return
        }

        //if have a id then find the callback function with the request
        var cb = this.callbacks[msg.id]

        delete this.callbacks[msg.id]
        if (typeof cb !== 'function') {
          return
        }

        this.emit('__CLIENT_RESPONSE', msg.body)
        cb(msg.body)
      }

      pro.processMessageBatch = function (msgs) {
        for (var i = 0, l = msgs.length; i < l; i++) {
          this.processMessage(msgs[i])
        }
      }

      pro.deCompose = function (msg) {
        var protos = !!this.data.protos ? this.data.protos.server : {}
        var abbrs = this.data.abbrs
        var route = msg.route

        //Decompose route from dict
        if (msg.compressRoute) {
          if (!abbrs[route]) {
            return {}
          }

          route = msg.route = abbrs[route]
        }
        if (!!protos[route]) {
          return protobuf.decode(route, msg.body)
        } else {
          return JSON.parse(Protocol.strdecode(msg.body))
        }
      }

      pro.handshakeInit = function (data) {
        if (data.sys && data.sys['heartbeat']) {
          this.heartbeatInterval = data.sys['heartbeat'] * 1000   // heartbeat interval
          this.heartbeatTimeout = this.heartbeatInterval * 2        // max heartbeat timeout
        } else {
          this.heartbeatInterval = 0
          this.heartbeatTimeout = 0
        }

        this.initData(data)

        if (typeof this.handshakeCallback === 'function') {
          this.handshakeCallback(data.user)
        }
      }

      pro.initData = function (data) {
        if (!data || !data.sys) {
          return
        }
        this.data = this.data || {}
        var dict = data.sys.dict
        var protos = data.sys.protos

        //Init compress dict
        if (dict) {
          this.data.dict = dict
          this.data.abbrs = {}

          for (var route in dict) {
            this.data.abbrs[dict[route]] = route
          }
        }

        //Init protobuf protos
        if (protos) {
          this.data.protos = {
            server: protos.server || {},
            client: protos.client || {}
          }
          if (!!protobuf) {
            protobuf.init({encoderProtos: protos.client, decoderProtos: protos.server})
          }
        }
      }

      module.exports = Pomelo
    })()

  })
  pomeloClient_require.register('boot/index.js', function (exports, require, module) {
    var Emitter = require('emitter')
    localRoot.EventEmitter = Emitter

    var protocol = require('pomelo-protocol')
    localRoot.Protocol = protocol

    var protobuf = require('pomelo-protobuf')
    localRoot.protobuf = protobuf

    var Pomelo = require('pomelo-jsclient-websocket')
    localRoot.Pomelo = Pomelo

  })
  pomeloClient_require.alias('boot/index.js', 'pomelo-client/deps/boot/index.js')
  pomeloClient_require.alias('component-emitter/index.js', 'boot/deps/emitter/index.js')
  pomeloClient_require.alias('component-indexof/index.js', 'component-emitter/deps/indexof/index.js')

  pomeloClient_require.alias('NetEase-pomelo-protocol/lib/protocol.js', 'boot/deps/pomelo-protocol/lib/protocol.js')
  pomeloClient_require.alias('NetEase-pomelo-protocol/lib/protocol.js', 'boot/deps/pomelo-protocol/index.js')
  pomeloClient_require.alias('NetEase-pomelo-protocol/lib/protocol.js', 'NetEase-pomelo-protocol/index.js')

  pomeloClient_require.alias('pomelonode-pomelo-protobuf/lib/client/protobuf.js', 'boot/deps/pomelo-protobuf/lib/client/protobuf.js')
  pomeloClient_require.alias('pomelonode-pomelo-protobuf/lib/client/protobuf.js', 'boot/deps/pomelo-protobuf/index.js')
  pomeloClient_require.alias('pomelonode-pomelo-protobuf/lib/client/protobuf.js', 'pomelonode-pomelo-protobuf/index.js')

  pomeloClient_require.alias('pomelonode-pomelo-jsclient-websocket/lib/pomelo-client.js', 'boot/deps/pomelo-jsclient-websocket/lib/pomelo-client.js')
  pomeloClient_require.alias('pomelonode-pomelo-jsclient-websocket/lib/pomelo-client.js', 'boot/deps/pomelo-jsclient-websocket/index.js')
  pomeloClient_require.alias('pomelonode-pomelo-jsclient-websocket/lib/pomelo-client.js', 'pomelonode-pomelo-jsclient-websocket/index.js')

  pomeloClient_require('boot')
  return localRoot.Pomelo
})))
