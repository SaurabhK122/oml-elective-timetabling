// node_modules/highs/build/highs.mjs
async function Module(moduleArg = {}) {
  var Module2 = moduleArg;
  var ENVIRONMENT_IS_WEB = !!globalThis.window;
  var ENVIRONMENT_IS_WORKER = !!globalThis.WorkerGlobalScope;
  var ENVIRONMENT_IS_NODE = globalThis.process?.versions?.node && globalThis.process?.type != "renderer";
  if (ENVIRONMENT_IS_NODE) {
    const { createRequire } = await import("node:module");
    var require2 = createRequire(import.meta.url);
  }
  const user_print = Module2["print"];
  const user_printErr = Module2["printErr"];
  Module2["print"] = (s) => {
    if (user_print) user_print(s);
  };
  Module2["printErr"] = (s) => {
    if (user_printErr) user_printErr(s);
  };
  var programArgs = [];
  var thisProgram = "./this.program";
  var quit_ = (status, toThrow) => {
    throw toThrow;
  };
  var _scriptName = import.meta.url;
  var scriptDirectory = "";
  function locateFile(path) {
    if (Module2["locateFile"]) {
      return Module2["locateFile"](path, scriptDirectory);
    }
    return scriptDirectory + path;
  }
  var readAsync, readBinary;
  if (ENVIRONMENT_IS_NODE) {
    var fs = require2("node:fs");
    if (_scriptName.startsWith("file:")) {
      scriptDirectory = require2("node:path").dirname(require2("node:url").fileURLToPath(_scriptName)) + "/";
    }
    readBinary = (filename) => {
      filename = isFileURI(filename) ? new URL(filename) : filename;
      var ret = fs.readFileSync(filename);
      return ret;
    };
    readAsync = async (filename, binary = true) => {
      filename = isFileURI(filename) ? new URL(filename) : filename;
      var ret = fs.readFileSync(filename, binary ? void 0 : "utf8");
      return ret;
    };
    if (process.argv.length > 1) {
      thisProgram = process.argv[1].replace(/\\/g, "/");
    }
    programArgs = process.argv.slice(2);
    quit_ = (status, toThrow) => {
      process.exitCode = status;
      throw toThrow;
    };
  } else if (ENVIRONMENT_IS_WEB || ENVIRONMENT_IS_WORKER) {
    try {
      scriptDirectory = new URL(".", _scriptName).href;
    } catch {
    }
    {
      if (ENVIRONMENT_IS_WORKER) {
        readBinary = (url) => {
          var xhr = new XMLHttpRequest();
          xhr.open("GET", url, false);
          xhr.responseType = "arraybuffer";
          xhr.send(null);
          return new Uint8Array(xhr.response);
        };
      }
      readAsync = async (url) => {
        var response = await fetch(url, { credentials: "same-origin" });
        if (response.ok) {
          return response.arrayBuffer();
        }
        throw new Error(response.status + " : " + response.url);
      };
    }
  } else {
  }
  var out = console.log.bind(console);
  var err = console.error.bind(console);
  var wasmBinary;
  var ABORT = false;
  var EXITSTATUS;
  var isFileURI = (filename) => filename.startsWith("file://");
  class EmscriptenEH {
  }
  class EmscriptenSjLj extends EmscriptenEH {
  }
  var runtimeInitialized = false;
  function getMemoryBuffer() {
    return wasmMemory.buffer;
  }
  function updateMemoryViews() {
    if (HEAP8?.buffer?.resizable) return;
    var b = getMemoryBuffer();
    HEAP8 = new Int8Array(b);
    HEAP16 = new Int16Array(b);
    HEAPU8 = new Uint8Array(b);
    HEAPU16 = new Uint16Array(b);
    HEAP32 = new Int32Array(b);
    HEAPU32 = new Uint32Array(b);
    HEAPF32 = new Float32Array(b);
    HEAPF64 = new Float64Array(b);
    HEAP64 = new BigInt64Array(b);
    HEAPU64 = new BigUint64Array(b);
  }
  function preRun() {
    var preRun2 = Module2["preRun"];
    if (preRun2) {
      if (typeof preRun2 == "function") preRun2 = [preRun2];
      onPreRuns.push(...preRun2);
    }
    callRuntimeCallbacks(onPreRuns);
  }
  function initRuntime() {
    runtimeInitialized = true;
    if (!Module2["noFSInit"] && !FS.initialized) FS.init();
    TTY.init();
    wasmExports["v"]();
    FS.ignorePermissions = false;
  }
  function postRun() {
    var postRun2 = Module2["postRun"];
    if (postRun2) {
      if (typeof postRun2 == "function") postRun2 = [postRun2];
      onPostRuns.push(...postRun2);
    }
    callRuntimeCallbacks(onPostRuns);
  }
  function abort(what) {
    Module2["onAbort"]?.(what);
    what = `Aborted(${what})`;
    err(what);
    ABORT = true;
    what += ". Build with -sASSERTIONS for more info.";
    var e = new WebAssembly.RuntimeError(what);
    throw e;
  }
  var wasmBinaryFile;
  function findWasmBinary() {
    if (Module2["locateFile"]) {
      return locateFile("highs.wasm");
    }
    return new URL("highs.wasm", import.meta.url).href;
  }
  function getBinarySync(file) {
    if (readBinary) {
      return readBinary(file);
    }
    throw "both async and sync fetching of the wasm failed";
  }
  async function getWasmBinary(binaryFile) {
    if (!wasmBinary) {
      try {
        var response = await readAsync(binaryFile);
        return new Uint8Array(response);
      } catch {
      }
    }
    return getBinarySync(binaryFile);
  }
  async function instantiateArrayBuffer(binaryFile, imports) {
    try {
      var binary = await getWasmBinary(binaryFile);
      var instance = await WebAssembly.instantiate(binary, imports);
      return instance;
    } catch (reason) {
      err(`failed to asynchronously prepare wasm: ${reason}`);
      abort(reason);
    }
  }
  async function instantiateAsync(binary, binaryFile, imports) {
    if (!binary && !ENVIRONMENT_IS_NODE) {
      try {
        var response = fetch(binaryFile, { credentials: "same-origin" });
        var instantiationResult = await WebAssembly.instantiateStreaming(response, imports);
        return instantiationResult;
      } catch (reason) {
        err(`wasm streaming compile failed: ${reason}`);
        err("falling back to ArrayBuffer instantiation");
      }
    }
    return instantiateArrayBuffer(binaryFile, imports);
  }
  function getWasmImports() {
    var imports = { a: wasmImports };
    return imports;
  }
  async function createWasm() {
    function receiveInstance(instance) {
      wasmExports = instance.exports;
      assignWasmExports(wasmExports);
      updateMemoryViews();
      return wasmExports;
    }
    function receiveInstantiationResult(result2) {
      return receiveInstance(result2["instance"]);
    }
    var info = getWasmImports();
    var instantiateWasm = Module2["instantiateWasm"];
    if (instantiateWasm) {
      return new Promise((resolve) => {
        instantiateWasm(info, (inst) => resolve(receiveInstance(inst)));
      });
    }
    wasmBinaryFile ??= findWasmBinary();
    var result = await instantiateAsync(wasmBinary, wasmBinaryFile, info);
    var exports = receiveInstantiationResult(result);
    return exports;
  }
  class ExitStatus {
    name = "ExitStatus";
    constructor(status) {
      this.message = `Program terminated with exit(${status})`;
      this.status = status;
    }
  }
  var HEAP16;
  var HEAP32;
  var HEAP64;
  var HEAP8;
  var HEAPF32;
  var HEAPF64;
  var HEAPU16;
  var HEAPU32;
  var HEAPU64;
  var HEAPU8;
  var callRuntimeCallbacks = (callbacks) => {
    while (callbacks.length > 0) {
      callbacks.shift()(Module2);
    }
  };
  var onPostRuns = [];
  var onPreRuns = [];
  var noExitRuntime = true;
  var stackRestore = (val) => __emscripten_stack_restore(val);
  var stackSave = () => _emscripten_stack_get_current();
  class ExceptionInfo {
    constructor(excPtr) {
      this.excPtr = excPtr;
      this.ptr = excPtr - 24;
    }
    set_type(type) {
      HEAPU32[this.ptr + 4 >> 2] = type;
    }
    get_type() {
      return HEAPU32[this.ptr + 4 >> 2];
    }
    set_destructor(destructor) {
      HEAPU32[this.ptr + 8 >> 2] = destructor;
    }
    get_destructor() {
      return HEAPU32[this.ptr + 8 >> 2];
    }
    set_caught(caught) {
      caught = caught ? 1 : 0;
      HEAP8[this.ptr + 12] = caught;
    }
    get_caught() {
      return HEAP8[this.ptr + 12] != 0;
    }
    set_rethrown(rethrown) {
      rethrown = rethrown ? 1 : 0;
      HEAP8[this.ptr + 13] = rethrown;
    }
    get_rethrown() {
      return HEAP8[this.ptr + 13] != 0;
    }
    init(type, destructor) {
      this.set_adjusted_ptr(0);
      this.set_type(type);
      this.set_destructor(destructor);
    }
    set_adjusted_ptr(adjustedPtr) {
      HEAPU32[this.ptr + 16 >> 2] = adjustedPtr;
    }
    get_adjusted_ptr() {
      return HEAPU32[this.ptr + 16 >> 2];
    }
  }
  var uncaughtExceptionCount = 0;
  var ___cxa_throw = (ptr, type, destructor) => {
    var info = new ExceptionInfo(ptr);
    info.init(type, destructor);
    uncaughtExceptionCount++;
    abort();
  };
  var syscallGetVarargI = () => {
    var ret = HEAP32[+SYSCALLS.varargs >> 2];
    SYSCALLS.varargs += 4;
    return ret;
  };
  var syscallGetVarargP = syscallGetVarargI;
  var PATH = { isAbs: (path) => path.charAt(0) === "/", splitPath: (filename) => {
    var splitPathRe = /^(\/?|)([\s\S]*?)((?:\.{1,2}|[^\/]+?|)(\.[^.\/]*|))(?:[\/]*)$/;
    return splitPathRe.exec(filename).slice(1);
  }, normalizeArray: (parts, allowAboveRoot) => {
    var up = 0;
    for (var i = parts.length - 1; i >= 0; i--) {
      var last = parts[i];
      if (last === ".") {
        parts.splice(i, 1);
      } else if (last === "..") {
        parts.splice(i, 1);
        up++;
      } else if (up) {
        parts.splice(i, 1);
        up--;
      }
    }
    if (allowAboveRoot) {
      for (; up; up--) {
        parts.unshift("..");
      }
    }
    return parts;
  }, normalize: (path) => {
    var isAbsolute = PATH.isAbs(path), trailingSlash = path.slice(-1) === "/";
    path = PATH.normalizeArray(path.split("/").filter((p) => !!p), !isAbsolute).join("/");
    if (!path && !isAbsolute) {
      path = ".";
    }
    if (path && trailingSlash) {
      path += "/";
    }
    return (isAbsolute ? "/" : "") + path;
  }, dirname: (path) => {
    var result = PATH.splitPath(path), root = result[0], dir = result[1];
    if (!root && !dir) {
      return ".";
    }
    if (dir) {
      dir = dir.slice(0, -1);
    }
    return root + dir;
  }, basename: (path) => path && path.match(/([^\/]+|\/)\/*$/)[1], join: (...paths) => PATH.normalize(paths.join("/")), join2: (l, r) => PATH.normalize(l + "/" + r) };
  var initRandomFill = () => {
    if (ENVIRONMENT_IS_NODE) {
      var nodeCrypto = require2("node:crypto");
      return (view) => (nodeCrypto.randomFillSync(view), 0);
    }
    return (view) => (crypto.getRandomValues(view), 0);
  };
  var randomFill = (view) => (randomFill = initRandomFill())(view);
  var PATH_FS = { resolve: (...args) => {
    var resolvedPath = "", resolvedAbsolute = false;
    for (var i = args.length - 1; i >= -1 && !resolvedAbsolute; i--) {
      var path = i >= 0 ? args[i] : FS.cwd();
      if (typeof path != "string") {
        throw new TypeError("Arguments to path.resolve must be strings");
      } else if (!path) {
        return "";
      }
      resolvedPath = path + "/" + resolvedPath;
      resolvedAbsolute = PATH.isAbs(path);
    }
    resolvedPath = PATH.normalizeArray(resolvedPath.split("/").filter((p) => !!p), !resolvedAbsolute).join("/");
    return (resolvedAbsolute ? "/" : "") + resolvedPath || ".";
  }, relative: (from, to) => {
    from = PATH_FS.resolve(from).slice(1);
    to = PATH_FS.resolve(to).slice(1);
    function trim(arr) {
      var start = 0;
      for (; start < arr.length; start++) {
        if (arr[start] !== "") break;
      }
      var end = arr.length - 1;
      for (; end >= 0; end--) {
        if (arr[end] !== "") break;
      }
      if (start > end) return [];
      return arr.slice(start, end - start + 1);
    }
    var fromParts = trim(from.split("/"));
    var toParts = trim(to.split("/"));
    var length = Math.min(fromParts.length, toParts.length);
    var samePartsLength = length;
    for (var i = 0; i < length; i++) {
      if (fromParts[i] !== toParts[i]) {
        samePartsLength = i;
        break;
      }
    }
    var outputParts = [];
    for (var i = samePartsLength; i < fromParts.length; i++) {
      outputParts.push("..");
    }
    outputParts = outputParts.concat(toParts.slice(samePartsLength));
    return outputParts.join("/");
  } };
  var UTF8Decoder = globalThis.TextDecoder && new TextDecoder();
  var findStringEnd = (heapOrArray, idx, maxBytesToRead, ignoreNul) => {
    var maxIdx = idx + maxBytesToRead;
    if (ignoreNul) return maxIdx;
    while (heapOrArray[idx] && !(idx >= maxIdx)) ++idx;
    return idx;
  };
  var UTF8ArrayToString = (heapOrArray, idx = 0, maxBytesToRead, ignoreNul) => {
    var endPtr = findStringEnd(heapOrArray, idx, maxBytesToRead, ignoreNul);
    if (endPtr - idx > 16 && heapOrArray.buffer && UTF8Decoder) {
      return UTF8Decoder.decode(heapOrArray.subarray(idx, endPtr));
    }
    var str = "";
    while (idx < endPtr) {
      var u0 = heapOrArray[idx++];
      if (!(u0 & 128)) {
        str += String.fromCharCode(u0);
        continue;
      }
      var u1 = heapOrArray[idx++] & 63;
      if ((u0 & 224) == 192) {
        str += String.fromCharCode((u0 & 31) << 6 | u1);
        continue;
      }
      var u2 = heapOrArray[idx++] & 63;
      if ((u0 & 240) == 224) {
        u0 = (u0 & 15) << 12 | u1 << 6 | u2;
      } else {
        u0 = (u0 & 7) << 18 | u1 << 12 | u2 << 6 | heapOrArray[idx++] & 63;
      }
      if (u0 < 65536) {
        str += String.fromCharCode(u0);
      } else {
        var ch = u0 - 65536;
        str += String.fromCharCode(55296 | ch >> 10, 56320 | ch & 1023);
      }
    }
    return str;
  };
  var FS_stdin_getChar_buffer = [];
  var lengthBytesUTF8 = (str) => {
    var len = 0;
    for (var i = 0; i < str.length; ++i) {
      var c = str.charCodeAt(i);
      if (c <= 127) {
        len++;
      } else if (c <= 2047) {
        len += 2;
      } else if (c >= 55296 && c <= 57343) {
        len += 4;
        ++i;
      } else {
        len += 3;
      }
    }
    return len;
  };
  var stringToUTF8Array = (str, heap, outIdx, maxBytesToWrite) => {
    if (!(maxBytesToWrite > 0)) return 0;
    var startIdx = outIdx;
    var endIdx = outIdx + maxBytesToWrite - 1;
    for (var i = 0; i < str.length; ++i) {
      var u = str.codePointAt(i);
      if (u <= 127) {
        if (outIdx >= endIdx) break;
        heap[outIdx++] = u;
      } else if (u <= 2047) {
        if (outIdx + 1 >= endIdx) break;
        heap[outIdx++] = 192 | u >> 6;
        heap[outIdx++] = 128 | u & 63;
      } else if (u <= 65535) {
        if (outIdx + 2 >= endIdx) break;
        heap[outIdx++] = 224 | u >> 12;
        heap[outIdx++] = 128 | u >> 6 & 63;
        heap[outIdx++] = 128 | u & 63;
      } else {
        if (outIdx + 3 >= endIdx) break;
        heap[outIdx++] = 240 | u >> 18;
        heap[outIdx++] = 128 | u >> 12 & 63;
        heap[outIdx++] = 128 | u >> 6 & 63;
        heap[outIdx++] = 128 | u & 63;
        i++;
      }
    }
    heap[outIdx] = 0;
    return outIdx - startIdx;
  };
  var intArrayFromString = (stringy, dontAddNull, length) => {
    var len = length > 0 ? length : lengthBytesUTF8(stringy) + 1;
    var u8array = new Array(len);
    var numBytesWritten = stringToUTF8Array(stringy, u8array, 0, u8array.length);
    if (dontAddNull) u8array.length = numBytesWritten;
    return u8array;
  };
  var FS_stdin_getChar = () => {
    if (!FS_stdin_getChar_buffer.length) {
      var result = null;
      if (ENVIRONMENT_IS_NODE) {
        var BUFSIZE = 256;
        var buf = Buffer.alloc(BUFSIZE);
        var bytesRead = 0;
        var fd = process.stdin.fd;
        try {
          bytesRead = fs.readSync(fd, buf, 0, BUFSIZE);
        } catch (e) {
          if (e.toString().includes("EOF")) bytesRead = 0;
          else throw e;
        }
        if (bytesRead > 0) {
          result = buf.slice(0, bytesRead).toString("utf-8");
        }
      } else if (globalThis.window?.prompt) {
        result = window.prompt("Input: ");
        if (result !== null) {
          result += "\n";
        }
      } else {
      }
      if (!result) {
        return null;
      }
      FS_stdin_getChar_buffer = intArrayFromString(result, true);
    }
    return FS_stdin_getChar_buffer.shift();
  };
  var TTY = { ttys: [], init() {
  }, shutdown() {
  }, register(dev, ops) {
    TTY.ttys[dev] = { input: [], output: [], ops };
    FS.registerDevice(dev, TTY.stream_ops);
  }, stream_ops: { open(stream) {
    var tty = TTY.ttys[stream.node.rdev];
    if (!tty) {
      throw new FS.ErrnoError(43);
    }
    stream.tty = tty;
    stream.seekable = false;
  }, close(stream) {
    stream.tty.ops.fsync(stream.tty);
  }, fsync(stream) {
    stream.tty.ops.fsync(stream.tty);
  }, read(stream, buffer, offset, length, pos) {
    if (!stream.tty || !stream.tty.ops.get_char) {
      throw new FS.ErrnoError(60);
    }
    var bytesRead = 0;
    for (var i = 0; i < length; i++) {
      var result;
      try {
        result = stream.tty.ops.get_char(stream.tty);
      } catch (e) {
        throw new FS.ErrnoError(29);
      }
      if (result === void 0 && bytesRead === 0) {
        throw new FS.ErrnoError(6);
      }
      if (result === null || result === void 0) break;
      bytesRead++;
      buffer[offset + i] = result;
    }
    if (bytesRead) {
      stream.node.atime = Date.now();
    }
    return bytesRead;
  }, write(stream, buffer, offset, length, pos) {
    if (!stream.tty || !stream.tty.ops.put_char) {
      throw new FS.ErrnoError(60);
    }
    try {
      for (var i = 0; i < length; i++) {
        stream.tty.ops.put_char(stream.tty, buffer[offset + i]);
      }
    } catch (e) {
      throw new FS.ErrnoError(29);
    }
    if (length) {
      stream.node.mtime = stream.node.ctime = Date.now();
    }
    return i;
  } }, default_tty_ops: { get_char(tty) {
    return FS_stdin_getChar();
  }, put_char(tty, val) {
    if (val === null || val === 10) {
      out(UTF8ArrayToString(tty.output));
      tty.output = [];
    } else {
      if (val != 0) tty.output.push(val);
    }
  }, fsync(tty) {
    if (tty.output?.length > 0) {
      out(UTF8ArrayToString(tty.output));
      tty.output = [];
    }
  }, ioctl_tcgets(tty) {
    return { c_iflag: 25856, c_oflag: 5, c_cflag: 191, c_lflag: 35387, c_cc: [3, 28, 127, 21, 4, 0, 1, 0, 17, 19, 26, 0, 18, 15, 23, 22, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0] };
  }, ioctl_tcsets(tty, optional_actions, data) {
    return 0;
  }, ioctl_tiocgwinsz(tty) {
    return [24, 80];
  } }, default_tty1_ops: { put_char(tty, val) {
    if (val === null || val === 10) {
      err(UTF8ArrayToString(tty.output));
      tty.output = [];
    } else {
      if (val != 0) tty.output.push(val);
    }
  }, fsync(tty) {
    if (tty.output?.length > 0) {
      err(UTF8ArrayToString(tty.output));
      tty.output = [];
    }
  } } };
  var mmapAlloc = (size) => {
    abort();
  };
  var MEMFS = { ops_table: null, mount(mount) {
    return MEMFS.createNode(null, "/", 16895, 0);
  }, createNode(parent, name, mode, dev) {
    if (FS.isBlkdev(mode) || FS.isFIFO(mode)) {
      throw new FS.ErrnoError(63);
    }
    MEMFS.ops_table ||= { dir: { node: { getattr: MEMFS.node_ops.getattr, setattr: MEMFS.node_ops.setattr, lookup: MEMFS.node_ops.lookup, mknod: MEMFS.node_ops.mknod, rename: MEMFS.node_ops.rename, unlink: MEMFS.node_ops.unlink, rmdir: MEMFS.node_ops.rmdir, readdir: MEMFS.node_ops.readdir, symlink: MEMFS.node_ops.symlink }, stream: { llseek: MEMFS.stream_ops.llseek } }, file: { node: { getattr: MEMFS.node_ops.getattr, setattr: MEMFS.node_ops.setattr }, stream: { llseek: MEMFS.stream_ops.llseek, read: MEMFS.stream_ops.read, write: MEMFS.stream_ops.write, mmap: MEMFS.stream_ops.mmap, msync: MEMFS.stream_ops.msync } }, link: { node: { getattr: MEMFS.node_ops.getattr, setattr: MEMFS.node_ops.setattr, readlink: MEMFS.node_ops.readlink }, stream: {} }, chrdev: { node: { getattr: MEMFS.node_ops.getattr, setattr: MEMFS.node_ops.setattr }, stream: FS.chrdev_stream_ops } };
    var node = FS.createNode(parent, name, mode, dev);
    if (FS.isDir(node.mode)) {
      node.node_ops = MEMFS.ops_table.dir.node;
      node.stream_ops = MEMFS.ops_table.dir.stream;
      node.contents = {};
    } else if (FS.isFile(node.mode)) {
      node.node_ops = MEMFS.ops_table.file.node;
      node.stream_ops = MEMFS.ops_table.file.stream;
      node.usedBytes = 0;
      node.contents = MEMFS.emptyFileContents ??= new Uint8Array(0);
    } else if (FS.isLink(node.mode)) {
      node.node_ops = MEMFS.ops_table.link.node;
      node.stream_ops = MEMFS.ops_table.link.stream;
    } else if (FS.isChrdev(node.mode)) {
      node.node_ops = MEMFS.ops_table.chrdev.node;
      node.stream_ops = MEMFS.ops_table.chrdev.stream;
    }
    node.atime = node.mtime = node.ctime = Date.now();
    if (parent) {
      parent.contents[name] = node;
      parent.atime = parent.mtime = parent.ctime = node.atime;
    }
    return node;
  }, getFileDataAsTypedArray(node) {
    return node.contents.subarray(0, node.usedBytes);
  }, expandFileStorage(node, newCapacity) {
    var prevCapacity = node.contents.length;
    if (prevCapacity >= newCapacity) return;
    var CAPACITY_DOUBLING_MAX = 1024 * 1024;
    newCapacity = Math.max(newCapacity, prevCapacity * (prevCapacity < CAPACITY_DOUBLING_MAX ? 2 : 1.125) >>> 0);
    if (prevCapacity) newCapacity = Math.max(newCapacity, 256);
    var oldContents = MEMFS.getFileDataAsTypedArray(node);
    node.contents = new Uint8Array(newCapacity);
    node.contents.set(oldContents);
  }, resizeFileStorage(node, newSize) {
    if (node.usedBytes == newSize) return;
    var oldContents = node.contents;
    node.contents = new Uint8Array(newSize);
    node.contents.set(oldContents.subarray(0, Math.min(newSize, node.usedBytes)));
    node.usedBytes = newSize;
  }, node_ops: { getattr(node) {
    var attr = {};
    attr.dev = FS.isChrdev(node.mode) ? node.id : 1;
    attr.ino = node.id;
    attr.mode = node.mode;
    attr.nlink = 1;
    attr.uid = 0;
    attr.gid = 0;
    attr.rdev = node.rdev;
    if (FS.isDir(node.mode)) {
      attr.size = 4096;
    } else if (FS.isFile(node.mode)) {
      attr.size = node.usedBytes;
    } else if (FS.isLink(node.mode)) {
      attr.size = node.link.length;
    } else {
      attr.size = 0;
    }
    attr.atime = new Date(node.atime);
    attr.mtime = new Date(node.mtime);
    attr.ctime = new Date(node.ctime);
    attr.blksize = 4096;
    attr.blocks = Math.ceil(attr.size / attr.blksize);
    return attr;
  }, setattr(node, attr) {
    for (const key3 of ["mode", "atime", "mtime", "ctime"]) {
      if (attr[key3] != null) {
        node[key3] = attr[key3];
      }
    }
    if (attr.size !== void 0) {
      MEMFS.resizeFileStorage(node, attr.size);
    }
  }, lookup(parent, name) {
    if (!MEMFS.doesNotExistError) {
      MEMFS.doesNotExistError = new FS.ErrnoError(44);
      MEMFS.doesNotExistError.stack = "<generic error, no stack>";
    }
    throw MEMFS.doesNotExistError;
  }, mknod(parent, name, mode, dev) {
    return MEMFS.createNode(parent, name, mode, dev);
  }, rename(old_node, new_dir, new_name) {
    var new_node;
    try {
      new_node = FS.lookupNode(new_dir, new_name);
    } catch (e) {
    }
    if (new_node) {
      if (FS.isDir(old_node.mode)) {
        for (var i in new_node.contents) {
          throw new FS.ErrnoError(55);
        }
      }
      FS.hashRemoveNode(new_node);
    }
    delete old_node.parent.contents[old_node.name];
    new_dir.contents[new_name] = old_node;
    old_node.name = new_name;
    new_dir.ctime = new_dir.mtime = old_node.parent.ctime = old_node.parent.mtime = Date.now();
  }, unlink(parent, name) {
    delete parent.contents[name];
    parent.ctime = parent.mtime = Date.now();
  }, rmdir(parent, name) {
    var node = FS.lookupNode(parent, name);
    for (var i in node.contents) {
      throw new FS.ErrnoError(55);
    }
    delete parent.contents[name];
    parent.ctime = parent.mtime = Date.now();
  }, readdir(node) {
    return [".", "..", ...Object.keys(node.contents)];
  }, symlink(parent, newname, oldpath) {
    var node = MEMFS.createNode(parent, newname, 511 | 40960, 0);
    node.link = oldpath;
    return node;
  }, readlink(node) {
    if (!FS.isLink(node.mode)) {
      throw new FS.ErrnoError(28);
    }
    return node.link;
  } }, stream_ops: { read(stream, buffer, offset, length, position) {
    var contents = stream.node.contents;
    if (position >= stream.node.usedBytes) return 0;
    var size = Math.min(stream.node.usedBytes - position, length);
    buffer.set(contents.subarray(position, position + size), offset);
    return size;
  }, write(stream, buffer, offset, length, position, canOwn) {
    if (buffer.buffer === HEAP8.buffer) {
      canOwn = false;
    }
    if (!length) return 0;
    var node = stream.node;
    node.mtime = node.ctime = Date.now();
    if (canOwn) {
      node.contents = buffer.subarray(offset, offset + length);
      node.usedBytes = length;
    } else if (node.usedBytes === 0 && position === 0) {
      node.contents = buffer.slice(offset, offset + length);
      node.usedBytes = length;
    } else {
      MEMFS.expandFileStorage(node, position + length);
      node.contents.set(buffer.subarray(offset, offset + length), position);
      node.usedBytes = Math.max(node.usedBytes, position + length);
    }
    return length;
  }, llseek(stream, offset, whence) {
    var position = offset;
    if (whence === 1) {
      position += stream.position;
    } else if (whence === 2) {
      if (FS.isFile(stream.node.mode)) {
        position += stream.node.usedBytes;
      }
    }
    if (position < 0) {
      throw new FS.ErrnoError(28);
    }
    return position;
  }, mmap(stream, length, position, prot, flags) {
    if (!FS.isFile(stream.node.mode)) {
      throw new FS.ErrnoError(43);
    }
    var ptr;
    var allocated;
    var contents = stream.node.contents;
    if (!(flags & 2) && contents.buffer === HEAP8.buffer) {
      allocated = false;
      ptr = contents.byteOffset;
    } else {
      allocated = true;
      ptr = mmapAlloc(length);
      if (!ptr) {
        throw new FS.ErrnoError(48);
      }
      if (contents) {
        if (position > 0 || position + length < contents.length) {
          if (contents.subarray) {
            contents = contents.subarray(position, position + length);
          } else {
            contents = Array.prototype.slice.call(contents, position, position + length);
          }
        }
        HEAP8.set(contents, ptr);
      }
    }
    return { ptr, allocated };
  }, msync(stream, buffer, offset, length, mmapFlags) {
    MEMFS.stream_ops.write(stream, buffer, 0, length, offset, false);
    return 0;
  } } };
  var FS_modeStringToFlags = (str) => {
    if (typeof str != "string") return str;
    var flagModes = { r: 0, "r+": 2, w: 512 | 64 | 1, "w+": 512 | 64 | 2, a: 1024 | 64 | 1, "a+": 1024 | 64 | 2 };
    var flags = flagModes[str];
    if (typeof flags == "undefined") {
      throw new Error(`Unknown file open mode: ${str}`);
    }
    return flags;
  };
  var FS_fileDataToTypedArray = (data) => {
    if (typeof data == "string") {
      data = intArrayFromString(data, true);
    }
    if (!data.subarray) {
      data = new Uint8Array(data);
    }
    return data;
  };
  var FS_getMode = (canRead, canWrite) => {
    var mode = 0;
    if (canRead) mode |= 292 | 73;
    if (canWrite) mode |= 146;
    return mode;
  };
  var asyncLoad = async (url) => {
    var arrayBuffer = await readAsync(url);
    return new Uint8Array(arrayBuffer);
  };
  var FS_createDataFile = (...args) => FS.createDataFile(...args);
  var getUniqueRunDependency = (id) => id;
  var dependenciesPromise = null;
  var resolveRunDependencies = async () => dependenciesPromise;
  var runDependencies = 0;
  var dependenciesPromiseResolve = null;
  var removeRunDependency = (id) => {
    runDependencies--;
    Module2["monitorRunDependencies"]?.(runDependencies);
    if (!runDependencies) {
      dependenciesPromiseResolve();
    }
  };
  var addRunDependency = (id) => {
    if (!runDependencies) {
      dependenciesPromise = new Promise((resolve) => dependenciesPromiseResolve = resolve);
    }
    runDependencies++;
    Module2["monitorRunDependencies"]?.(runDependencies);
  };
  var preloadPlugins = [];
  var FS_handledByPreloadPlugin = async (byteArray, fullname) => {
    if (typeof Browser != "undefined") Browser.init();
    for (var plugin of preloadPlugins) {
      if (plugin["canHandle"](fullname)) {
        return plugin["handle"](byteArray, fullname);
      }
    }
    return byteArray;
  };
  var FS_preloadFile = async (parent, name, url, canRead, canWrite, dontCreateFile, canOwn, preFinish) => {
    var fullname = name ? PATH_FS.resolve(PATH.join2(parent, name)) : parent;
    var dep = getUniqueRunDependency(`cp ${fullname}`);
    addRunDependency(dep);
    try {
      var byteArray = url;
      if (typeof url == "string") {
        byteArray = await asyncLoad(url);
      }
      byteArray = await FS_handledByPreloadPlugin(byteArray, fullname);
      preFinish?.();
      if (!dontCreateFile) {
        FS_createDataFile(parent, name, byteArray, canRead, canWrite, canOwn);
      }
    } finally {
      removeRunDependency(dep);
    }
  };
  var FS_createPreloadedFile = (parent, name, url, canRead, canWrite, onload, onerror, dontCreateFile, canOwn, preFinish) => {
    FS_preloadFile(parent, name, url, canRead, canWrite, dontCreateFile, canOwn, preFinish).then(onload).catch(onerror);
  };
  var FS = { root: null, mounts: [], devices: {}, streams: [], nextInode: 1, nameTable: null, currentPath: "/", initialized: false, ignorePermissions: true, filesystems: null, syncFSRequests: 0, ErrnoError: class {
    name = "ErrnoError";
    constructor(errno) {
      this.errno = errno;
    }
  }, FSStream: class {
    shared = {};
    get object() {
      return this.node;
    }
    set object(val) {
      this.node = val;
    }
    get isRead() {
      return (this.flags & 2097155) !== 1;
    }
    get isWrite() {
      return (this.flags & 2097155) !== 0;
    }
    get isAppend() {
      return this.flags & 1024;
    }
    get flags() {
      return this.shared.flags;
    }
    set flags(val) {
      this.shared.flags = val;
    }
    get position() {
      return this.shared.position;
    }
    set position(val) {
      this.shared.position = val;
    }
  }, FSNode: class {
    node_ops = {};
    stream_ops = {};
    readMode = 292 | 73;
    writeMode = 146;
    mounted = null;
    constructor(parent, name, mode, rdev) {
      if (!parent) {
        parent = this;
      }
      this.parent = parent;
      this.mount = parent.mount;
      this.id = FS.nextInode++;
      this.name = name;
      this.mode = mode;
      this.rdev = rdev;
      this.atime = this.mtime = this.ctime = Date.now();
    }
    get read() {
      return (this.mode & this.readMode) === this.readMode;
    }
    set read(val) {
      val ? this.mode |= this.readMode : this.mode &= ~this.readMode;
    }
    get write() {
      return (this.mode & this.writeMode) === this.writeMode;
    }
    set write(val) {
      val ? this.mode |= this.writeMode : this.mode &= ~this.writeMode;
    }
    get isFolder() {
      return FS.isDir(this.mode);
    }
    get isDevice() {
      return FS.isChrdev(this.mode);
    }
    addListener(cb, exclusive = false) {
      var entry = { cb, exclusive };
      var listeners = this.listeners ??= /* @__PURE__ */ new Set();
      listeners.add(entry);
      return { listeners, entry };
    }
    notifyListeners(flags) {
      if (!this.listeners) return;
      var excl;
      for (var entry of this.listeners) {
        if (entry.exclusive) (excl ||= []).push(entry);
        else entry.cb(flags);
      }
      if (excl) {
        var i = (this.exclTurn || 0) % excl.length;
        this.exclTurn = i + 1;
        excl[i].cb(flags);
      }
    }
  }, lookupPath(path, opts = {}) {
    if (!path) {
      throw new FS.ErrnoError(44);
    }
    opts.follow_mount ??= true;
    if (!PATH.isAbs(path)) {
      path = FS.cwd() + "/" + path;
    }
    linkloop: for (var nlinks = 0; nlinks < 40; nlinks++) {
      var parts = path.split("/").filter((p) => !!p);
      var current = FS.root;
      var current_path = "/";
      for (var i = 0; i < parts.length; i++) {
        var islast = i === parts.length - 1;
        if (islast && opts.parent) {
          break;
        }
        if (parts[i] === ".") {
          continue;
        }
        if (parts[i] === "..") {
          current_path = PATH.dirname(current_path);
          if (FS.isRoot(current)) {
            path = current_path + "/" + parts.slice(i + 1).join("/");
            nlinks--;
            continue linkloop;
          } else {
            current = current.parent;
          }
          continue;
        }
        current_path = PATH.join2(current_path, parts[i]);
        try {
          current = FS.lookupNode(current, parts[i]);
        } catch (e) {
          if (e?.errno === 44 && islast && opts.noent_okay) {
            return { path: current_path };
          }
          throw e;
        }
        if (FS.isMountpoint(current) && (!islast || opts.follow_mount)) {
          current = current.mounted.root;
        }
        if (FS.isLink(current.mode) && (!islast || opts.follow)) {
          if (!current.node_ops.readlink) {
            throw new FS.ErrnoError(52);
          }
          var link = current.node_ops.readlink(current);
          if (!PATH.isAbs(link)) {
            link = PATH.dirname(current_path) + "/" + link;
          }
          path = link + "/" + parts.slice(i + 1).join("/");
          continue linkloop;
        }
      }
      return { path: current_path, node: current };
    }
    throw new FS.ErrnoError(32);
  }, getPath(node) {
    var path;
    while (true) {
      if (FS.isRoot(node)) {
        var mount = node.mount.mountpoint;
        if (!path) return mount;
        return mount[mount.length - 1] !== "/" ? `${mount}/${path}` : mount + path;
      }
      path = path ? `${node.name}/${path}` : node.name;
      node = node.parent;
    }
  }, hashName(parentid, name) {
    var hash = 0;
    for (var i = 0; i < name.length; i++) {
      hash = (hash << 5) - hash + name.charCodeAt(i) | 0;
    }
    return (parentid + hash >>> 0) % FS.nameTable.length;
  }, hashAddNode(node) {
    var hash = FS.hashName(node.parent.id, node.name);
    node.name_next = FS.nameTable[hash];
    FS.nameTable[hash] = node;
  }, hashRemoveNode(node) {
    var hash = FS.hashName(node.parent.id, node.name);
    if (FS.nameTable[hash] === node) {
      FS.nameTable[hash] = node.name_next;
    } else {
      var current = FS.nameTable[hash];
      while (current) {
        if (current.name_next === node) {
          current.name_next = node.name_next;
          break;
        }
        current = current.name_next;
      }
    }
  }, lookupNode(parent, name) {
    var errCode = FS.mayLookup(parent);
    if (errCode) {
      throw new FS.ErrnoError(errCode);
    }
    var hash = FS.hashName(parent.id, name);
    for (var node = FS.nameTable[hash]; node; node = node.name_next) {
      var nodeName = node.name;
      if (node.parent.id === parent.id && nodeName === name) {
        return node;
      }
    }
    return FS.lookup(parent, name);
  }, createNode(parent, name, mode, rdev) {
    var node = new FS.FSNode(parent, name, mode, rdev);
    FS.hashAddNode(node);
    return node;
  }, destroyNode(node) {
    FS.hashRemoveNode(node);
  }, isRoot(node) {
    return node === node.parent;
  }, isMountpoint(node) {
    return !!node.mounted;
  }, isFile(mode) {
    return (mode & 61440) === 32768;
  }, isDir(mode) {
    return (mode & 61440) === 16384;
  }, isLink(mode) {
    return (mode & 61440) === 40960;
  }, isChrdev(mode) {
    return (mode & 61440) === 8192;
  }, isBlkdev(mode) {
    return (mode & 61440) === 24576;
  }, isFIFO(mode) {
    return (mode & 61440) === 4096;
  }, isSocket(mode) {
    return (mode & 49152) === 49152;
  }, flagsToPermissionString(flag) {
    var perms = ["r", "w", "rw"][flag & 3];
    if (flag & 512) {
      perms += "w";
    }
    return perms;
  }, nodePermissions(node, perms) {
    if (FS.ignorePermissions) {
      return 0;
    }
    if (perms.includes("r") && !(node.mode & 292)) {
      return 2;
    }
    if (perms.includes("w") && !(node.mode & 146)) {
      return 2;
    }
    if (perms.includes("x") && !(node.mode & 73)) {
      return 2;
    }
    return 0;
  }, mayLookup(dir) {
    if (!FS.isDir(dir.mode)) return 54;
    var errCode = FS.nodePermissions(dir, "x");
    if (errCode) return errCode;
    if (!dir.node_ops.lookup) return 2;
    return 0;
  }, mayCreate(dir, name) {
    if (!FS.isDir(dir.mode)) {
      return 54;
    }
    try {
      var node = FS.lookupNode(dir, name);
      return 20;
    } catch (e) {
    }
    return FS.nodePermissions(dir, "wx");
  }, mayDelete(dir, name, isdir) {
    var node;
    try {
      node = FS.lookupNode(dir, name);
    } catch (e) {
      return e.errno;
    }
    var errCode = FS.nodePermissions(dir, "wx");
    if (errCode) {
      return errCode;
    }
    if (isdir) {
      if (!FS.isDir(node.mode)) {
        return 54;
      }
      if (FS.isRoot(node) || FS.getPath(node) === FS.cwd()) {
        return 10;
      }
    } else if (FS.isDir(node.mode)) {
      return 31;
    }
    return 0;
  }, mayOpen(node, flags) {
    if (!node) {
      return 44;
    }
    if (FS.isLink(node.mode)) {
      return 32;
    }
    var mode = FS.flagsToPermissionString(flags);
    if (FS.isDir(node.mode)) {
      if (mode !== "r" || flags & (512 | 64)) {
        return 31;
      }
    }
    return FS.nodePermissions(node, mode);
  }, checkOpExists(op, err2) {
    if (!op) {
      throw new FS.ErrnoError(err2);
    }
    return op;
  }, MAX_OPEN_FDS: 4096, nextfd() {
    for (var fd = 0; fd <= FS.MAX_OPEN_FDS; fd++) {
      if (!FS.streams[fd]) {
        return fd;
      }
    }
    throw new FS.ErrnoError(33);
  }, getStreamChecked(fd) {
    var stream = FS.getStream(fd);
    if (!stream) {
      throw new FS.ErrnoError(8);
    }
    return stream;
  }, getStream: (fd) => FS.streams[fd], createStream(stream, fd = -1) {
    stream = Object.assign(new FS.FSStream(), stream);
    if (fd == -1) {
      fd = FS.nextfd();
    }
    stream.fd = fd;
    FS.streams[fd] = stream;
    return stream;
  }, closeStream(fd) {
    FS.streams[fd] = null;
  }, dupStream(origStream, fd = -1) {
    var stream = FS.createStream(origStream, fd);
    stream.stream_ops?.dup?.(stream);
    return stream;
  }, doSetAttr(stream, node, attr) {
    var setattr = stream?.stream_ops.setattr;
    var arg = setattr ? stream : node;
    setattr ??= node.node_ops.setattr;
    FS.checkOpExists(setattr, 63);
    try {
      setattr(arg, attr);
    } catch (e) {
      if (e instanceof RangeError) {
        throw new FS.ErrnoError(22);
      }
      throw e;
    }
  }, chrdev_stream_ops: { open(stream) {
    var device = FS.getDevice(stream.node.rdev);
    stream.stream_ops = device.stream_ops;
    stream.stream_ops.open?.(stream);
  }, llseek() {
    throw new FS.ErrnoError(70);
  } }, major: (dev) => dev >> 8, minor: (dev) => dev & 255, makedev: (ma, mi) => ma << 8 | mi, registerDevice(dev, ops) {
    FS.devices[dev] = { stream_ops: ops };
  }, getDevice: (dev) => FS.devices[dev], getMounts(mount) {
    var mounts = [];
    var check = [mount];
    while (check.length) {
      var m = check.pop();
      mounts.push(m);
      check.push(...m.mounts);
    }
    return mounts;
  }, syncfs(populate, callback) {
    if (typeof populate == "function") {
      callback = populate;
      populate = false;
    }
    FS.syncFSRequests++;
    if (FS.syncFSRequests > 1) {
      err(`warning: ${FS.syncFSRequests} FS.syncfs operations in flight at once, probably just doing extra work`);
    }
    var mounts = FS.getMounts(FS.root.mount);
    var completed = 0;
    function doCallback(errCode) {
      FS.syncFSRequests--;
      return callback(errCode);
    }
    function done(errCode) {
      if (errCode) {
        if (!done.errored) {
          done.errored = true;
          return doCallback(errCode);
        }
        return;
      }
      if (++completed >= mounts.length) {
        doCallback(null);
      }
    }
    for (var mount of mounts) {
      if (mount.type.syncfs) {
        mount.type.syncfs(mount, populate, done);
      } else {
        done(null);
      }
    }
  }, mount(type, opts, mountpoint) {
    var root = mountpoint === "/";
    var pseudo = !mountpoint;
    var node;
    if (root && FS.root) {
      throw new FS.ErrnoError(10);
    } else if (!root && !pseudo) {
      var lookup = FS.lookupPath(mountpoint, { follow_mount: false });
      mountpoint = lookup.path;
      node = lookup.node;
      if (FS.isMountpoint(node)) {
        throw new FS.ErrnoError(10);
      }
      if (!FS.isDir(node.mode)) {
        throw new FS.ErrnoError(54);
      }
    }
    var mount = { type, opts, mountpoint, mounts: [] };
    var mountRoot = type.mount(mount);
    mountRoot.mount = mount;
    mount.root = mountRoot;
    if (root) {
      FS.root = mountRoot;
    } else if (node) {
      node.mounted = mount;
      if (node.mount) {
        node.mount.mounts.push(mount);
      }
    }
    return mountRoot;
  }, unmount(mountpoint) {
    var lookup = FS.lookupPath(mountpoint, { follow_mount: false });
    if (!FS.isMountpoint(lookup.node)) {
      throw new FS.ErrnoError(28);
    }
    var node = lookup.node;
    var mount = node.mounted;
    var mounts = FS.getMounts(mount);
    for (var [hash, current] of Object.entries(FS.nameTable)) {
      while (current) {
        var next = current.name_next;
        if (mounts.includes(current.mount)) {
          FS.destroyNode(current);
        }
        current = next;
      }
    }
    node.mounted = null;
    var idx = node.mount.mounts.indexOf(mount);
    node.mount.mounts.splice(idx, 1);
  }, lookup(parent, name) {
    return parent.node_ops.lookup(parent, name);
  }, mknod(path, mode, dev) {
    var lookup = FS.lookupPath(path, { parent: true });
    var parent = lookup.node;
    var name = PATH.basename(path);
    if (!name) {
      throw new FS.ErrnoError(28);
    }
    if (name === "." || name === "..") {
      throw new FS.ErrnoError(20);
    }
    var errCode = FS.mayCreate(parent, name);
    if (errCode) {
      throw new FS.ErrnoError(errCode);
    }
    if (!parent.node_ops.mknod) {
      throw new FS.ErrnoError(63);
    }
    return parent.node_ops.mknod(parent, name, mode, dev);
  }, statfs(path) {
    return FS.statfsNode(FS.lookupPath(path, { follow: true }).node);
  }, statfsStream(stream) {
    return FS.statfsNode(stream.node);
  }, statfsNode(node) {
    var rtn = { bsize: 4096, frsize: 4096, blocks: 1e6, bfree: 5e5, bavail: 5e5, files: FS.nextInode, ffree: FS.nextInode - 1, fsid: 42, flags: 2, namelen: 255 };
    if (node.node_ops.statfs) {
      Object.assign(rtn, node.node_ops.statfs(node.mount.opts.root));
    }
    return rtn;
  }, create(path, mode = 438) {
    mode &= 4095;
    mode |= 32768;
    return FS.mknod(path, mode, 0);
  }, mkdir(path, mode = 511) {
    mode &= 511 | 512;
    mode |= 16384;
    return FS.mknod(path, mode, 0);
  }, mkdirTree(path, mode) {
    var dirs = path.split("/");
    var d = "";
    for (var dir of dirs) {
      if (!dir) continue;
      if (d || PATH.isAbs(path)) d += "/";
      d += dir;
      try {
        FS.mkdir(d, mode);
      } catch (e) {
        if (e.errno != 20) throw e;
      }
    }
  }, mkdev(path, mode, dev) {
    if (typeof dev == "undefined") {
      dev = mode;
      mode = 438;
    }
    mode |= 8192;
    return FS.mknod(path, mode, dev);
  }, symlink(oldpath, newpath) {
    if (!PATH_FS.resolve(oldpath)) {
      throw new FS.ErrnoError(44);
    }
    var lookup = FS.lookupPath(newpath, { parent: true });
    var parent = lookup.node;
    if (!parent) {
      throw new FS.ErrnoError(44);
    }
    var newname = PATH.basename(newpath);
    var errCode = FS.mayCreate(parent, newname);
    if (errCode) {
      throw new FS.ErrnoError(errCode);
    }
    if (!parent.node_ops.symlink) {
      throw new FS.ErrnoError(63);
    }
    return parent.node_ops.symlink(parent, newname, oldpath);
  }, link(oldpath, newpath, flags) {
    var lookup = FS.lookupPath(newpath, { parent: true });
    var parent = lookup.node;
    if (!parent) {
      throw new FS.ErrnoError(44);
    }
    var newname = PATH.basename(newpath);
    var errCode = FS.mayCreate(parent, newname);
    if (errCode) {
      throw new FS.ErrnoError(errCode);
    }
    if (!parent.node_ops.link) {
      throw new FS.ErrnoError(34);
    }
    return parent.node_ops.link(parent, newname, oldpath, flags);
  }, rename(old_path, new_path) {
    var old_dirname = PATH.dirname(old_path);
    var new_dirname = PATH.dirname(new_path);
    var old_name = PATH.basename(old_path);
    var new_name = PATH.basename(new_path);
    var lookup, old_dir, new_dir;
    lookup = FS.lookupPath(old_path, { parent: true });
    old_dir = lookup.node;
    lookup = FS.lookupPath(new_path, { parent: true });
    new_dir = lookup.node;
    if (!old_dir || !new_dir) throw new FS.ErrnoError(44);
    if (old_dir.mount !== new_dir.mount) {
      throw new FS.ErrnoError(75);
    }
    var old_node = FS.lookupNode(old_dir, old_name);
    var relative = PATH_FS.relative(old_path, new_dirname);
    if (relative.charAt(0) !== ".") {
      throw new FS.ErrnoError(28);
    }
    relative = PATH_FS.relative(new_path, old_dirname);
    if (relative.charAt(0) !== ".") {
      throw new FS.ErrnoError(55);
    }
    var new_node;
    try {
      new_node = FS.lookupNode(new_dir, new_name);
    } catch (e) {
    }
    if (old_node === new_node) {
      return;
    }
    var isdir = FS.isDir(old_node.mode);
    var errCode = FS.mayDelete(old_dir, old_name, isdir);
    if (errCode) {
      throw new FS.ErrnoError(errCode);
    }
    errCode = new_node ? FS.mayDelete(new_dir, new_name, isdir) : FS.mayCreate(new_dir, new_name);
    if (errCode) {
      throw new FS.ErrnoError(errCode);
    }
    if (!old_dir.node_ops.rename) {
      throw new FS.ErrnoError(63);
    }
    if (FS.isMountpoint(old_node) || new_node && FS.isMountpoint(new_node)) {
      throw new FS.ErrnoError(10);
    }
    if (new_dir !== old_dir) {
      errCode = FS.nodePermissions(old_dir, "w");
      if (errCode) {
        throw new FS.ErrnoError(errCode);
      }
    }
    FS.hashRemoveNode(old_node);
    try {
      old_dir.node_ops.rename(old_node, new_dir, new_name);
      old_node.parent = new_dir;
    } catch (e) {
      throw e;
    } finally {
      FS.hashAddNode(old_node);
    }
  }, rmdir(path) {
    var lookup = FS.lookupPath(path, { parent: true });
    var parent = lookup.node;
    var name = PATH.basename(path);
    var node = FS.lookupNode(parent, name);
    var errCode = FS.mayDelete(parent, name, true);
    if (errCode) {
      throw new FS.ErrnoError(errCode);
    }
    if (!parent.node_ops.rmdir) {
      throw new FS.ErrnoError(63);
    }
    if (FS.isMountpoint(node)) {
      throw new FS.ErrnoError(10);
    }
    parent.node_ops.rmdir(parent, name);
    FS.destroyNode(node);
  }, readdir(path) {
    var lookup = FS.lookupPath(path, { follow: true });
    var node = lookup.node;
    var readdir = FS.checkOpExists(node.node_ops.readdir, 54);
    return readdir(node);
  }, unlink(path) {
    var lookup = FS.lookupPath(path, { parent: true });
    var parent = lookup.node;
    if (!parent) {
      throw new FS.ErrnoError(44);
    }
    var name = PATH.basename(path);
    var node = FS.lookupNode(parent, name);
    var errCode = FS.mayDelete(parent, name, false);
    if (errCode) {
      throw new FS.ErrnoError(errCode);
    }
    if (!parent.node_ops.unlink) {
      throw new FS.ErrnoError(63);
    }
    if (FS.isMountpoint(node)) {
      throw new FS.ErrnoError(10);
    }
    parent.node_ops.unlink(parent, name);
    FS.destroyNode(node);
  }, readlink(path) {
    var lookup = FS.lookupPath(path);
    var link = lookup.node;
    if (!link) {
      throw new FS.ErrnoError(44);
    }
    if (!link.node_ops.readlink) {
      throw new FS.ErrnoError(28);
    }
    return link.node_ops.readlink(link);
  }, stat(path, dontFollow) {
    var lookup = FS.lookupPath(path, { follow: !dontFollow });
    var node = lookup.node;
    var getattr = FS.checkOpExists(node.node_ops.getattr, 63);
    return getattr(node);
  }, fstat(fd) {
    var stream = FS.getStreamChecked(fd);
    var node = stream.node;
    var getattr = stream.stream_ops.getattr;
    var arg = getattr ? stream : node;
    getattr ??= node.node_ops.getattr;
    FS.checkOpExists(getattr, 63);
    return getattr(arg);
  }, lstat(path) {
    return FS.stat(path, true);
  }, doChmod(stream, node, mode, dontFollow) {
    FS.doSetAttr(stream, node, { mode: mode & 4095 | node.mode & ~4095, ctime: Date.now(), dontFollow });
  }, chmod(path, mode, dontFollow) {
    var node;
    if (typeof path == "string") {
      var lookup = FS.lookupPath(path, { follow: !dontFollow });
      node = lookup.node;
    } else {
      node = path;
    }
    FS.doChmod(null, node, mode, dontFollow);
  }, lchmod(path, mode) {
    FS.chmod(path, mode, true);
  }, fchmod(fd, mode) {
    var stream = FS.getStreamChecked(fd);
    FS.doChmod(stream, stream.node, mode, false);
  }, doChown(stream, node, dontFollow) {
    FS.doSetAttr(stream, node, { timestamp: Date.now(), dontFollow });
  }, chown(path, uid, gid, dontFollow) {
    var node;
    if (typeof path == "string") {
      var lookup = FS.lookupPath(path, { follow: !dontFollow });
      node = lookup.node;
    } else {
      node = path;
    }
    FS.doChown(null, node, dontFollow);
  }, lchown(path, uid, gid) {
    FS.chown(path, uid, gid, true);
  }, fchown(fd, uid, gid) {
    var stream = FS.getStreamChecked(fd);
    FS.doChown(stream, stream.node, false);
  }, doTruncate(stream, node, len) {
    if (FS.isDir(node.mode)) {
      throw new FS.ErrnoError(31);
    }
    if (!FS.isFile(node.mode)) {
      throw new FS.ErrnoError(28);
    }
    var errCode = FS.nodePermissions(node, "w");
    if (errCode) {
      throw new FS.ErrnoError(errCode);
    }
    FS.doSetAttr(stream, node, { size: len, timestamp: Date.now() });
  }, truncate(path, len) {
    if (len < 0) {
      throw new FS.ErrnoError(28);
    }
    var node;
    if (typeof path == "string") {
      var lookup = FS.lookupPath(path, { follow: true });
      node = lookup.node;
    } else {
      node = path;
    }
    FS.doTruncate(null, node, len);
  }, ftruncate(fd, len) {
    var stream = FS.getStreamChecked(fd);
    if (len < 0 || (stream.flags & 2097155) === 0) {
      throw new FS.ErrnoError(28);
    }
    FS.doTruncate(stream, stream.node, len);
  }, utime(path, atime, mtime, dontFollow) {
    var lookup = FS.lookupPath(path, { follow: !dontFollow });
    FS.doSetAttr(null, lookup.node, { atime, mtime, dontFollow });
  }, open(path, flags, mode = 438) {
    if (path === "") {
      throw new FS.ErrnoError(44);
    }
    flags = FS_modeStringToFlags(flags);
    if (flags & 64) {
      mode = mode & 4095 | 32768;
    } else {
      mode = 0;
    }
    var node;
    var isDirPath;
    if (typeof path == "object") {
      node = path;
    } else {
      isDirPath = path.endsWith("/");
      var lookup = FS.lookupPath(path, { follow: !(flags & 131072), noent_okay: true });
      node = lookup.node;
      path = lookup.path;
    }
    var created = false;
    if (flags & 64) {
      if (node) {
        if (flags & 128) {
          throw new FS.ErrnoError(20);
        }
      } else if (isDirPath) {
        throw new FS.ErrnoError(31);
      } else {
        node = FS.mknod(path, mode | 511, 0);
        created = true;
      }
    }
    if (!node) {
      throw new FS.ErrnoError(44);
    }
    if (FS.isChrdev(node.mode)) {
      flags &= ~512;
    }
    if (flags & 65536 && !FS.isDir(node.mode)) {
      throw new FS.ErrnoError(54);
    }
    if (!created) {
      var errCode = FS.mayOpen(node, flags);
      if (errCode) {
        throw new FS.ErrnoError(errCode);
      }
    }
    if (flags & 512 && !created) {
      FS.truncate(node, 0);
    }
    flags &= ~(128 | 512 | 131072);
    var stream = FS.createStream({ node, path: FS.getPath(node), flags, seekable: true, position: 0, stream_ops: node.stream_ops, ungotten: [], error: false });
    if (stream.stream_ops.open) {
      stream.stream_ops.open(stream);
    }
    if (created) {
      FS.chmod(node, mode & 511);
    }
    return stream;
  }, close(stream) {
    if (FS.isClosed(stream)) {
      throw new FS.ErrnoError(8);
    }
    if (stream.getdents) stream.getdents = null;
    stream.node?.notifyListeners(32);
    try {
      if (stream.stream_ops.close) {
        stream.stream_ops.close(stream);
      }
    } catch (e) {
      throw e;
    } finally {
      FS.closeStream(stream.fd);
    }
    stream.fd = null;
  }, isClosed(stream) {
    return stream.fd === null;
  }, llseek(stream, offset, whence) {
    if (FS.isClosed(stream)) {
      throw new FS.ErrnoError(8);
    }
    if (!stream.seekable || !stream.stream_ops.llseek) {
      throw new FS.ErrnoError(70);
    }
    if (whence != 0 && whence != 1 && whence != 2) {
      throw new FS.ErrnoError(28);
    }
    stream.position = stream.stream_ops.llseek(stream, offset, whence);
    stream.ungotten = [];
    return stream.position;
  }, read(stream, buffer, offset, length, position) {
    if (length < 0 || position < 0) {
      throw new FS.ErrnoError(28);
    }
    if (FS.isClosed(stream)) {
      throw new FS.ErrnoError(8);
    }
    if ((stream.flags & 2097155) === 1) {
      throw new FS.ErrnoError(8);
    }
    if (FS.isDir(stream.node.mode)) {
      throw new FS.ErrnoError(31);
    }
    if (!stream.stream_ops.read) {
      throw new FS.ErrnoError(28);
    }
    var seeking = typeof position != "undefined";
    if (!seeking) {
      position = stream.position;
    } else if (!stream.seekable) {
      throw new FS.ErrnoError(70);
    }
    var bytesRead = stream.stream_ops.read(stream, buffer, offset, length, position);
    if (!seeking) stream.position += bytesRead;
    return bytesRead;
  }, write(stream, buffer, offset, length, position, canOwn) {
    if (length < 0 || position < 0) {
      throw new FS.ErrnoError(28);
    }
    if (FS.isClosed(stream)) {
      throw new FS.ErrnoError(8);
    }
    if ((stream.flags & 2097155) === 0) {
      throw new FS.ErrnoError(8);
    }
    if (FS.isDir(stream.node.mode)) {
      throw new FS.ErrnoError(31);
    }
    if (!stream.stream_ops.write) {
      throw new FS.ErrnoError(28);
    }
    if (stream.seekable && stream.flags & 1024) {
      FS.llseek(stream, 0, 2);
    }
    var seeking = typeof position != "undefined";
    if (!seeking) {
      position = stream.position;
    } else if (!stream.seekable) {
      throw new FS.ErrnoError(70);
    }
    var bytesWritten = stream.stream_ops.write(stream, buffer, offset, length, position, canOwn);
    if (!seeking) stream.position += bytesWritten;
    return bytesWritten;
  }, mmap(stream, length, position, prot, flags) {
    if ((prot & 2) !== 0 && (flags & 2) === 0 && (stream.flags & 2097155) !== 2) {
      throw new FS.ErrnoError(2);
    }
    if ((stream.flags & 2097155) === 1) {
      throw new FS.ErrnoError(2);
    }
    if (!stream.stream_ops.mmap) {
      throw new FS.ErrnoError(43);
    }
    if (!length) {
      throw new FS.ErrnoError(28);
    }
    return stream.stream_ops.mmap(stream, length, position, prot, flags);
  }, msync(stream, buffer, offset, length, mmapFlags) {
    if (!stream.stream_ops.msync) {
      return 0;
    }
    return stream.stream_ops.msync(stream, buffer, offset, length, mmapFlags);
  }, ioctl(stream, cmd, arg) {
    if (!stream.stream_ops.ioctl) {
      throw new FS.ErrnoError(59);
    }
    return stream.stream_ops.ioctl(stream, cmd, arg);
  }, readFile(path, opts = {}) {
    opts.flags = opts.flags ?? 0;
    opts.encoding = opts.encoding ?? "binary";
    if (opts.encoding !== "utf8" && opts.encoding !== "binary") {
      abort(`Invalid encoding type "${opts.encoding}"`);
    }
    var stream = FS.open(path, opts.flags);
    var stat = FS.stat(path);
    var length = stat.size;
    var buf = new Uint8Array(length);
    FS.read(stream, buf, 0, length, 0);
    if (opts.encoding === "utf8") {
      buf = UTF8ArrayToString(buf);
    }
    FS.close(stream);
    return buf;
  }, writeFile(path, data, opts = {}) {
    opts.flags = opts.flags ?? 577;
    var stream = FS.open(path, opts.flags, opts.mode);
    data = FS_fileDataToTypedArray(data);
    FS.write(stream, data, 0, data.byteLength, void 0, opts.canOwn);
    FS.close(stream);
  }, cwd: () => FS.currentPath, chdir(path) {
    var lookup = FS.lookupPath(path, { follow: true });
    if (lookup.node === null) {
      throw new FS.ErrnoError(44);
    }
    if (!FS.isDir(lookup.node.mode)) {
      throw new FS.ErrnoError(54);
    }
    var errCode = FS.nodePermissions(lookup.node, "x");
    if (errCode) {
      throw new FS.ErrnoError(errCode);
    }
    FS.currentPath = lookup.path;
  }, createDefaultDirectories() {
    FS.mkdir("/tmp");
    FS.mkdir("/home");
    FS.mkdir("/home/web_user");
  }, createDefaultDevices() {
    FS.mkdir("/dev");
    FS.registerDevice(FS.makedev(1, 3), { read: () => 0, write: (stream, buffer, offset, length, pos) => length, llseek: () => 0 });
    FS.mkdev("/dev/null", FS.makedev(1, 3));
    TTY.register(FS.makedev(5, 0), TTY.default_tty_ops);
    TTY.register(FS.makedev(6, 0), TTY.default_tty1_ops);
    FS.mkdev("/dev/tty", FS.makedev(5, 0));
    FS.mkdev("/dev/tty1", FS.makedev(6, 0));
    var randomBuffer = new Uint8Array(1024), randomLeft = 0;
    var randomByte = () => {
      if (randomLeft === 0) {
        randomFill(randomBuffer);
        randomLeft = randomBuffer.byteLength;
      }
      return randomBuffer[--randomLeft];
    };
    FS.createDevice("/dev", "random", randomByte);
    FS.createDevice("/dev", "urandom", randomByte);
    FS.mkdir("/dev/shm");
    FS.mkdir("/dev/shm/tmp");
  }, createSpecialDirectories() {
    FS.mkdir("/proc");
    var proc_self = FS.mkdir("/proc/self");
    FS.mkdir("/proc/self/fd");
    FS.mount({ mount() {
      var node = FS.createNode(proc_self, "fd", 16895, 73);
      node.stream_ops = { llseek: MEMFS.stream_ops.llseek };
      node.node_ops = { lookup(parent, name) {
        var fd = +name;
        var stream = FS.getStreamChecked(fd);
        var ret = { parent: null, mount: { mountpoint: "fake" }, node_ops: { readlink: () => stream.path }, id: fd + 1 };
        ret.parent = ret;
        return ret;
      }, readdir() {
        return Array.from(FS.streams.entries()).filter(([k, v]) => v).map(([k, v]) => k.toString());
      } };
      return node;
    } }, {}, "/proc/self/fd");
  }, createStandardStreams(input, output, error) {
    if (input) {
      FS.createDevice("/dev", "stdin", input);
    } else {
      FS.symlink("/dev/tty", "/dev/stdin");
    }
    if (output) {
      FS.createDevice("/dev", "stdout", null, output);
    } else {
      FS.symlink("/dev/tty", "/dev/stdout");
    }
    if (error) {
      FS.createDevice("/dev", "stderr", null, error);
    } else {
      FS.symlink("/dev/tty1", "/dev/stderr");
    }
    var stdin = FS.open("/dev/stdin", 0);
    var stdout = FS.open("/dev/stdout", 1);
    var stderr = FS.open("/dev/stderr", 1);
  }, staticInit() {
    FS.nameTable = new Array(4096);
    FS.mount(MEMFS, {}, "/");
    FS.createDefaultDirectories();
    FS.createDefaultDevices();
    FS.createSpecialDirectories();
    FS.filesystems = { MEMFS };
  }, init(input, output, error) {
    FS.initialized = true;
    input ??= Module2["stdin"];
    output ??= Module2["stdout"];
    error ??= Module2["stderr"];
    FS.createStandardStreams(input, output, error);
  }, quit() {
    FS.initialized = false;
    for (var stream of FS.streams) {
      if (stream) {
        FS.close(stream);
      }
    }
  }, findObject(path, dontResolveLastLink) {
    var ret = FS.analyzePath(path, dontResolveLastLink);
    if (!ret.exists) {
      return null;
    }
    return ret.object;
  }, analyzePath(path, dontResolveLastLink) {
    try {
      var lookup = FS.lookupPath(path, { follow: !dontResolveLastLink });
      path = lookup.path;
    } catch (e) {
    }
    var ret = { isRoot: false, exists: false, error: 0, name: null, path: null, object: null, parentExists: false, parentPath: null, parentObject: null };
    try {
      var lookup = FS.lookupPath(path, { parent: true });
      ret.parentExists = true;
      ret.parentPath = lookup.path;
      ret.parentObject = lookup.node;
      ret.name = PATH.basename(path);
      lookup = FS.lookupPath(path, { follow: !dontResolveLastLink });
      ret.exists = true;
      ret.path = lookup.path;
      ret.object = lookup.node;
      ret.name = lookup.node.name;
      ret.isRoot = lookup.path === "/";
    } catch (e) {
      ret.error = e.errno;
    }
    return ret;
  }, createPath(parent, path, canRead, canWrite) {
    parent = typeof parent == "string" ? parent : FS.getPath(parent);
    var parts = path.split("/").reverse();
    while (parts.length) {
      var part = parts.pop();
      if (!part) continue;
      var current = PATH.join2(parent, part);
      try {
        FS.mkdir(current);
      } catch (e) {
        if (e.errno != 20) throw e;
      }
      parent = current;
    }
    return current;
  }, createFile(parent, name, properties, canRead, canWrite) {
    var path = PATH.join2(typeof parent == "string" ? parent : FS.getPath(parent), name);
    var mode = FS_getMode(canRead, canWrite);
    return FS.create(path, mode);
  }, createDataFile(parent, name, data, canRead, canWrite, canOwn) {
    var path = name;
    if (parent) {
      parent = typeof parent == "string" ? parent : FS.getPath(parent);
      path = name ? PATH.join2(parent, name) : parent;
    }
    var mode = FS_getMode(canRead, canWrite);
    var node = FS.create(path, mode);
    if (data) {
      data = FS_fileDataToTypedArray(data);
      FS.chmod(node, mode | 146);
      var stream = FS.open(node, 577);
      FS.write(stream, data, 0, data.length, 0, canOwn);
      FS.close(stream);
      FS.chmod(node, mode);
    }
  }, createDevice(parent, name, input, output) {
    var path = PATH.join2(typeof parent == "string" ? parent : FS.getPath(parent), name);
    var mode = FS_getMode(!!input, !!output);
    FS.createDevice.major ??= 64;
    var dev = FS.makedev(FS.createDevice.major++, 0);
    FS.registerDevice(dev, { open(stream) {
      stream.seekable = false;
    }, close(stream) {
      if (output?.buffer?.length) {
        output(10);
      }
    }, read(stream, buffer, offset, length, pos) {
      var bytesRead = 0;
      for (var i = 0; i < length; i++) {
        var result;
        try {
          result = input();
        } catch (e) {
          throw new FS.ErrnoError(29);
        }
        if (result === void 0 && bytesRead === 0) {
          throw new FS.ErrnoError(6);
        }
        if (result === null || result === void 0) break;
        bytesRead++;
        buffer[offset + i] = result;
      }
      if (bytesRead) {
        stream.node.atime = Date.now();
      }
      return bytesRead;
    }, write(stream, buffer, offset, length, pos) {
      for (var i = 0; i < length; i++) {
        try {
          output(buffer[offset + i]);
        } catch (e) {
          throw new FS.ErrnoError(29);
        }
      }
      if (length) {
        stream.node.mtime = stream.node.ctime = Date.now();
      }
      return i;
    } });
    return FS.mkdev(path, mode, dev);
  }, forceLoadFile(obj) {
    if (obj.isDevice || obj.isFolder || obj.link || obj.contents) return true;
    if (globalThis.XMLHttpRequest) {
      abort("Lazy loading should have been performed (contents set) in createLazyFile, but it was not. Lazy loading only works in web workers. Use --embed-file or --preload-file in emcc on the main thread.");
    } else {
      try {
        obj.contents = readBinary(obj.url);
      } catch (e) {
        throw new FS.ErrnoError(29);
      }
    }
  }, createLazyFile(parent, name, url, canRead, canWrite) {
    class LazyUint8Array {
      lengthKnown = false;
      chunks = [];
      get(idx) {
        if (idx > this.length - 1 || idx < 0) {
          return void 0;
        }
        var chunkOffset = idx % this.chunkSize;
        var chunkNum = idx / this.chunkSize | 0;
        return this.getter(chunkNum)[chunkOffset];
      }
      setDataGetter(getter) {
        this.getter = getter;
      }
      cacheLength() {
        var xhr = new XMLHttpRequest();
        xhr.open("HEAD", url, false);
        xhr.send(null);
        if (!(xhr.status >= 200 && xhr.status < 300 || xhr.status === 304)) abort("Couldn't load " + url + ". Status: " + xhr.status);
        var datalength = Number(xhr.getResponseHeader("Content-length"));
        var header;
        var hasByteServing = (header = xhr.getResponseHeader("Accept-Ranges")) && header === "bytes";
        var usesGzip = (header = xhr.getResponseHeader("Content-Encoding")) && header === "gzip";
        var chunkSize = 1024 * 1024;
        if (!hasByteServing) chunkSize = datalength;
        var doXHR = (from, to) => {
          if (from > to) abort(`invalid range (${from}, ${to}) or no bytes requested!`);
          if (to > datalength - 1) abort(`only ${datalength} bytes available! programmer error!`);
          var xhr2 = new XMLHttpRequest();
          xhr2.open("GET", url, false);
          if (datalength !== chunkSize) xhr2.setRequestHeader("Range", "bytes=" + from + "-" + to);
          xhr2.responseType = "arraybuffer";
          if (xhr2.overrideMimeType) {
            xhr2.overrideMimeType("text/plain; charset=x-user-defined");
          }
          xhr2.send(null);
          if (!(xhr2.status >= 200 && xhr2.status < 300 || xhr2.status === 304)) abort("Couldn't load " + url + ". Status: " + xhr2.status);
          if (xhr2.response !== void 0) {
            return new Uint8Array(xhr2.response || []);
          }
          return intArrayFromString(xhr2.responseText ?? "", true);
        };
        var lazyArray2 = this;
        lazyArray2.setDataGetter((chunkNum) => {
          var start = chunkNum * chunkSize;
          var end = (chunkNum + 1) * chunkSize - 1;
          end = Math.min(end, datalength - 1);
          if (typeof lazyArray2.chunks[chunkNum] == "undefined") {
            lazyArray2.chunks[chunkNum] = doXHR(start, end);
          }
          if (typeof lazyArray2.chunks[chunkNum] == "undefined") abort("doXHR failed!");
          return lazyArray2.chunks[chunkNum];
        });
        if (usesGzip || !datalength) {
          chunkSize = datalength = 1;
          datalength = this.getter(0).length;
          chunkSize = datalength;
          out("LazyFiles on gzip forces download of the whole file when length is accessed");
        }
        this._length = datalength;
        this._chunkSize = chunkSize;
        this.lengthKnown = true;
      }
      get length() {
        if (!this.lengthKnown) {
          this.cacheLength();
        }
        return this._length;
      }
      get chunkSize() {
        if (!this.lengthKnown) {
          this.cacheLength();
        }
        return this._chunkSize;
      }
    }
    if (globalThis.XMLHttpRequest) {
      if (!ENVIRONMENT_IS_WORKER) abort("Cannot do synchronous binary XHRs outside webworkers in modern browsers. Use --embed-file or --preload-file in emcc");
      var lazyArray = new LazyUint8Array();
      var properties = { isDevice: false, contents: lazyArray };
    } else {
      var properties = { isDevice: false, url };
    }
    var node = FS.createFile(parent, name, properties, canRead, canWrite);
    if (properties.contents) {
      node.contents = properties.contents;
    } else if (properties.url) {
      node.contents = null;
      node.url = properties.url;
    }
    Object.defineProperties(node, { usedBytes: { get: function() {
      return this.contents.length;
    } } });
    var stream_ops = {};
    for (const [key3, fn] of Object.entries(node.stream_ops)) {
      stream_ops[key3] = (...args) => {
        FS.forceLoadFile(node);
        return fn(...args);
      };
    }
    function writeChunks(stream, buffer, offset, length, position) {
      var contents = stream.node.contents;
      if (position >= contents.length) return 0;
      var size = Math.min(contents.length - position, length);
      if (contents.slice) {
        for (var i = 0; i < size; i++) {
          buffer[offset + i] = contents[position + i];
        }
      } else {
        for (var i = 0; i < size; i++) {
          buffer[offset + i] = contents.get(position + i);
        }
      }
      return size;
    }
    stream_ops.read = (stream, buffer, offset, length, position) => {
      FS.forceLoadFile(node);
      return writeChunks(stream, buffer, offset, length, position);
    };
    stream_ops.mmap = (stream, length, position, prot, flags) => {
      FS.forceLoadFile(node);
      var ptr = mmapAlloc(length);
      if (!ptr) {
        throw new FS.ErrnoError(48);
      }
      writeChunks(stream, HEAP8, ptr, length, position);
      return { ptr, allocated: true };
    };
    node.stream_ops = stream_ops;
    return node;
  } };
  var UTF8ToString = (ptr, maxBytesToRead, ignoreNul) => ptr ? UTF8ArrayToString(HEAPU8, ptr, maxBytesToRead, ignoreNul) : "";
  var SYSCALLS = { currentUmask: 18, calculateAt(dirfd, path, allowEmpty) {
    if (PATH.isAbs(path)) {
      return path;
    }
    var dir;
    if (dirfd === -100) {
      dir = FS.cwd();
    } else {
      var dirstream = SYSCALLS.getStreamFromFD(dirfd);
      dir = dirstream.path;
    }
    if (path.length == 0) {
      if (!allowEmpty) {
        throw new FS.ErrnoError(44);
      }
      return dir;
    }
    return dir + "/" + path;
  }, writeStat(buf, stat) {
    HEAPU32[buf >> 2] = stat.dev;
    HEAPU32[buf + 4 >> 2] = stat.mode;
    HEAPU32[buf + 8 >> 2] = stat.nlink;
    HEAPU32[buf + 12 >> 2] = stat.uid;
    HEAPU32[buf + 16 >> 2] = stat.gid;
    HEAPU32[buf + 20 >> 2] = stat.rdev;
    HEAP64[buf + 24 >> 3] = BigInt(stat.size);
    HEAP32[buf + 32 >> 2] = 4096;
    HEAP32[buf + 36 >> 2] = stat.blocks;
    var atime = stat.atime.getTime();
    var mtime = stat.mtime.getTime();
    var ctime = stat.ctime.getTime();
    HEAP64[buf + 40 >> 3] = BigInt(Math.floor(atime / 1e3));
    HEAPU32[buf + 48 >> 2] = atime % 1e3 * 1e3 * 1e3;
    HEAP64[buf + 56 >> 3] = BigInt(Math.floor(mtime / 1e3));
    HEAPU32[buf + 64 >> 2] = mtime % 1e3 * 1e3 * 1e3;
    HEAP64[buf + 72 >> 3] = BigInt(Math.floor(ctime / 1e3));
    HEAPU32[buf + 80 >> 2] = ctime % 1e3 * 1e3 * 1e3;
    HEAP64[buf + 88 >> 3] = BigInt(stat.ino);
    return 0;
  }, writeStatFs(buf, stats) {
    HEAPU32[buf + 4 >> 2] = stats.bsize;
    HEAPU32[buf + 60 >> 2] = stats.bsize;
    HEAP64[buf + 8 >> 3] = BigInt(stats.blocks);
    HEAP64[buf + 16 >> 3] = BigInt(stats.bfree);
    HEAP64[buf + 24 >> 3] = BigInt(stats.bavail);
    HEAP64[buf + 32 >> 3] = BigInt(stats.files);
    HEAP64[buf + 40 >> 3] = BigInt(stats.ffree);
    HEAPU32[buf + 48 >> 2] = stats.fsid;
    HEAPU32[buf + 64 >> 2] = stats.flags;
    HEAPU32[buf + 56 >> 2] = stats.namelen;
  }, doMsync(addr, stream, len, flags, offset) {
    if (!FS.isFile(stream.node.mode)) {
      throw new FS.ErrnoError(43);
    }
    if (flags & 2) {
      return 0;
    }
    var buffer = HEAPU8.subarray(addr, addr + len);
    FS.msync(stream, buffer, offset, len, flags);
  }, getStreamFromFD(fd) {
    var stream = FS.getStreamChecked(fd);
    return stream;
  }, varargs: void 0, getStr(ptr) {
    var ret = UTF8ToString(ptr);
    return ret;
  } };
  function ___syscall_fcntl64(fd, cmd, varargs) {
    SYSCALLS.varargs = varargs;
    try {
      var stream = SYSCALLS.getStreamFromFD(fd);
      switch (cmd) {
        case 0: {
          var arg = syscallGetVarargI();
          if (arg < 0) {
            return -28;
          }
          while (FS.streams[arg]) {
            arg++;
          }
          var newStream;
          newStream = FS.dupStream(stream, arg);
          return newStream.fd;
        }
        case 1:
        case 2:
          return 0;
        case 3:
          return stream.flags;
        case 4: {
          var arg = syscallGetVarargI();
          var mask = 289792;
          stream.flags = stream.flags & ~mask | arg & mask;
          return 0;
        }
        case 12: {
          var arg = syscallGetVarargP();
          var offset = 0;
          HEAP16[arg + offset >> 1] = 2;
          return 0;
        }
        case 13:
        case 14:
          return 0;
      }
      return -28;
    } catch (e) {
      if (typeof FS == "undefined" || !(e.name === "ErrnoError")) throw e;
      return -e.errno;
    }
  }
  function ___syscall_ioctl(fd, op, varargs) {
    SYSCALLS.varargs = varargs;
    try {
      var stream = SYSCALLS.getStreamFromFD(fd);
      switch (op) {
        case 21509: {
          if (!stream.tty) return -59;
          return 0;
        }
        case 21505: {
          if (!stream.tty) return -59;
          if (stream.tty.ops.ioctl_tcgets) {
            var termios = stream.tty.ops.ioctl_tcgets(stream);
            var argp = syscallGetVarargP();
            HEAP32[argp >> 2] = termios.c_iflag || 0;
            HEAP32[argp + 4 >> 2] = termios.c_oflag || 0;
            HEAP32[argp + 8 >> 2] = termios.c_cflag || 0;
            HEAP32[argp + 12 >> 2] = termios.c_lflag || 0;
            for (var i = 0; i < 32; i++) {
              HEAP8[argp + i + 17] = termios.c_cc[i] || 0;
            }
            return 0;
          }
          return 0;
        }
        case 21510:
        case 21511:
        case 21512: {
          if (!stream.tty) return -59;
          return 0;
        }
        case 21506:
        case 21507:
        case 21508: {
          if (!stream.tty) return -59;
          if (stream.tty.ops.ioctl_tcsets) {
            var argp = syscallGetVarargP();
            var c_iflag = HEAP32[argp >> 2];
            var c_oflag = HEAP32[argp + 4 >> 2];
            var c_cflag = HEAP32[argp + 8 >> 2];
            var c_lflag = HEAP32[argp + 12 >> 2];
            var c_cc = [];
            for (var i = 0; i < 32; i++) {
              c_cc.push(HEAP8[argp + i + 17]);
            }
            return stream.tty.ops.ioctl_tcsets(stream.tty, op, { c_iflag, c_oflag, c_cflag, c_lflag, c_cc });
          }
          return 0;
        }
        case 21519: {
          if (!stream.tty) return -59;
          var argp = syscallGetVarargP();
          HEAP32[argp >> 2] = 0;
          return 0;
        }
        case 21520: {
          if (!stream.tty) return -59;
          return -28;
        }
        case 21537:
        case 21531: {
          var argp = syscallGetVarargP();
          return FS.ioctl(stream, op, argp);
        }
        case 21523: {
          if (!stream.tty) return -59;
          if (stream.tty.ops.ioctl_tiocgwinsz) {
            var winsize = stream.tty.ops.ioctl_tiocgwinsz(stream.tty);
            var argp = syscallGetVarargP();
            HEAP16[argp >> 1] = winsize[0];
            HEAP16[argp + 2 >> 1] = winsize[1];
          }
          return 0;
        }
        case 21524: {
          if (!stream.tty) return -59;
          return 0;
        }
        case 21515: {
          if (!stream.tty) return -59;
          return 0;
        }
        default:
          return -28;
      }
    } catch (e) {
      if (typeof FS == "undefined" || !(e.name === "ErrnoError")) throw e;
      return -e.errno;
    }
  }
  function ___syscall_openat(dirfd, path, flags, varargs) {
    SYSCALLS.varargs = varargs;
    try {
      path = SYSCALLS.getStr(path);
      path = SYSCALLS.calculateAt(dirfd, path);
      var mode = varargs ? syscallGetVarargI() : 0;
      if (flags & 64) {
        mode &= ~SYSCALLS.currentUmask;
      }
      return FS.open(path, flags, mode).fd;
    } catch (e) {
      if (typeof FS == "undefined" || !(e.name === "ErrnoError")) throw e;
      return -e.errno;
    }
  }
  var __abort_js = () => abort("");
  var runtimeKeepaliveCounter = 0;
  var __emscripten_runtime_keepalive_clear = () => {
    noExitRuntime = false;
    runtimeKeepaliveCounter = 0;
  };
  var timers = {};
  var handleException = (e) => {
    if (e instanceof ExitStatus || e == "unwind") {
      return EXITSTATUS;
    }
    quit_(1, e);
  };
  var keepRuntimeAlive = () => noExitRuntime || runtimeKeepaliveCounter > 0;
  var _proc_exit = (code) => {
    EXITSTATUS = code;
    if (!keepRuntimeAlive()) {
      Module2["onExit"]?.(code);
      ABORT = true;
    }
    quit_(code, new ExitStatus(code));
  };
  var exitJS = (status, implicit) => {
    EXITSTATUS = status;
    _proc_exit(status);
  };
  var _exit = exitJS;
  var maybeExit = () => {
    if (!keepRuntimeAlive()) {
      try {
        _exit(EXITSTATUS);
      } catch (e) {
        handleException(e);
      }
    }
  };
  var callUserCallback = (func) => {
    if (ABORT) {
      return;
    }
    try {
      return func();
    } catch (e) {
      handleException(e);
    } finally {
      maybeExit();
    }
  };
  var _emscripten_get_now = () => performance.now();
  var __setitimer_js = (which, timeout_ms) => {
    if (timers[which]) {
      clearTimeout(timers[which].id);
      delete timers[which];
    }
    if (!timeout_ms) return 0;
    var id = setTimeout(() => {
      delete timers[which];
      callUserCallback(() => __emscripten_timeout(which, _emscripten_get_now()));
    }, timeout_ms);
    timers[which] = { id, timeout_ms };
    return 0;
  };
  var stringToUTF8 = (str, outPtr, maxBytesToWrite) => stringToUTF8Array(str, HEAPU8, outPtr, maxBytesToWrite);
  var __tzset_js = (timezone, daylight, std_name, dst_name) => {
    var currentYear = (/* @__PURE__ */ new Date()).getFullYear();
    var winter = new Date(currentYear, 0, 1);
    var summer = new Date(currentYear, 6, 1);
    var winterOffset = winter.getTimezoneOffset();
    var summerOffset = summer.getTimezoneOffset();
    var stdTimezoneOffset = Math.max(winterOffset, summerOffset);
    HEAPU32[timezone >> 2] = stdTimezoneOffset * 60;
    HEAP32[daylight >> 2] = Number(winterOffset != summerOffset);
    var extractZone = (timezoneOffset) => {
      var sign = timezoneOffset >= 0 ? "-" : "+";
      var absOffset = Math.abs(timezoneOffset);
      var hours = String(Math.floor(absOffset / 60)).padStart(2, "0");
      var minutes = String(absOffset % 60).padStart(2, "0");
      return `UTC${sign}${hours}${minutes}`;
    };
    var winterName = extractZone(winterOffset);
    var summerName = extractZone(summerOffset);
    if (summerOffset < winterOffset) {
      stringToUTF8(winterName, std_name, 17);
      stringToUTF8(summerName, dst_name, 17);
    } else {
      stringToUTF8(winterName, dst_name, 17);
      stringToUTF8(summerName, std_name, 17);
    }
  };
  var _emscripten_date_now = () => Date.now();
  var nowIsMonotonic = 1;
  var checkWasiClock = (clock_id) => clock_id >= 0 && clock_id <= 3;
  var INT53_MAX = 9007199254740992;
  var INT53_MIN = -9007199254740992;
  var bigintToI53Checked = (num) => num < INT53_MIN || num > INT53_MAX ? NaN : Number(num);
  function _clock_time_get(clk_id, ignored_precision, ptime) {
    ignored_precision = bigintToI53Checked(ignored_precision);
    if (!checkWasiClock(clk_id)) {
      return 28;
    }
    var now;
    if (clk_id === 0) {
      now = _emscripten_date_now();
    } else if (nowIsMonotonic) {
      now = _emscripten_get_now();
    } else {
      return 52;
    }
    var nsec = Math.round(now * 1e3 * 1e3);
    HEAP64[ptime >> 3] = BigInt(nsec);
    return 0;
  }
  var getHeapMax = () => 2147483648;
  var alignMemory = (size, alignment) => Math.ceil(size / alignment) * alignment;
  var growMemory = (size) => {
    var oldHeapSize = wasmMemory.buffer.byteLength;
    var pages = (size - oldHeapSize + 65535) / 65536 | 0;
    try {
      wasmMemory.grow(pages);
      updateMemoryViews();
      return 1;
    } catch (e) {
    }
  };
  var _emscripten_resize_heap = (requestedSize) => {
    var oldSize = HEAPU8.length;
    requestedSize >>>= 0;
    var maxHeapSize = getHeapMax();
    if (requestedSize > maxHeapSize) {
      return false;
    }
    for (var cutDown = 1; cutDown <= 4; cutDown *= 2) {
      var overGrownHeapSize = oldSize * (1 + 0.2 / cutDown);
      overGrownHeapSize = Math.min(overGrownHeapSize, requestedSize + 100663296);
      var newSize = Math.min(maxHeapSize, alignMemory(Math.max(requestedSize, overGrownHeapSize), 65536));
      var replacement = growMemory(newSize);
      if (replacement) {
        return true;
      }
    }
    return false;
  };
  var ENV = {};
  var getExecutableName = () => thisProgram;
  var getEnvStrings = () => {
    if (!getEnvStrings.strings) {
      var lang = (globalThis.navigator?.language ?? "C").replace("-", "_") + ".UTF-8";
      var env = { USER: "web_user", LOGNAME: "web_user", PATH: "/", PWD: "/", HOME: "/home/web_user", LANG: lang, _: getExecutableName() };
      for (var x in ENV) {
        if (ENV[x] === void 0) delete env[x];
        else env[x] = ENV[x];
      }
      var strings = [];
      for (var x in env) {
        strings.push(`${x}=${env[x]}`);
      }
      getEnvStrings.strings = strings;
    }
    return getEnvStrings.strings;
  };
  var _environ_get = (__environ, environ_buf) => {
    var bufSize = 0;
    var envp = 0;
    for (var string of getEnvStrings()) {
      var ptr = environ_buf + bufSize;
      HEAPU32[__environ + envp >> 2] = ptr;
      bufSize += stringToUTF8(string, ptr, Infinity) + 1;
      envp += 4;
    }
    return 0;
  };
  var _environ_sizes_get = (penviron_count, penviron_buf_size) => {
    var strings = getEnvStrings();
    HEAPU32[penviron_count >> 2] = strings.length;
    var bufSize = 0;
    for (var string of strings) {
      bufSize += lengthBytesUTF8(string) + 1;
    }
    HEAPU32[penviron_buf_size >> 2] = bufSize;
    return 0;
  };
  function _fd_close(fd) {
    try {
      var stream = SYSCALLS.getStreamFromFD(fd);
      FS.close(stream);
      return 0;
    } catch (e) {
      if (typeof FS == "undefined" || !(e.name === "ErrnoError")) throw e;
      return e.errno;
    }
  }
  var doReadv = (stream, iov, iovcnt, offset) => {
    var ret = 0;
    for (var i = 0; i < iovcnt; i++) {
      var ptr = HEAPU32[iov >> 2];
      var len = HEAPU32[iov + 4 >> 2];
      iov += 8;
      try {
        var curr = FS.read(stream, HEAP8, ptr, len, offset);
      } catch (e) {
        if (ret > 0 && e instanceof FS.ErrnoError && (e.errno == 6 || e.errno == 6)) {
          break;
        }
        throw e;
      }
      if (curr < 0) return -1;
      ret += curr;
      if (curr < len) break;
      if (typeof offset != "undefined") {
        offset += curr;
      }
    }
    return ret;
  };
  function _fd_read(fd, iov, iovcnt, pnum) {
    try {
      var stream = SYSCALLS.getStreamFromFD(fd);
      var num = doReadv(stream, iov, iovcnt);
      HEAPU32[pnum >> 2] = num;
      return 0;
    } catch (e) {
      if (typeof FS == "undefined" || !(e.name === "ErrnoError")) throw e;
      return e.errno;
    }
  }
  function _fd_seek(fd, offset, whence, newOffset) {
    offset = bigintToI53Checked(offset);
    try {
      if (isNaN(offset)) return 22;
      var stream = SYSCALLS.getStreamFromFD(fd);
      FS.llseek(stream, offset, whence);
      HEAP64[newOffset >> 3] = BigInt(stream.position);
      if (stream.getdents && offset === 0 && whence === 0) stream.getdents = null;
      return 0;
    } catch (e) {
      if (typeof FS == "undefined" || !(e.name === "ErrnoError")) throw e;
      return e.errno;
    }
  }
  var doWritev = (stream, iov, iovcnt, offset) => {
    if (iovcnt == 1) {
      return FS.write(stream, HEAP8, HEAPU32[iov >> 2], HEAPU32[iov + 4 >> 2], offset);
    }
    var total = 0;
    for (var i = 0, p = iov; i < iovcnt; i++, p += 8) {
      total += HEAPU32[p + 4 >> 2];
    }
    var view = new Uint8Array(total);
    var voff = 0;
    for (var i = 0; i < iovcnt; i++, iov += 8) {
      var ptr = HEAPU32[iov >> 2];
      var len = HEAPU32[iov + 4 >> 2];
      view.set(HEAPU8.subarray(ptr, ptr + len), voff);
      voff += len;
    }
    return FS.write(stream, view, 0, total, offset);
  };
  function _fd_write(fd, iov, iovcnt, pnum) {
    try {
      var stream = SYSCALLS.getStreamFromFD(fd);
      var num = doWritev(stream, iov, iovcnt);
      HEAPU32[pnum >> 2] = num;
      return 0;
    } catch (e) {
      if (typeof FS == "undefined" || !(e.name === "ErrnoError")) throw e;
      return e.errno;
    }
  }
  var getCFunc = (ident) => {
    var func = Module2["_" + ident];
    return func;
  };
  var writeArrayToMemory = (array, buffer) => {
    HEAP8.set(array, buffer);
  };
  var stackAlloc = (sz) => __emscripten_stack_alloc(sz);
  var stringToUTF8OnStack = (str) => {
    var size = lengthBytesUTF8(str) + 1;
    var ret = stackAlloc(size);
    stringToUTF8(str, ret, size);
    return ret;
  };
  var ccall = (ident, returnType, argTypes, args, opts) => {
    var toC = { string: (str) => {
      var ret2 = 0;
      if (str !== null && str !== void 0 && str !== 0) {
        ret2 = stringToUTF8OnStack(str);
      }
      return ret2;
    }, array: (arr) => {
      var ret2 = stackAlloc(arr.length);
      writeArrayToMemory(arr, ret2);
      return ret2;
    } };
    function convertReturnValue(ret2) {
      if (returnType === "string") {
        return UTF8ToString(ret2);
      }
      if (returnType === "boolean") return Boolean(ret2);
      return ret2;
    }
    var func = getCFunc(ident);
    var cArgs = [];
    var stack = 0;
    if (args) {
      for (var i = 0; i < args.length; i++) {
        var converter = toC[argTypes[i]];
        if (converter) {
          if (stack === 0) stack = stackSave();
          cArgs[i] = converter(args[i]);
        } else {
          cArgs[i] = args[i];
        }
      }
    }
    var ret = func(...cArgs);
    function onDone(ret2) {
      if (stack !== 0) stackRestore(stack);
      return convertReturnValue(ret2);
    }
    ret = onDone(ret);
    return ret;
  };
  var cwrap = (ident, returnType, argTypes, opts) => {
    var numericArgs = !argTypes || argTypes.every((type) => type === "number" || type === "boolean");
    var numericRet = returnType !== "string";
    if (numericRet && numericArgs && !opts) {
      return getCFunc(ident);
    }
    return (...args) => ccall(ident, returnType, argTypes, args, opts);
  };
  var wasmTableMirror = [];
  var getWasmTableEntry = (funcPtr) => {
    var func = wasmTableMirror[funcPtr];
    if (!func) {
      wasmTableMirror[funcPtr] = func = wasmTable.get(funcPtr);
    }
    return func;
  };
  var updateTableMap = (offset, count2) => {
    if (functionsInTableMap) {
      for (var i = offset; i < offset + count2; i++) {
        var item = getWasmTableEntry(i);
        if (item) {
          functionsInTableMap.set(item, i);
        }
      }
    }
  };
  var functionsInTableMap;
  var getFunctionAddress = (func) => {
    if (!functionsInTableMap) {
      functionsInTableMap = /* @__PURE__ */ new WeakMap();
      updateTableMap(0, wasmTable.length);
    }
    return functionsInTableMap.get(func) || 0;
  };
  var freeTableIndexes = [];
  var getEmptyTableSlot = () => {
    if (freeTableIndexes.length) {
      return freeTableIndexes.pop();
    }
    return wasmTable["grow"](1);
  };
  var setWasmTableEntry = (idx, func) => {
    wasmTable.set(idx, func);
    wasmTableMirror[idx] = wasmTable.get(idx);
  };
  var uleb128EncodeWithLen = (arr) => {
    const n = arr.length;
    return [n % 128 | 128, n >> 7, ...arr];
  };
  var wasmTypeCodes = { i: 127, p: 127, j: 126, f: 125, d: 124, e: 111 };
  var generateTypePack = (types) => uleb128EncodeWithLen(Array.from(types, (type) => {
    var code = wasmTypeCodes[type];
    return code;
  }));
  var convertJsFunctionToWasm = (func, sig) => {
    var bytes = Uint8Array.of(0, 97, 115, 109, 1, 0, 0, 0, 1, ...uleb128EncodeWithLen([1, 96, ...generateTypePack(sig.slice(1)), ...generateTypePack(sig[0] === "v" ? "" : sig[0])]), 2, 7, 1, 1, 101, 1, 102, 0, 0, 7, 5, 1, 1, 102, 0, 0);
    var module = new WebAssembly.Module(bytes);
    var instance = new WebAssembly.Instance(module, { e: { f: func } });
    var wrappedFunc = instance.exports["f"];
    return wrappedFunc;
  };
  var addFunction = (func, sig) => {
    var rtn = getFunctionAddress(func);
    if (rtn) {
      return rtn;
    }
    var ret = getEmptyTableSlot();
    try {
      setWasmTableEntry(ret, func);
    } catch (err2) {
      if (!(err2 instanceof TypeError)) {
        throw err2;
      }
      var wrapped = convertJsFunctionToWasm(func, sig);
      setWasmTableEntry(ret, wrapped);
    }
    functionsInTableMap.set(func, ret);
    return ret;
  };
  var removeFunction = (index) => {
    functionsInTableMap.delete(getWasmTableEntry(index));
    setWasmTableEntry(index, null);
    freeTableIndexes.push(index);
  };
  FS.createPreloadedFile = FS_createPreloadedFile;
  FS.preloadFile = FS_preloadFile;
  FS.staticInit();
  {
    if (Module2["noExitRuntime"]) noExitRuntime = Module2["noExitRuntime"];
    if (Module2["print"]) out = Module2["print"];
    if (Module2["printErr"]) err = Module2["printErr"];
    if (Module2["arguments"]) programArgs = Module2["arguments"];
    if (Module2["thisProgram"]) thisProgram = Module2["thisProgram"];
    var preInit = Module2["preInit"];
    if (preInit) {
      if (typeof preInit == "function") Module2["preInit"] = preInit = [preInit];
      while (preInit.length > 0) {
        preInit.shift()();
      }
    }
  }
  Module2["cwrap"] = cwrap;
  Module2["addFunction"] = addFunction;
  Module2["removeFunction"] = removeFunction;
  Module2["UTF8ToString"] = UTF8ToString;
  var _Highs_js_getColName, _Highs_js_getRowName, _Highs_js_getPresolvedColName, _Highs_js_getPresolvedRowName, _Highs_js_setCallback, _Highs_js_getCallbackMipSolutionSize, _Highs_lpCall, _Highs_mipCall, _Highs_qpCall, _Highs_create, _Highs_destroy, _Highs_version, _Highs_versionMajor, _Highs_versionMinor, _Highs_versionPatch, _Highs_githash, _Highs_presolve, _Highs_run, _Highs_postsolve, _Highs_readModel, _Highs_writeModel, _Highs_writePresolvedModel, _Highs_writeSolution, _Highs_writeSolutionPretty, _Highs_passLp, _Highs_passMip, _Highs_passModel, _Highs_passHessian, _Highs_passLinearObjectives, _Highs_clearLinearObjectives, _Highs_getNumCol, _Highs_addLinearObjective, _Highs_passRowName, _Highs_passColName, _Highs_passModelName, _Highs_readOptions, _Highs_clear, _Highs_clearModel, _Highs_clearSolver, _Highs_releaseMemory, _Highs_setBoolOptionValue, _Highs_setIntOptionValue, _Highs_setDoubleOptionValue, _Highs_setStringOptionValue, _Highs_getNumOptions, _Highs_getOptionName, _Highs_getBoolOptionValue, _Highs_getBoolOptionValues, _Highs_getIntOptionValue, _Highs_getIntOptionValues, _Highs_getDoubleOptionValue, _Highs_getDoubleOptionValues, _Highs_getStringOptionValue, _Highs_getStringOptionValues, _Highs_getOptionType, _Highs_resetOptions, _Highs_writeOptions, _Highs_writeOptionsDeviations, _Highs_getIntInfoValue, _Highs_getDoubleInfoValue, _Highs_getInt64InfoValue, _Highs_getInfoType, _Highs_getSolution, _Highs_getBasis, _Highs_getModelStatus, _Highs_getDualRay, _Highs_getDualUnboundednessDirection, _Highs_getPrimalRay, _Highs_getObjectiveValue, _Highs_getBasicVariables, _Highs_getBasisInverseRow, _Highs_getBasisInverseCol, _Highs_getBasisSolve, _Highs_getBasisTransposeSolve, _Highs_getReducedRow, _Highs_getReducedColumn, _Highs_setBasis, _Highs_getNumRow, _Highs_setLogicalBasis, _Highs_setSolution, _Highs_setSparseSolution, _Highs_setCallback, _Highs_startCallback, _Highs_stopCallback, _Highs_getRunTime, _Highs_zeroAllClocks, _Highs_addCol, _Highs_addCols, _Highs_addVar, _Highs_addVars, _Highs_addRow, _Highs_addRows, _Highs_ensureColwise, _Highs_ensureRowwise, _Highs_changeObjectiveSense, _Highs_changeObjectiveOffset, _Highs_changeColIntegrality, _Highs_changeColsIntegralityByRange, _Highs_changeColsIntegralityBySet, _Highs_changeColsIntegralityByMask, _Highs_clearIntegrality, _Highs_changeColCost, _Highs_changeColsCostByRange, _Highs_changeColsCostBySet, _Highs_changeColsCostByMask, _Highs_changeColBounds, _Highs_changeColsBoundsByRange, _Highs_changeColsBoundsBySet, _Highs_changeColsBoundsByMask, _Highs_changeRowBounds, _Highs_changeRowsBoundsByRange, _Highs_changeRowsBoundsBySet, _Highs_changeRowsBoundsByMask, _Highs_changeCoeff, _Highs_getObjectiveSense, _Highs_getObjectiveOffset, _Highs_getColsByRange, _Highs_getColsBySet, _Highs_getColsByMask, _Highs_getRowsByRange, _Highs_getRowsBySet, _Highs_getRowsByMask, _Highs_getRowName, _Highs_getRowByName, _Highs_getColName, _Highs_getColByName, _Highs_getColIntegrality, _Highs_deleteColsByRange, _Highs_deleteColsBySet, _Highs_deleteColsByMask, _Highs_deleteRowsByRange, _Highs_deleteRowsBySet, _Highs_deleteRowsByMask, _Highs_scaleCol, _Highs_scaleRow, _Highs_getInfinity, _Highs_getSizeofHighsInt, _Highs_getNumNz, _Highs_getHessianNumNz, _Highs_getPresolvedNumCol, _Highs_getPresolvedNumRow, _Highs_getPresolvedNumNz, _Highs_getModel, _Highs_getLp, _Highs_getFixedLp, _Highs_getPresolvedLp, _Highs_getPresolvedColName, _Highs_getPresolvedRowName, _Highs_getIis, _Highs_getIisLp, _Highs_crossover, _Highs_getRanging, _Highs_feasibilityRelaxation, _Highs_getCallbackDataOutItem, _Highs_setCallbackSolution, _Highs_setCallbackSparseSolution, _Highs_repairCallbackSolution, _Highs_call, _malloc, _free, __emscripten_timeout, __emscripten_stack_restore, __emscripten_stack_alloc, _emscripten_stack_get_current, memory, __indirect_function_table, wasmMemory, wasmTable;
  function assignWasmExports(wasmExports2) {
    _Highs_js_getColName = Module2["_Highs_js_getColName"] = wasmExports2["w"];
    _Highs_js_getRowName = Module2["_Highs_js_getRowName"] = wasmExports2["x"];
    _Highs_js_getPresolvedColName = Module2["_Highs_js_getPresolvedColName"] = wasmExports2["y"];
    _Highs_js_getPresolvedRowName = Module2["_Highs_js_getPresolvedRowName"] = wasmExports2["z"];
    _Highs_js_setCallback = Module2["_Highs_js_setCallback"] = wasmExports2["A"];
    _Highs_js_getCallbackMipSolutionSize = Module2["_Highs_js_getCallbackMipSolutionSize"] = wasmExports2["B"];
    _Highs_lpCall = Module2["_Highs_lpCall"] = wasmExports2["C"];
    _Highs_mipCall = Module2["_Highs_mipCall"] = wasmExports2["D"];
    _Highs_qpCall = Module2["_Highs_qpCall"] = wasmExports2["E"];
    _Highs_create = Module2["_Highs_create"] = wasmExports2["F"];
    _Highs_destroy = Module2["_Highs_destroy"] = wasmExports2["G"];
    _Highs_version = Module2["_Highs_version"] = wasmExports2["H"];
    _Highs_versionMajor = Module2["_Highs_versionMajor"] = wasmExports2["I"];
    _Highs_versionMinor = Module2["_Highs_versionMinor"] = wasmExports2["J"];
    _Highs_versionPatch = Module2["_Highs_versionPatch"] = wasmExports2["K"];
    _Highs_githash = Module2["_Highs_githash"] = wasmExports2["L"];
    _Highs_presolve = Module2["_Highs_presolve"] = wasmExports2["M"];
    _Highs_run = Module2["_Highs_run"] = wasmExports2["N"];
    _Highs_postsolve = Module2["_Highs_postsolve"] = wasmExports2["O"];
    _Highs_readModel = Module2["_Highs_readModel"] = wasmExports2["P"];
    _Highs_writeModel = Module2["_Highs_writeModel"] = wasmExports2["Q"];
    _Highs_writePresolvedModel = Module2["_Highs_writePresolvedModel"] = wasmExports2["R"];
    _Highs_writeSolution = Module2["_Highs_writeSolution"] = wasmExports2["S"];
    _Highs_writeSolutionPretty = Module2["_Highs_writeSolutionPretty"] = wasmExports2["T"];
    _Highs_passLp = Module2["_Highs_passLp"] = wasmExports2["U"];
    _Highs_passMip = Module2["_Highs_passMip"] = wasmExports2["V"];
    _Highs_passModel = Module2["_Highs_passModel"] = wasmExports2["W"];
    _Highs_passHessian = Module2["_Highs_passHessian"] = wasmExports2["X"];
    _Highs_passLinearObjectives = Module2["_Highs_passLinearObjectives"] = wasmExports2["Y"];
    _Highs_clearLinearObjectives = Module2["_Highs_clearLinearObjectives"] = wasmExports2["Z"];
    _Highs_getNumCol = Module2["_Highs_getNumCol"] = wasmExports2["_"];
    _Highs_addLinearObjective = Module2["_Highs_addLinearObjective"] = wasmExports2["$"];
    _Highs_passRowName = Module2["_Highs_passRowName"] = wasmExports2["aa"];
    _Highs_passColName = Module2["_Highs_passColName"] = wasmExports2["ba"];
    _Highs_passModelName = Module2["_Highs_passModelName"] = wasmExports2["ca"];
    _Highs_readOptions = Module2["_Highs_readOptions"] = wasmExports2["da"];
    _Highs_clear = Module2["_Highs_clear"] = wasmExports2["ea"];
    _Highs_clearModel = Module2["_Highs_clearModel"] = wasmExports2["fa"];
    _Highs_clearSolver = Module2["_Highs_clearSolver"] = wasmExports2["ga"];
    _Highs_releaseMemory = Module2["_Highs_releaseMemory"] = wasmExports2["ha"];
    _Highs_setBoolOptionValue = Module2["_Highs_setBoolOptionValue"] = wasmExports2["ia"];
    _Highs_setIntOptionValue = Module2["_Highs_setIntOptionValue"] = wasmExports2["ja"];
    _Highs_setDoubleOptionValue = Module2["_Highs_setDoubleOptionValue"] = wasmExports2["ka"];
    _Highs_setStringOptionValue = Module2["_Highs_setStringOptionValue"] = wasmExports2["la"];
    _Highs_getNumOptions = Module2["_Highs_getNumOptions"] = wasmExports2["ma"];
    _Highs_getOptionName = Module2["_Highs_getOptionName"] = wasmExports2["na"];
    _Highs_getBoolOptionValue = Module2["_Highs_getBoolOptionValue"] = wasmExports2["oa"];
    _Highs_getBoolOptionValues = Module2["_Highs_getBoolOptionValues"] = wasmExports2["pa"];
    _Highs_getIntOptionValue = Module2["_Highs_getIntOptionValue"] = wasmExports2["qa"];
    _Highs_getIntOptionValues = Module2["_Highs_getIntOptionValues"] = wasmExports2["ra"];
    _Highs_getDoubleOptionValue = Module2["_Highs_getDoubleOptionValue"] = wasmExports2["sa"];
    _Highs_getDoubleOptionValues = Module2["_Highs_getDoubleOptionValues"] = wasmExports2["ta"];
    _Highs_getStringOptionValue = Module2["_Highs_getStringOptionValue"] = wasmExports2["ua"];
    _Highs_getStringOptionValues = Module2["_Highs_getStringOptionValues"] = wasmExports2["va"];
    _Highs_getOptionType = Module2["_Highs_getOptionType"] = wasmExports2["wa"];
    _Highs_resetOptions = Module2["_Highs_resetOptions"] = wasmExports2["xa"];
    _Highs_writeOptions = Module2["_Highs_writeOptions"] = wasmExports2["ya"];
    _Highs_writeOptionsDeviations = Module2["_Highs_writeOptionsDeviations"] = wasmExports2["za"];
    _Highs_getIntInfoValue = Module2["_Highs_getIntInfoValue"] = wasmExports2["Aa"];
    _Highs_getDoubleInfoValue = Module2["_Highs_getDoubleInfoValue"] = wasmExports2["Ba"];
    _Highs_getInt64InfoValue = Module2["_Highs_getInt64InfoValue"] = wasmExports2["Ca"];
    _Highs_getInfoType = Module2["_Highs_getInfoType"] = wasmExports2["Da"];
    _Highs_getSolution = Module2["_Highs_getSolution"] = wasmExports2["Ea"];
    _Highs_getBasis = Module2["_Highs_getBasis"] = wasmExports2["Fa"];
    _Highs_getModelStatus = Module2["_Highs_getModelStatus"] = wasmExports2["Ga"];
    _Highs_getDualRay = Module2["_Highs_getDualRay"] = wasmExports2["Ha"];
    _Highs_getDualUnboundednessDirection = Module2["_Highs_getDualUnboundednessDirection"] = wasmExports2["Ia"];
    _Highs_getPrimalRay = Module2["_Highs_getPrimalRay"] = wasmExports2["Ja"];
    _Highs_getObjectiveValue = Module2["_Highs_getObjectiveValue"] = wasmExports2["Ka"];
    _Highs_getBasicVariables = Module2["_Highs_getBasicVariables"] = wasmExports2["La"];
    _Highs_getBasisInverseRow = Module2["_Highs_getBasisInverseRow"] = wasmExports2["Ma"];
    _Highs_getBasisInverseCol = Module2["_Highs_getBasisInverseCol"] = wasmExports2["Na"];
    _Highs_getBasisSolve = Module2["_Highs_getBasisSolve"] = wasmExports2["Oa"];
    _Highs_getBasisTransposeSolve = Module2["_Highs_getBasisTransposeSolve"] = wasmExports2["Pa"];
    _Highs_getReducedRow = Module2["_Highs_getReducedRow"] = wasmExports2["Qa"];
    _Highs_getReducedColumn = Module2["_Highs_getReducedColumn"] = wasmExports2["Ra"];
    _Highs_setBasis = Module2["_Highs_setBasis"] = wasmExports2["Sa"];
    _Highs_getNumRow = Module2["_Highs_getNumRow"] = wasmExports2["Ta"];
    _Highs_setLogicalBasis = Module2["_Highs_setLogicalBasis"] = wasmExports2["Ua"];
    _Highs_setSolution = Module2["_Highs_setSolution"] = wasmExports2["Va"];
    _Highs_setSparseSolution = Module2["_Highs_setSparseSolution"] = wasmExports2["Wa"];
    _Highs_setCallback = Module2["_Highs_setCallback"] = wasmExports2["Xa"];
    _Highs_startCallback = Module2["_Highs_startCallback"] = wasmExports2["Ya"];
    _Highs_stopCallback = Module2["_Highs_stopCallback"] = wasmExports2["Za"];
    _Highs_getRunTime = Module2["_Highs_getRunTime"] = wasmExports2["_a"];
    _Highs_zeroAllClocks = Module2["_Highs_zeroAllClocks"] = wasmExports2["$a"];
    _Highs_addCol = Module2["_Highs_addCol"] = wasmExports2["ab"];
    _Highs_addCols = Module2["_Highs_addCols"] = wasmExports2["bb"];
    _Highs_addVar = Module2["_Highs_addVar"] = wasmExports2["cb"];
    _Highs_addVars = Module2["_Highs_addVars"] = wasmExports2["db"];
    _Highs_addRow = Module2["_Highs_addRow"] = wasmExports2["eb"];
    _Highs_addRows = Module2["_Highs_addRows"] = wasmExports2["fb"];
    _Highs_ensureColwise = Module2["_Highs_ensureColwise"] = wasmExports2["gb"];
    _Highs_ensureRowwise = Module2["_Highs_ensureRowwise"] = wasmExports2["hb"];
    _Highs_changeObjectiveSense = Module2["_Highs_changeObjectiveSense"] = wasmExports2["ib"];
    _Highs_changeObjectiveOffset = Module2["_Highs_changeObjectiveOffset"] = wasmExports2["jb"];
    _Highs_changeColIntegrality = Module2["_Highs_changeColIntegrality"] = wasmExports2["kb"];
    _Highs_changeColsIntegralityByRange = Module2["_Highs_changeColsIntegralityByRange"] = wasmExports2["lb"];
    _Highs_changeColsIntegralityBySet = Module2["_Highs_changeColsIntegralityBySet"] = wasmExports2["mb"];
    _Highs_changeColsIntegralityByMask = Module2["_Highs_changeColsIntegralityByMask"] = wasmExports2["nb"];
    _Highs_clearIntegrality = Module2["_Highs_clearIntegrality"] = wasmExports2["ob"];
    _Highs_changeColCost = Module2["_Highs_changeColCost"] = wasmExports2["pb"];
    _Highs_changeColsCostByRange = Module2["_Highs_changeColsCostByRange"] = wasmExports2["qb"];
    _Highs_changeColsCostBySet = Module2["_Highs_changeColsCostBySet"] = wasmExports2["rb"];
    _Highs_changeColsCostByMask = Module2["_Highs_changeColsCostByMask"] = wasmExports2["sb"];
    _Highs_changeColBounds = Module2["_Highs_changeColBounds"] = wasmExports2["tb"];
    _Highs_changeColsBoundsByRange = Module2["_Highs_changeColsBoundsByRange"] = wasmExports2["ub"];
    _Highs_changeColsBoundsBySet = Module2["_Highs_changeColsBoundsBySet"] = wasmExports2["vb"];
    _Highs_changeColsBoundsByMask = Module2["_Highs_changeColsBoundsByMask"] = wasmExports2["wb"];
    _Highs_changeRowBounds = Module2["_Highs_changeRowBounds"] = wasmExports2["xb"];
    _Highs_changeRowsBoundsByRange = Module2["_Highs_changeRowsBoundsByRange"] = wasmExports2["yb"];
    _Highs_changeRowsBoundsBySet = Module2["_Highs_changeRowsBoundsBySet"] = wasmExports2["zb"];
    _Highs_changeRowsBoundsByMask = Module2["_Highs_changeRowsBoundsByMask"] = wasmExports2["Ab"];
    _Highs_changeCoeff = Module2["_Highs_changeCoeff"] = wasmExports2["Bb"];
    _Highs_getObjectiveSense = Module2["_Highs_getObjectiveSense"] = wasmExports2["Cb"];
    _Highs_getObjectiveOffset = Module2["_Highs_getObjectiveOffset"] = wasmExports2["Db"];
    _Highs_getColsByRange = Module2["_Highs_getColsByRange"] = wasmExports2["Eb"];
    _Highs_getColsBySet = Module2["_Highs_getColsBySet"] = wasmExports2["Fb"];
    _Highs_getColsByMask = Module2["_Highs_getColsByMask"] = wasmExports2["Gb"];
    _Highs_getRowsByRange = Module2["_Highs_getRowsByRange"] = wasmExports2["Hb"];
    _Highs_getRowsBySet = Module2["_Highs_getRowsBySet"] = wasmExports2["Ib"];
    _Highs_getRowsByMask = Module2["_Highs_getRowsByMask"] = wasmExports2["Jb"];
    _Highs_getRowName = Module2["_Highs_getRowName"] = wasmExports2["Kb"];
    _Highs_getRowByName = Module2["_Highs_getRowByName"] = wasmExports2["Lb"];
    _Highs_getColName = Module2["_Highs_getColName"] = wasmExports2["Mb"];
    _Highs_getColByName = Module2["_Highs_getColByName"] = wasmExports2["Nb"];
    _Highs_getColIntegrality = Module2["_Highs_getColIntegrality"] = wasmExports2["Ob"];
    _Highs_deleteColsByRange = Module2["_Highs_deleteColsByRange"] = wasmExports2["Pb"];
    _Highs_deleteColsBySet = Module2["_Highs_deleteColsBySet"] = wasmExports2["Qb"];
    _Highs_deleteColsByMask = Module2["_Highs_deleteColsByMask"] = wasmExports2["Rb"];
    _Highs_deleteRowsByRange = Module2["_Highs_deleteRowsByRange"] = wasmExports2["Sb"];
    _Highs_deleteRowsBySet = Module2["_Highs_deleteRowsBySet"] = wasmExports2["Tb"];
    _Highs_deleteRowsByMask = Module2["_Highs_deleteRowsByMask"] = wasmExports2["Ub"];
    _Highs_scaleCol = Module2["_Highs_scaleCol"] = wasmExports2["Vb"];
    _Highs_scaleRow = Module2["_Highs_scaleRow"] = wasmExports2["Wb"];
    _Highs_getInfinity = Module2["_Highs_getInfinity"] = wasmExports2["Xb"];
    _Highs_getSizeofHighsInt = Module2["_Highs_getSizeofHighsInt"] = wasmExports2["Yb"];
    _Highs_getNumNz = Module2["_Highs_getNumNz"] = wasmExports2["Zb"];
    _Highs_getHessianNumNz = Module2["_Highs_getHessianNumNz"] = wasmExports2["_b"];
    _Highs_getPresolvedNumCol = Module2["_Highs_getPresolvedNumCol"] = wasmExports2["$b"];
    _Highs_getPresolvedNumRow = Module2["_Highs_getPresolvedNumRow"] = wasmExports2["ac"];
    _Highs_getPresolvedNumNz = Module2["_Highs_getPresolvedNumNz"] = wasmExports2["bc"];
    _Highs_getModel = Module2["_Highs_getModel"] = wasmExports2["cc"];
    _Highs_getLp = Module2["_Highs_getLp"] = wasmExports2["dc"];
    _Highs_getFixedLp = Module2["_Highs_getFixedLp"] = wasmExports2["ec"];
    _Highs_getPresolvedLp = Module2["_Highs_getPresolvedLp"] = wasmExports2["fc"];
    _Highs_getPresolvedColName = Module2["_Highs_getPresolvedColName"] = wasmExports2["gc"];
    _Highs_getPresolvedRowName = Module2["_Highs_getPresolvedRowName"] = wasmExports2["hc"];
    _Highs_getIis = Module2["_Highs_getIis"] = wasmExports2["ic"];
    _Highs_getIisLp = Module2["_Highs_getIisLp"] = wasmExports2["jc"];
    _Highs_crossover = Module2["_Highs_crossover"] = wasmExports2["kc"];
    _Highs_getRanging = Module2["_Highs_getRanging"] = wasmExports2["lc"];
    _Highs_feasibilityRelaxation = Module2["_Highs_feasibilityRelaxation"] = wasmExports2["mc"];
    _Highs_getCallbackDataOutItem = Module2["_Highs_getCallbackDataOutItem"] = wasmExports2["nc"];
    _Highs_setCallbackSolution = Module2["_Highs_setCallbackSolution"] = wasmExports2["oc"];
    _Highs_setCallbackSparseSolution = Module2["_Highs_setCallbackSparseSolution"] = wasmExports2["pc"];
    _Highs_repairCallbackSolution = Module2["_Highs_repairCallbackSolution"] = wasmExports2["qc"];
    _Highs_call = Module2["_Highs_call"] = wasmExports2["rc"];
    _malloc = Module2["_malloc"] = wasmExports2["tc"];
    _free = Module2["_free"] = wasmExports2["uc"];
    __emscripten_timeout = wasmExports2["vc"];
    __emscripten_stack_restore = wasmExports2["wc"];
    __emscripten_stack_alloc = wasmExports2["xc"];
    _emscripten_stack_get_current = wasmExports2["yc"];
    memory = wasmMemory = wasmExports2["u"];
    __indirect_function_table = wasmTable = wasmExports2["sc"];
  }
  var wasmImports = { a: ___cxa_throw, e: ___syscall_fcntl64, h: ___syscall_ioctl, i: ___syscall_openat, k: __abort_js, s: __emscripten_runtime_keepalive_clear, l: __setitimer_js, m: __tzset_js, p: _clock_time_get, j: _emscripten_date_now, c: _emscripten_get_now, q: _emscripten_resize_heap, n: _environ_get, o: _environ_sizes_get, b: _exit, d: _fd_close, g: _fd_read, t: _fd_seek, f: _fd_write, r: _proc_exit };
  async function run() {
    preRun();
    if (runDependencies) {
      await resolveRunDependencies();
    }
    var setStatus = Module2["setStatus"];
    if (setStatus) {
      setStatus("Running...");
      await new Promise((resolve) => setTimeout(resolve, 1));
      setTimeout(setStatus, 1, "");
    }
    if (ABORT) return;
    initRuntime();
    Module2["onRuntimeInitialized"]?.();
    postRun();
  }
  var wasmExports;
  wasmExports = await createWasm();
  await run();
  let legacySolveSequence = 0;
  Module2.Highs_readModel = Module2["cwrap"]("Highs_readModel", "number", ["number", "string"]);
  const Highs_setIntOptionValue = Module2["cwrap"]("Highs_setIntOptionValue", "number", ["number", "string", "number"]);
  const Highs_setDoubleOptionValue = Module2["cwrap"]("Highs_setDoubleOptionValue", "number", ["number", "string", "number"]);
  const Highs_setStringOptionValue = Module2["cwrap"]("Highs_setStringOptionValue", "number", ["number", "string", "string"]);
  const Highs_setBoolOptionValue = Module2["cwrap"]("Highs_setBoolOptionValue", "number", ["number", "string", "number"]);
  const Highs_getOptionType = Module2["cwrap"]("Highs_getOptionType", "number", ["number", "string", "number"]);
  const Highs_getNumCol = Module2["cwrap"]("Highs_getNumCol", "number", ["number"]);
  const Highs_getNumRow = Module2["cwrap"]("Highs_getNumRow", "number", ["number"]);
  const Highs_getObjectiveValue = Module2["cwrap"]("Highs_getObjectiveValue", "number", ["number"]);
  const Highs_getInfinity = Module2["cwrap"]("Highs_getInfinity", "number", []);
  const Highs_getSolution = Module2["cwrap"]("Highs_getSolution", "number", ["number", "number", "number", "number", "number"]);
  const Highs_getBasis = Module2["cwrap"]("Highs_getBasis", "number", ["number", "number", "number"]);
  const Highs_getColsByRange = Module2["cwrap"]("Highs_getColsByRange", "number", ["number", "number", "number", "number", "number", "number", "number", "number", "number", "number", "number"]);
  const Highs_getRowsByRange = Module2["cwrap"]("Highs_getRowsByRange", "number", ["number", "number", "number", "number", "number", "number", "number", "number", "number", "number"]);
  const Highs_getColIntegrality = Module2["cwrap"]("Highs_getColIntegrality", "number", ["number", "number", "number"]);
  const Highs_js_getColName = Module2["cwrap"]("Highs_js_getColName", "number", ["number", "number", "number", "number", "number"]);
  const Highs_js_getRowName = Module2["cwrap"]("Highs_js_getRowName", "number", ["number", "number", "number", "number", "number"]);
  const MODEL_STATUS_CODES = { 0: "Not Set", 1: "Load error", 2: "Model error", 3: "Presolve error", 4: "Solve error", 5: "Postsolve error", 6: "Empty", 7: "Optimal", 8: "Infeasible", 9: "Primal infeasible or unbounded", 10: "Unbounded", 11: "Bound on objective reached", 12: "Target for objective reached", 13: "Time limit reached", 14: "Iteration limit reached", 15: "Unknown" };
  var _Highs_create, _Highs_run, _Highs_destroy, _Highs_getModelStatus, FS;
  const BASIS_STATUS_RAW = { 0: "LB", 1: "BS", 2: "UB", 3: "FX" };
  function basisLabel(basisCode, lower, upper) {
    if (basisCode === 3) return "FX";
    if (basisCode === 2 && lower === upper) return "FX";
    return BASIS_STATUS_RAW[basisCode] || "";
  }
  const NO_SOLUTION_STATUSES = /* @__PURE__ */ new Set(["Not Set", "Load error", "Model error", "Presolve error", "Solve error", "Postsolve error", "Empty", "Infeasible", "Unknown"]);
  Module2["solve"] = function(model_str, highs_options) {
    const solveId = ++legacySolveSequence;
    const modelFilename = `highs-model-${solveId}.lp`;
    let highs;
    const allocations = [];
    function alloc(size) {
      const ptr = _malloc(size);
      if (!ptr) throw new Error("malloc failed");
      allocations.push(ptr);
      return ptr;
    }
    function getColName(highsPtr, index) {
      const reqPtr = alloc(Int32Array.BYTES_PER_ELEMENT);
      let st = Highs_js_getColName(highsPtr, index, 0, 0, reqPtr);
      if (st !== 0 && st !== 1) return "";
      const capacity = HEAP32[reqPtr >> 2];
      if (capacity <= 0) return "";
      const buf = _malloc(capacity);
      allocations.push(buf);
      st = Highs_js_getColName(highsPtr, index, buf, capacity, reqPtr);
      if (st !== 0 && st !== 1) return "";
      return UTF8ToString(buf);
    }
    function getRowName(highsPtr, index) {
      const reqPtr = alloc(Int32Array.BYTES_PER_ELEMENT);
      let st = Highs_js_getRowName(highsPtr, index, 0, 0, reqPtr);
      if (st !== 0 && st !== 1) return "";
      const capacity = HEAP32[reqPtr >> 2];
      if (capacity <= 0) return "";
      const buf = _malloc(capacity);
      allocations.push(buf);
      st = Highs_js_getRowName(highsPtr, index, buf, capacity, reqPtr);
      if (st !== 0 && st !== 1) return "";
      return UTF8ToString(buf);
    }
    try {
      FS.writeFile(modelFilename, model_str);
      highs = _Highs_create();
      if (!highs) throw new Error("Unable to create the HiGHS solver");
      assert_ok(() => Module2.Highs_readModel(highs, modelFilename), "read LP model (see http://web.mit.edu/lpsolve/doc/CPLEX-format.htm)");
      const options = highs_options || {};
      for (const option_name in options) {
        const option_value = options[option_name];
        const type = typeof option_value;
        let setoption;
        if (type === "number") setoption = setNumericOption;
        else if (type === "boolean") setoption = Highs_setBoolOptionValue;
        else if (type === "string") setoption = Highs_setStringOptionValue;
        else throw new Error(`Unsupported option value type ${option_value} for '${option_name}'`);
        assert_ok(() => setoption(highs, option_name, option_value), `set option '${option_name}'`);
      }
      assert_ok(() => _Highs_run(highs), "solve the problem");
      const statusCode = _Highs_getModelStatus(highs);
      const status = MODEL_STATUS_CODES[statusCode] || "Unknown";
      if (status === "Empty") {
        return { Columns: {}, Rows: [], ObjectiveValue: 0, Status: "Empty" };
      }
      const numCol = Highs_getNumCol(highs);
      const numRow = Highs_getNumRow(highs);
      const infinity = Highs_getInfinity();
      let objValue = Highs_getObjectiveValue(highs);
      if (Math.abs(objValue) >= infinity * 0.5) {
        objValue = objValue > 0 ? Infinity : -Infinity;
      }
      const colValuePtr = numCol > 0 ? alloc(numCol * Float64Array.BYTES_PER_ELEMENT) : 0;
      const colDualPtr = numCol > 0 ? alloc(numCol * Float64Array.BYTES_PER_ELEMENT) : 0;
      const rowValuePtr = numRow > 0 ? alloc(numRow * Float64Array.BYTES_PER_ELEMENT) : 0;
      const rowDualPtr = numRow > 0 ? alloc(numRow * Float64Array.BYTES_PER_ELEMENT) : 0;
      const solutionResult = Highs_getSolution(highs, colValuePtr, colDualPtr, rowValuePtr, rowDualPtr);
      const hasSolution = solutionResult === 0 || solutionResult === 1;
      const colBasisPtr = numCol > 0 ? alloc(numCol * Int32Array.BYTES_PER_ELEMENT) : 0;
      const rowBasisPtr = numRow > 0 ? alloc(numRow * Int32Array.BYTES_PER_ELEMENT) : 0;
      let hasBasis = false;
      const basisResult = Highs_getBasis(highs, colBasisPtr, rowBasisPtr);
      if (basisResult === 0 || basisResult === 1) {
        hasBasis = true;
      }
      const numColOutPtr = alloc(Int32Array.BYTES_PER_ELEMENT);
      const colCostPtr = numCol > 0 ? alloc(numCol * Float64Array.BYTES_PER_ELEMENT) : 0;
      const colLowerPtr = numCol > 0 ? alloc(numCol * Float64Array.BYTES_PER_ELEMENT) : 0;
      const colUpperPtr = numCol > 0 ? alloc(numCol * Float64Array.BYTES_PER_ELEMENT) : 0;
      Highs_getColsByRange(highs, 0, numCol - 1, numColOutPtr, colCostPtr, colLowerPtr, colUpperPtr, 0, 0, 0, 0);
      const numRowOutPtr = alloc(Int32Array.BYTES_PER_ELEMENT);
      const rowLowerPtr = numRow > 0 ? alloc(numRow * Float64Array.BYTES_PER_ELEMENT) : 0;
      const rowUpperPtr = numRow > 0 ? alloc(numRow * Float64Array.BYTES_PER_ELEMENT) : 0;
      Highs_getRowsByRange(highs, 0, numRow - 1, numRowOutPtr, rowLowerPtr, rowUpperPtr, 0, 0, 0, 0);
      const integPtr = alloc(Int32Array.BYTES_PER_ELEMENT);
      const hasPrimal = hasSolution && !NO_SOLUTION_STATUSES.has(status);
      let isMip = false;
      for (let i = 0; i < numCol && !isMip; i++) {
        Highs_getColIntegrality(highs, i, integPtr);
        if (HEAP32[integPtr >> 2] !== 0) isMip = true;
      }
      const columns = {};
      for (let i = 0; i < numCol; i++) {
        const col = { Index: i, Lower: HEAPF64[(colLowerPtr >> 3) + i], Upper: HEAPF64[(colUpperPtr >> 3) + i] };
        Highs_getColIntegrality(highs, i, integPtr);
        col.Type = HEAP32[integPtr >> 2] === 1 ? "Integer" : "Continuous";
        if (hasPrimal) {
          col.Primal = HEAPF64[(colValuePtr >> 3) + i];
        }
        if (hasBasis && hasPrimal && !isMip) {
          const basisCode = HEAP32[(colBasisPtr >> 2) + i];
          col.Status = basisLabel(basisCode, col.Lower, col.Upper);
          col.Dual = HEAPF64[(colDualPtr >> 3) + i];
        }
        col.Name = getColName(highs, i);
        columns[col.Name] = col;
      }
      const rows = [];
      for (let i = 0; i < numRow; i++) {
        const row = { Index: i, Name: getRowName(highs, i), Lower: HEAPF64[(rowLowerPtr >> 3) + i], Upper: HEAPF64[(rowUpperPtr >> 3) + i] };
        if (hasPrimal) {
          row.Primal = HEAPF64[(rowValuePtr >> 3) + i];
        }
        if (hasBasis && hasPrimal && !isMip) {
          const basisCode = HEAP32[(rowBasisPtr >> 2) + i];
          row.Status = basisLabel(basisCode, row.Lower, row.Upper);
          row.Dual = HEAPF64[(rowDualPtr >> 3) + i];
        }
        rows.push(row);
      }
      return { Status: status, ObjectiveValue: objValue, Columns: columns, Rows: rows };
    } finally {
      if (highs) _Highs_destroy(highs);
      try {
        FS.unlink(modelFilename);
      } catch (_) {
      }
      for (let i = allocations.length - 1; i >= 0; i--) {
        try {
          _free(allocations[i]);
        } catch (_) {
        }
      }
    }
  };
  function setNumericOption(highs, option_name, option_value) {
    const typePointer = _malloc(Int32Array.BYTES_PER_ELEMENT);
    if (!typePointer) return -1;
    try {
      const status = Highs_getOptionType(highs, option_name, typePointer);
      if (status !== 0 && status !== 1) return status;
      const optionType = HEAP32[typePointer >> 2];
      if (optionType === 1) {
        if (!Number.isSafeInteger(option_value) || option_value < -2147483648 || option_value > 2147483647) return -1;
        return Highs_setIntOptionValue(highs, option_name, option_value);
      }
      if (optionType === 2) return Highs_setDoubleOptionValue(highs, option_name, option_value);
      return -1;
    } finally {
      _free(typePointer);
    }
  }
  function assert_ok(fn, action) {
    let err2;
    try {
      err2 = fn();
    } catch (e) {
      err2 = e;
    }
    if (err2 !== 0 && err2 !== 1) throw new Error("Unable to " + action + ". HiGHS error " + err2);
  }
  var __classPrivateFieldSet = this && this.__classPrivateFieldSet || function(receiver, state, value, kind, f) {
    if (kind === "m") throw new TypeError("Private method is not writable");
    if (kind === "a" && !f) throw new TypeError("Private accessor was defined without a setter");
    if (typeof state === "function" ? receiver !== state || !f : !state.has(receiver)) throw new TypeError("Cannot write private member to an object whose class did not declare it");
    return kind === "a" ? f.call(receiver, value) : f ? f.value = value : state.set(receiver, value), value;
  };
  var __classPrivateFieldGet = this && this.__classPrivateFieldGet || function(receiver, state, kind, f) {
    if (kind === "a" && !f) throw new TypeError("Private accessor was defined without a getter");
    if (typeof state === "function" ? receiver !== state || !f : !state.has(receiver)) throw new TypeError("Cannot read private member from an object whose class did not declare it");
    return kind === "m" ? f : kind === "a" ? f.call(receiver) : f ? f.value : state.get(receiver);
  };
  (function installExtendedHighsApi(Module3) {
    "use strict";
    var _RawModel_pointer, _RawModel_disposed;
    const STATUS_ERROR = -1;
    const STATUS_OK = 0;
    const STATUS_WARNING = 1;
    const FORMAT = { csc: 1, csr: 2 };
    const HESSIAN_FORMAT = { triangular: 1, square: 2 };
    const callbacks = /* @__PURE__ */ new Map();
    const liveModels = /* @__PURE__ */ new Map();
    const native = /* @__PURE__ */ new Map();
    let nextCallbackId = 1;
    let nextTempId = 1;
    let callbackFunctionPointer = 0;
    class HighsError extends Error {
      constructor(message, operation) {
        super(message);
        this.status = STATUS_ERROR;
        this.name = "HighsError";
        this.operation = operation;
      }
    }
    class HighsDisposedError extends HighsError {
      constructor() {
        super("Cannot use this HiGHS model after disposal; create a new model or keep the work inside highs.withModel()", "dispose");
        this.name = "HighsDisposedError";
      }
    }
    class HighsValidationError extends HighsError {
      constructor(message) {
        super(message, "validate");
        this.name = "HighsValidationError";
      }
    }
    class HighsReentrancyError extends HighsError {
      constructor() {
        super("Only callback control methods may be called while HiGHS is executing a callback", "callback");
        this.name = "HighsReentrancyError";
      }
    }
    class HighsUnsupportedOptionError extends HighsError {
      constructor(option) {
        super("Option '" + option + "' is not supported by the single-threaded data-only API", "setOptionValue");
        this.name = "HighsUnsupportedOptionError";
        this.option = option;
      }
    }
    function nativeFunction(name, returnType, argumentTypes) {
      const key3 = name + ":" + returnType + ":" + argumentTypes.join(",");
      let wrapped = native.get(key3);
      if (!wrapped) {
        const callable = Module3["cwrap"](name, returnType, argumentTypes);
        wrapped = function(...args) {
          const result = callable.apply(null, args);
          const owner = liveModels.get(args[0]);
          if (owner) owner._throwCallbackError();
          return result;
        };
        native.set(key3, wrapped);
      }
      return wrapped;
    }
    function numericFunction(name, argumentCount, returnType = "number") {
      return nativeFunction(name, returnType, new Array(argumentCount).fill("number"));
    }
    function stringFunction(name, before, after, returnType = "number") {
      return nativeFunction(name, returnType, new Array(before || 0).fill("number").concat(["string"], new Array(after || 0).fill("number")));
    }
    function heapU8() {
      return HEAPU8;
    }
    function heap32() {
      return HEAP32;
    }
    function heapF64() {
      return HEAPF64;
    }
    function utf8(pointer) {
      return pointer ? UTF8ToString(pointer) : "";
    }
    function validationError(message) {
      return new HighsValidationError(message);
    }
    function disposedError() {
      return new HighsDisposedError();
    }
    function nativeError(operation) {
      return new HighsError(operation + " failed with HiGHS status -1", operation);
    }
    function unsupportedOptionError(option) {
      return new HighsUnsupportedOptionError(option);
    }
    function reentrancyError() {
      return new HighsReentrancyError();
    }
    function rawStatus(status) {
      return { status };
    }
    function rawResult(status, value) {
      return status === STATUS_ERROR ? { status } : { status, value };
    }
    function callMetadata(status, operation) {
      if (status === STATUS_ERROR) throw nativeError(operation);
      return { status, warnings: status === STATUS_WARNING ? [operation + " completed with a HiGHS warning"] : [] };
    }
    function requireInteger(value, label, minimum = 0) {
      if (!Number.isSafeInteger(value) || value < (minimum || 0) || value > 2147483647) throw validationError(label + " must be a 32-bit non-negative integer");
      return value;
    }
    function requireSignedInteger(value, label) {
      if (!Number.isSafeInteger(value) || value < -2147483648 || value > 2147483647) throw validationError(label + " must be a signed 32-bit integer");
      return value;
    }
    function asArray(value, label) {
      if (value == null || typeof value.length !== "number") throw validationError(label + " must be an array or typed array");
      return value;
    }
    function validateLength(value, expected, label) {
      asArray(value, label);
      if (value.length !== expected) throw validationError(label + " must contain " + expected + " values; got " + value.length);
      return value;
    }
    function validateFiniteOrInfinity(value, label) {
      if (typeof value !== "number" || Number.isNaN(value)) throw validationError(label + " must be a number");
      return value;
    }
    function validateDoubleArray(value, expected, label) {
      validateLength(value, expected, label);
      for (let index = 0; index < value.length; index++) validateFiniteOrInfinity(value[index], label + "[" + index + "]");
      return value;
    }
    function validateIndexArray(value, expected, label, upperBound) {
      if (expected == null) asArray(value, label);
      else validateLength(value, expected, label);
      for (let index = 0; index < value.length; index++) {
        const item = value[index];
        requireInteger(item, label + "[" + index + "]", 0);
        if (upperBound != null && item >= upperBound) throw validationError(label + "[" + index + "] is outside the model");
      }
      return value;
    }
    function validateSparseMatrix(matrix, numRows, numCols, label) {
      if (!matrix || matrix.format !== "csc" && matrix.format !== "csr") throw validationError(label + ".format must be 'csc' or 'csr'");
      if (matrix.numRows !== numRows || matrix.numCols !== numCols) throw validationError(label + " dimensions do not match the model");
      const major = matrix.format === "csc" ? numCols : numRows;
      validateIndexArray(matrix.starts, major + 1, label + ".starts");
      if (matrix.starts[0] !== 0) throw validationError(label + ".starts must begin with zero");
      for (let index = 1; index < matrix.starts.length; index++) {
        if (matrix.starts[index] < matrix.starts[index - 1]) throw validationError(label + ".starts must be monotonic");
      }
      const nonzeros = matrix.starts[major];
      validateIndexArray(matrix.indices, nonzeros, label + ".indices", matrix.format === "csc" ? numRows : numCols);
      validateDoubleArray(matrix.values, nonzeros, label + ".values");
      return nonzeros;
    }
    function validateHessian(hessian, dimension, label) {
      if (!hessian || !(hessian.format in HESSIAN_FORMAT)) throw validationError(label + ".format must be 'triangular' or 'square'");
      if (hessian.dimension !== dimension) throw validationError(label + ".dimension must equal numCols");
      validateIndexArray(hessian.starts, dimension + 1, label + ".starts");
      if (hessian.starts[0] !== 0) throw validationError(label + ".starts must begin with zero");
      for (let index = 1; index < hessian.starts.length; index++) {
        if (hessian.starts[index] < hessian.starts[index - 1]) throw validationError(label + ".starts must be monotonic");
      }
      const nonzeros = hessian.starts[dimension];
      validateIndexArray(hessian.indices, nonzeros, label + ".indices", dimension);
      validateDoubleArray(hessian.values, nonzeros, label + ".values");
      return nonzeros;
    }
    function validateModel(model) {
      if (!model || typeof model !== "object") throw validationError("model must be an object");
      const numCols = requireInteger(model.numCols, "numCols", 0);
      const numRows = requireInteger(model.numRows, "numRows", 0);
      validateDoubleArray(model.colCost, numCols, "colCost");
      validateDoubleArray(model.colLower, numCols, "colLower");
      validateDoubleArray(model.colUpper, numCols, "colUpper");
      validateDoubleArray(model.rowLower, numRows, "rowLower");
      validateDoubleArray(model.rowUpper, numRows, "rowUpper");
      const numNonzeros = validateSparseMatrix(model.matrix, numRows, numCols, "matrix");
      if (model.integrality != null) {
        validateIndexArray(model.integrality, numCols, "integrality");
        for (let index = 0; index < numCols; index++) {
          if (model.integrality[index] > 4) throw validationError("integrality values must be between 0 and 4");
        }
      }
      const hessianNonzeros = model.hessian ? validateHessian(model.hessian, numCols, "hessian") : 0;
      const sense = model.sense == null ? 1 : model.sense;
      if (sense !== 1 && sense !== -1) throw validationError("sense must be 1 (minimize) or -1 (maximize)");
      validateFiniteOrInfinity(model.offset == null ? 0 : model.offset, "offset");
      if (model.modelName != null && typeof model.modelName !== "string") throw validationError("modelName must be a string");
      for (const [names, count2, label] of [[model.colNames, numCols, "colNames"], [model.rowNames, numRows, "rowNames"]]) {
        if (names == null) continue;
        validateLength(names, count2, label);
        for (let index = 0; index < names.length; index++) if (typeof names[index] !== "string") throw validationError(label + "[" + index + "] must be a string");
      }
      return { numCols, numRows, numNonzeros, hessianNonzeros, sense };
    }
    function validateLinearObjective(objective, numCols, label) {
      if (!objective || typeof objective !== "object") throw validationError(label + " must be an object");
      validateFiniteOrInfinity(objective.weight, label + ".weight");
      validateFiniteOrInfinity(objective.offset, label + ".offset");
      validateDoubleArray(objective.coefficients, numCols, label + ".coefficients");
      validateFiniteOrInfinity(objective.absoluteTolerance, label + ".absoluteTolerance");
      validateFiniteOrInfinity(objective.relativeTolerance, label + ".relativeTolerance");
      requireSignedInteger(objective.priority, label + ".priority");
    }
    class Arena {
      constructor() {
        this.pointers = [];
      }
      bytes(byteLength) {
        requireInteger(byteLength, "allocation size", 0);
        const pointer = _malloc(Math.max(1, byteLength));
        if (!pointer) throw new RangeError("Unable to allocate WebAssembly memory");
        this.pointers.push(pointer);
        return pointer;
      }
      ints(values) {
        const pointer = this.bytes(values.length * 4);
        heap32().set(values, pointer >> 2);
        return pointer;
      }
      doubles(values) {
        const pointer = this.bytes(values.length * 8);
        heapF64().set(values, pointer >> 3);
        return pointer;
      }
      pack(entries) {
        const offsets = [];
        let byteLength = 0;
        for (const entry of entries) {
          const alignment = entry.type === "f64" ? 8 : 4;
          byteLength = Math.ceil(byteLength / alignment) * alignment;
          offsets.push(byteLength);
          byteLength += entry.values.length * alignment;
        }
        const base = this.bytes(byteLength);
        entries.forEach((entry, index) => {
          const pointer = base + offsets[index];
          if (entry.type === "f64") heapF64().set(entry.values, pointer >> 3);
          else heap32().set(entry.values, pointer >> 2);
        });
        return offsets.map((offset) => base + offset);
      }
      outInts(length) {
        const pointer = this.bytes(length * 4);
        heap32().fill(0, pointer >> 2, (pointer >> 2) + length);
        return pointer;
      }
      outDoubles(length) {
        const pointer = this.bytes(length * 8);
        heapF64().fill(0, pointer >> 3, (pointer >> 3) + length);
        return pointer;
      }
      free() {
        for (let index = this.pointers.length - 1; index >= 0; index--) _free(this.pointers[index]);
        this.pointers.length = 0;
      }
    }
    function withArena(operation) {
      const arena = new Arena();
      try {
        return operation(arena);
      } finally {
        arena.free();
      }
    }
    function copyInts(pointer, length) {
      return heap32().slice(pointer >> 2, (pointer >> 2) + length);
    }
    function copyDoubles(pointer, length) {
      return heapF64().slice(pointer >> 3, (pointer >> 3) + length);
    }
    function readInt64(pointer) {
      return new BigInt64Array(heapU8().buffer, pointer, 1)[0];
    }
    function privateFilename(extension) {
      return "/tmp/highs-js-" + nextTempId++ + "." + extension;
    }
    function withInputFile(source, operation) {
      if (!source || source.format !== "lp" && source.format !== "mps") throw validationError("format must be 'lp' or 'mps'");
      if (!(typeof source.data === "string" || ArrayBuffer.isView(source.data))) throw validationError("model data must be a string or Uint8Array");
      const filename = privateFilename(source.format);
      try {
        FS.writeFile(filename, source.data);
        return operation(filename);
      } finally {
        try {
          FS.unlink(filename);
        } catch (_) {
        }
      }
    }
    function withTextInput(text, extension, operation) {
      if (typeof text !== "string") throw validationError("data must be a string");
      const filename = privateFilename(extension);
      try {
        FS.writeFile(filename, text);
        return operation(filename);
      } finally {
        try {
          FS.unlink(filename);
        } catch (_) {
        }
      }
    }
    function withOutputFile(extension, encoding, operation) {
      const filename = privateFilename(extension);
      try {
        const status = operation(filename);
        if (status === STATUS_ERROR) return rawResult(status);
        const value = FS.readFile(filename, encoding === "utf8" ? { encoding: "utf8" } : void 0);
        return rawResult(status, value);
      } finally {
        try {
          FS.unlink(filename);
        } catch (_) {
        }
      }
    }
    function isForbiddenOption(name) {
      return /thread|parallel|concurr/i.test(name) || /(^|_)(log_file|read_.*_file|write_.*_file|solution_file|.*_file)$/.test(name) || /^write_.*_to_file$/.test(name);
    }
    function validateOption(name) {
      if (typeof name !== "string" || !name) throw validationError("option name is required");
      if (isForbiddenOption(name)) throw unsupportedOptionError(name);
    }
    function rawOptionIsAllowed(name) {
      if (typeof name !== "string" || !name) throw validationError("option name is required");
      return !isForbiddenOption(name);
    }
    function validateOptionText(text) {
      if (typeof text !== "string") throw validationError("option data must be a string");
      for (const line of text.split(/\r?\n/)) {
        const match = /^\s*([A-Za-z][A-Za-z0-9_]*)\b/.exec(line);
        if (match && !line.trimStart().startsWith("#")) validateOption(match[1]);
      }
    }
    function selectionArguments(selection, dimension, arena, label) {
      if (!selection || typeof selection !== "object") throw validationError(label + " selection must be tagged");
      if (selection.kind === "range") {
        const from = requireInteger(selection.from, label + ".from", 0);
        const to = requireInteger(selection.to, label + ".to", 0);
        if (to < from || to >= dimension) throw validationError(label + " range is outside the model");
        return { suffix: "ByRange", prefix: [from, to], count: to - from + 1 };
      }
      if (selection.kind === "set") {
        validateIndexArray(selection.indices, null, label + ".indices", dimension);
        for (let index = 1; index < selection.indices.length; index++) if (selection.indices[index] <= selection.indices[index - 1]) throw validationError(label + " set indices must increase strictly");
        return { suffix: "BySet", prefix: [selection.indices.length, arena.ints(selection.indices)], count: selection.indices.length };
      }
      if (selection.kind === "mask") {
        validateLength(selection.mask, dimension, label + ".mask");
        const mask = new Int32Array(dimension);
        let count2 = 0;
        for (let index = 0; index < dimension; index++) {
          if (selection.mask[index] !== false && selection.mask[index] !== true && selection.mask[index] !== 0 && selection.mask[index] !== 1) throw validationError(label + ".mask values must be boolean, 0, or 1");
          mask[index] = selection.mask[index] ? 1 : 0;
          count2 += mask[index];
        }
        return { suffix: "ByMask", prefix: [arena.ints(mask)], count: count2 };
      }
      throw validationError(label + ".kind must be 'range', 'set', or 'mask'");
    }
    function dimensions(pointer) {
      return { numCols: numericFunction("Highs_getNumCol", 1)(pointer), numRows: numericFunction("Highs_getNumRow", 1)(pointer), numNonzeros: numericFunction("Highs_getNumNz", 1)(pointer), hessianNonzeros: numericFunction("Highs_getHessianNumNz", 1)(pointer) };
    }
    function presolvedDimensions(pointer) {
      return { numCols: numericFunction("Highs_getPresolvedNumCol", 1)(pointer), numRows: numericFunction("Highs_getPresolvedNumRow", 1)(pointer), numNonzeros: numericFunction("Highs_getPresolvedNumNz", 1)(pointer) };
    }
    class RawModel {
      constructor(pointer) {
        _RawModel_pointer.set(this, void 0);
        _RawModel_disposed.set(this, void 0);
        this._callbackNumCols = 0;
        __classPrivateFieldSet(this, _RawModel_pointer, pointer, "f");
        __classPrivateFieldSet(this, _RawModel_disposed, false, "f");
        this._callbackDepth = 0;
        this._callbackId = 0;
        this._callbackError = void 0;
        this._callbackErrorPending = false;
        liveModels.set(pointer, this);
      }
      get disposed() {
        return __classPrivateFieldGet(this, _RawModel_disposed, "f");
      }
      _require(callbackSafe = false) {
        if (__classPrivateFieldGet(this, _RawModel_disposed, "f")) throw disposedError();
        if (this._callbackDepth && !callbackSafe) throw reentrancyError();
        return __classPrivateFieldGet(this, _RawModel_pointer, "f");
      }
      _rememberCallbackError(error) {
        if (!this._callbackErrorPending) {
          this._callbackError = error;
          this._callbackErrorPending = true;
        }
      }
      _throwCallbackError() {
        if (!this._callbackErrorPending) return;
        const error = this._callbackError;
        this._callbackError = void 0;
        this._callbackErrorPending = false;
        throw error;
      }
      clear() {
        return this._simple("Highs_clear");
      }
      clearSolver() {
        return this._simple("Highs_clearSolver");
      }
      presolve() {
        return this._simple("Highs_presolve");
      }
      getRunTime() {
        return numericFunction("Highs_getRunTime", 1)(this._require(false));
      }
      readModel(source) {
        const pointer = this._require(false);
        return rawStatus(withInputFile(source, function(filename) {
          return stringFunction("Highs_readModel", 1, 0)(pointer, filename);
        }));
      }
      exportPresolvedModel(format) {
        const pointer = this._require(false);
        if (format !== "lp" && format !== "mps") throw validationError("format must be 'lp' or 'mps'");
        return withOutputFile(format, format === "lp" ? "utf8" : void 0, function(filename) {
          return stringFunction("Highs_writePresolvedModel", 1, 0)(pointer, filename);
        });
      }
      passModel(model) {
        const pointer = this._require(false);
        const result = withArena(function(arena) {
          const marshalled = passModelArguments(model, arena);
          return numericFunction("Highs_passModel", 21).apply(null, [pointer].concat(marshalled.values));
        });
        const nameStatus = result === STATUS_ERROR ? result : passNames(pointer, model);
        return rawStatus(result === STATUS_ERROR || nameStatus === STATUS_ERROR ? STATUS_ERROR : Math.max(result, nameStatus));
      }
      passMip(model) {
        const pointer = this._require(false);
        const result = withArena(function(arena) {
          const shape = validateModel(model);
          const matrix = model.matrix;
          if (!model.integrality) throw validationError("passMip requires an integrality vector");
          const packed = packLpArrays(model, arena, true);
          return numericFunction("Highs_passMip", 16)(pointer, shape.numCols, shape.numRows, shape.numNonzeros, FORMAT[matrix.format], shape.sense, model.offset == null ? 0 : model.offset, ...packed);
        });
        const nameStatus = result === STATUS_ERROR ? result : passNames(pointer, model);
        return rawStatus(result === STATUS_ERROR || nameStatus === STATUS_ERROR ? STATUS_ERROR : Math.max(result, nameStatus));
      }
      passHessian(hessian) {
        const pointer = this._require(false);
        const dimension = dimensions(pointer).numCols;
        return rawStatus(withArena(function(arena) {
          const nonzeros = validateHessian(hessian, dimension, "hessian");
          return numericFunction("Highs_passHessian", 7)(pointer, dimension, nonzeros, HESSIAN_FORMAT[hessian.format], arena.ints(Array.prototype.slice.call(hessian.starts, 0, -1)), arena.ints(hessian.indices), arena.doubles(hessian.values));
        }));
      }
      addLinearObjective(objective) {
        const pointer = this._require(false);
        const numCols = dimensions(pointer).numCols;
        validateLinearObjective(objective, numCols, "objective");
        return rawStatus(withArena(function(arena) {
          return numericFunction("Highs_addLinearObjective", 7)(pointer, objective.weight, objective.offset, arena.doubles(objective.coefficients), objective.absoluteTolerance, objective.relativeTolerance, requireSignedInteger(objective.priority, "priority"));
        }));
      }
      passRowName(index, name) {
        const pointer = this._require(false);
        requireInteger(index, "row", 0);
        if (typeof name !== "string") throw validationError("name must be a string");
        return rawStatus(stringFunction("Highs_passRowName", 2, 0)(pointer, index, name));
      }
      passModelName(name) {
        if (typeof name !== "string") throw validationError("name must be a string");
        return rawStatus(stringFunction("Highs_passModelName", 1, 0)(this._require(false), name));
      }
      getOptionType(name) {
        const pointer = this._require(false);
        if (!rawOptionIsAllowed(name)) return rawResult(STATUS_ERROR);
        return withArena(function(arena) {
          const output = arena.outInts(1);
          const status = stringFunction("Highs_getOptionType", 1, 1)(pointer, name, output);
          const types = ["boolean", "integer", "double", "string"];
          return rawResult(status, types[heap32()[output >> 2]]);
        });
      }
      resetOptions() {
        return this._simple("Highs_resetOptions");
      }
      exportOptions(deviationsOnly) {
        const pointer = this._require(false);
        const result = withOutputFile("options", "utf8", function(filename) {
          return stringFunction(deviationsOnly ? "Highs_writeOptionsDeviations" : "Highs_writeOptions", 1, 0)(pointer, filename);
        });
        if (result.status !== STATUS_ERROR) {
          result.value = result.value.split(/\r?\n/).filter(function(line) {
            const match = /^\s*([A-Za-z][A-Za-z0-9_]*)\b/.exec(line);
            return !match || !isForbiddenOption(match[1]);
          }).join("\n");
        }
        return result;
      }
      getOptionName(index) {
        const pointer = this._require(false);
        requireInteger(index, "option index", 0);
        return withArena(function(arena) {
          const output = arena.outInts(1);
          const status = numericFunction("Highs_getOptionName", 3)(pointer, index, output);
          const namePointer = heap32()[output >> 2] >>> 0;
          if (!namePointer) return rawResult(status, "");
          try {
            return rawResult(status, utf8(namePointer));
          } finally {
            _free(namePointer);
          }
        });
      }
      getInfoType(name) {
        const pointer = this._require(false);
        if (typeof name !== "string" || !name) throw validationError("info name is required");
        return withArena(function(arena) {
          const output = arena.outInts(1);
          const status = stringFunction("Highs_getInfoType", 1, 1)(pointer, name, output);
          const type = heap32()[output >> 2];
          return rawResult(status, type === -1 ? "int64" : type === 1 ? "integer" : type === 2 ? "double" : void 0);
        });
      }
      getDimensions() {
        return dimensions(this._require(false));
      }
      getInfinity() {
        return numericFunction("Highs_getInfinity", 1)(this._require(false));
      }
      getModelStatus() {
        return numericFunction("Highs_getModelStatus", 1)(this._require(false));
      }
      getSolution() {
        const pointer = this._require(false);
        const modelStatus = this.getModelStatus();
        if (modelStatus === 0 || modelStatus === 6) throw new HighsError("The model has not been solved", "getSolution");
        const shape = dimensions(pointer);
        return withArena(function(arena) {
          const colValue = arena.outDoubles(shape.numCols);
          const colDual = arena.outDoubles(shape.numCols);
          const rowValue = arena.outDoubles(shape.numRows);
          const rowDual = arena.outDoubles(shape.numRows);
          const status = numericFunction("Highs_getSolution", 5)(pointer, colValue, colDual, rowValue, rowDual);
          return rawResult(status, { colValue: copyDoubles(colValue, shape.numCols), rowValue: copyDoubles(rowValue, shape.numRows), colDual: copyDoubles(colDual, shape.numCols), rowDual: copyDoubles(rowDual, shape.numRows) });
        });
      }
      setSolution(solution) {
        const pointer = this._require(false);
        const shape = dimensions(pointer);
        return rawStatus(withArena(function(arena) {
          function optional(values, length, label) {
            if (values == null) return 0;
            validateDoubleArray(values, length, label);
            return arena.doubles(values);
          }
          return numericFunction("Highs_setSolution", 5)(pointer, optional(solution.colValue, shape.numCols, "colValue"), optional(solution.rowValue, shape.numRows, "rowValue"), optional(solution.colDual, shape.numCols, "colDual"), optional(solution.rowDual, shape.numRows, "rowDual"));
        }));
      }
      setBasis(basis) {
        const pointer = this._require(false);
        const shape = dimensions(pointer);
        if (!basis) throw validationError("basis is required");
        validateIndexArray(basis.colStatus, shape.numCols, "colStatus");
        validateIndexArray(basis.rowStatus, shape.numRows, "rowStatus");
        return rawStatus(withArena(function(arena) {
          return numericFunction("Highs_setBasis", 3)(pointer, arena.ints(basis.colStatus), arena.ints(basis.rowStatus));
        }));
      }
      postsolve(input) {
        const pointer = this._require(false);
        const shape = presolvedDimensions(pointer);
        if (!input || input.colValue == null) throw validationError("postsolve requires colValue");
        validateDoubleArray(input.colValue, shape.numCols, "colValue");
        if (input.colDual != null) validateDoubleArray(input.colDual, shape.numCols, "colDual");
        if (input.rowDual != null) validateDoubleArray(input.rowDual, shape.numRows, "rowDual");
        return rawStatus(withArena(function(arena) {
          return numericFunction("Highs_postsolve", 4)(pointer, arena.doubles(input.colValue), input.colDual ? arena.doubles(input.colDual) : 0, input.rowDual ? arena.doubles(input.rowDual) : 0);
        }));
      }
      getObjectiveOffset() {
        const pointer = this._require(false);
        return withArena(function(arena) {
          const output = arena.outDoubles(1);
          const status = numericFunction("Highs_getObjectiveOffset", 2)(pointer, output);
          return rawResult(status, heapF64()[output >> 3]);
        });
      }
      getModel(format) {
        return getLpData(this, "Highs_getModel", format, true);
      }
      getPresolvedLp(format) {
        return getLpData(this, "Highs_getPresolvedLp", format, false);
      }
      getFixedLp(format) {
        const result = getLpData(this, "Highs_getFixedLp", format, false);
        if (result.status !== STATUS_ERROR && result.value) result.value.integrality.fill(0);
        return result;
      }
      ensureRowwise() {
        return this._simple("Highs_ensureRowwise");
      }
      addVars(lower, upper) {
        const pointer = this._require(false);
        asArray(lower, "lower");
        validateDoubleArray(upper, lower.length, "upper");
        validateDoubleArray(lower, lower.length, "lower");
        return rawStatus(withArena(function(arena) {
          return numericFunction("Highs_addVars", 4)(pointer, lower.length, arena.doubles(lower), arena.doubles(upper));
        }));
      }
      addCol(cost, lower, upper, entries) {
        const pointer = this._require(false);
        validateFiniteOrInfinity(cost, "cost");
        validateFiniteOrInfinity(lower, "lower");
        validateFiniteOrInfinity(upper, "upper");
        validateSparseEntries(entries, dimensions(pointer).numRows);
        return rawStatus(withArena(function(arena) {
          return numericFunction("Highs_addCol", 7)(pointer, cost, lower, upper, entries.indices.length, arena.ints(entries.indices), arena.doubles(entries.values));
        }));
      }
      addCols(data) {
        const pointer = this._require(false);
        const existingRows = dimensions(pointer).numRows;
        if (!data || !data.matrix) throw validationError("column data and matrix are required");
        const count2 = data.cost.length;
        validateDoubleArray(data.cost, count2, "cost");
        validateDoubleArray(data.lower, count2, "lower");
        validateDoubleArray(data.upper, count2, "upper");
        if (data.matrix.format !== "csc") throw validationError("addCols requires a csc matrix");
        const nonzeros = validateSparseMatrix(data.matrix, existingRows, count2, "matrix");
        return rawStatus(withArena(function(arena) {
          return numericFunction("Highs_addCols", 9)(pointer, count2, arena.doubles(data.cost), arena.doubles(data.lower), arena.doubles(data.upper), nonzeros, arena.ints(Array.prototype.slice.call(data.matrix.starts, 0, -1)), arena.ints(data.matrix.indices), arena.doubles(data.matrix.values));
        }));
      }
      changeObjectiveSense(sense) {
        if (sense !== 1 && sense !== -1) throw validationError("sense must be 1 or -1");
        return rawStatus(numericFunction("Highs_changeObjectiveSense", 2)(this._require(false), sense));
      }
      changeColIntegrality(column, integrality) {
        requireInteger(column, "column", 0);
        requireInteger(integrality, "integrality", 0);
        if (integrality > 4) throw validationError("integrality must be between 0 and 4");
        return rawStatus(numericFunction("Highs_changeColIntegrality", 3)(this._require(false), column, integrality));
      }
      changeColCost(column, cost) {
        requireInteger(column, "column", 0);
        validateFiniteOrInfinity(cost, "cost");
        return rawStatus(numericFunction("Highs_changeColCost", 3)(this._require(false), column, cost));
      }
      changeRowBounds(row, lower, upper) {
        requireInteger(row, "row", 0);
        validateFiniteOrInfinity(lower, "lower");
        validateFiniteOrInfinity(upper, "upper");
        return rawStatus(numericFunction("Highs_changeRowBounds", 4)(this._require(false), row, lower, upper));
      }
      changeColsIntegrality(selection, values) {
        const dimension = dimensions(this._require(false)).numCols;
        return changeSelected(this, "changeColsIntegrality", selection, [], [values], dimension, "columns");
      }
      changeColsBounds(selection, lower, upper) {
        const dimension = dimensions(this._require(false)).numCols;
        return changeSelected(this, "changeColsBounds", selection, [lower, upper], [], dimension, "columns");
      }
      deleteCols(selection) {
        return deleteSelected(this, "Cols", selection, dimensions(this._require(false)).numCols);
      }
      scaleCol(column, factor) {
        requireInteger(column, "column", 0);
        validateFiniteOrInfinity(factor, "factor");
        return rawStatus(numericFunction("Highs_scaleCol", 3)(this._require(false), column, factor));
      }
      getCols(selection) {
        return getSelected(this, "Cols", selection);
      }
      getColName(column) {
        return getSafeName(this, "Highs_js_getColName", column);
      }
      getPresolvedColName(column) {
        return getSafeName(this, "Highs_js_getPresolvedColName", column);
      }
      getColByName(name) {
        return getIndexByName(this, "Col", name);
      }
      getColIntegrality(column) {
        const pointer = this._require(false);
        requireInteger(column, "column", 0);
        return withArena(function(arena) {
          const output = arena.outInts(1);
          const status = numericFunction("Highs_getColIntegrality", 3)(pointer, column, output);
          return rawResult(status, heap32()[output >> 2]);
        });
      }
      getPrimalRay() {
        return getRay(this, "Highs_getPrimalRay", dimensions(this._require(false)).numCols);
      }
      getDualUnboundednessDirection() {
        return getRay(this, "Highs_getDualUnboundednessDirection", dimensions(this._require(false)).numCols);
      }
      getBasisInverseRow(row, sparse) {
        return getBasisVector(this, "Highs_getBasisInverseRow", row, dimensions(this._require(false)).numRows, sparse);
      }
      getBasisSolve(rhs, sparse) {
        return basisSolve(this, "Highs_getBasisSolve", rhs, sparse);
      }
      getReducedRow(row, sparse) {
        const pointer = this._require(false);
        const shape = dimensions(pointer);
        requireInteger(row, "row", 0);
        return withArena(function(arena) {
          const values = arena.outDoubles(shape.numCols);
          const nonzeros = arena.outInts(1);
          const indices = arena.outInts(shape.numCols);
          const status = numericFunction("Highs_getReducedRow", 5)(pointer, row, values, nonzeros, indices);
          const value = { values: copyDoubles(values, shape.numCols) };
          if (sparse) value.nonzeroIndices = copyInts(indices, heap32()[nonzeros >> 2]);
          return rawResult(status, value);
        });
      }
      crossover(input) {
        const pointer = this._require(false);
        const shape = dimensions(pointer);
        if (!input || input.colValue == null) throw validationError("crossover requires colValue");
        validateDoubleArray(input.colValue, shape.numCols, "colValue");
        if (input.colDual == null !== (input.rowDual == null)) throw validationError("colDual and rowDual must be supplied together");
        if (input.colDual) validateDoubleArray(input.colDual, shape.numCols, "colDual");
        if (input.rowDual) validateDoubleArray(input.rowDual, shape.numRows, "rowDual");
        return rawStatus(withArena(function(arena) {
          return numericFunction("Highs_crossover", 6)(pointer, shape.numCols, shape.numRows, arena.doubles(input.colValue), input.colDual ? arena.doubles(input.colDual) : 0, input.rowDual ? arena.doubles(input.rowDual) : 0);
        }));
      }
      getRanging() {
        const pointer = this._require(false);
        const shape = dimensions(pointer);
        return withArena(function(arena) {
          const colCostUp = rangingRecord(arena, shape.numCols);
          const colCostDown = rangingRecord(arena, shape.numCols);
          const colBoundUp = rangingRecord(arena, shape.numCols);
          const colBoundDown = rangingRecord(arena, shape.numCols);
          const rowBoundUp = rangingRecord(arena, shape.numRows);
          const rowBoundDown = rangingRecord(arena, shape.numRows);
          const records = [colCostUp, colCostDown, colBoundUp, colBoundDown, rowBoundUp, rowBoundDown];
          const args = [pointer];
          records.forEach(function(record) {
            args.push(record.valuePointer, record.objectivePointer, record.inPointer, record.outPointer);
          });
          const status = numericFunction("Highs_getRanging", args.length).apply(null, args);
          return rawResult(status, { colCostUp: colCostUp.detach(), colCostDown: colCostDown.detach(), colBoundUp: colBoundUp.detach(), colBoundDown: colBoundDown.detach(), rowBoundUp: rowBoundUp.detach(), rowBoundDown: rowBoundDown.detach() });
        });
      }
      setCallback(callback) {
        const pointer = this._require(false);
        if (callback != null && typeof callback !== "function") throw validationError("callback must be a function or undefined");
        const previousId = this._callbackId;
        if (!callback) {
          const status2 = numericFunction("Highs_js_setCallback", 3)(pointer, 0, 0);
          if (status2 !== STATUS_ERROR) {
            if (previousId) callbacks.delete(previousId);
            this._callbackId = 0;
          }
          return rawStatus(status2);
        }
        const callbackId = nextCallbackId++;
        callbacks.set(callbackId, { raw: this, callback });
        const status = numericFunction("Highs_js_setCallback", 3)(pointer, ensureCallbackFunction(), callbackId);
        if (status === STATUS_ERROR) {
          callbacks.delete(callbackId);
        } else {
          if (previousId) callbacks.delete(previousId);
          this._callbackId = callbackId;
        }
        return rawStatus(status);
      }
      startCallback(type) {
        validateCallbackType(type);
        return rawStatus(numericFunction("Highs_startCallback", 2)(this._require(false), type));
      }
      dispose() {
        if (__classPrivateFieldGet(this, _RawModel_disposed, "f")) return;
        const pointer = this._require(false);
        if (this._callbackId) callbacks.delete(this._callbackId);
        liveModels.delete(pointer);
        numericFunction("Highs_destroy", 1, null)(pointer);
        __classPrivateFieldSet(this, _RawModel_pointer, 0, "f");
        __classPrivateFieldSet(this, _RawModel_disposed, true, "f");
      }
      _simple(name) {
        return rawStatus(numericFunction(name, 1)(this._require(false)));
      }
      clearModel() {
        return this._simple("Highs_clearModel");
      }
      releaseMemory() {
        return this._simple("Highs_releaseMemory");
      }
      zeroAllClocks() {
        return this._simple("Highs_zeroAllClocks");
      }
      run() {
        const pointer = this._require(false);
        this._callbackNumCols = dimensions(pointer).numCols;
        const status = numericFunction("Highs_run", 1)(pointer);
        return rawStatus(status);
      }
      exportModel(format) {
        const pointer = this._require(false);
        if (format !== "lp" && format !== "mps") throw validationError("format must be 'lp' or 'mps'");
        return withOutputFile(format, format === "lp" ? "utf8" : void 0, function(filename) {
          return stringFunction("Highs_writeModel", 1, 0)(pointer, filename);
        });
      }
      exportSolution(pretty) {
        const pointer = this._require(false);
        return withOutputFile("sol", "utf8", function(filename) {
          return stringFunction(pretty ? "Highs_writeSolutionPretty" : "Highs_writeSolution", 1, 0)(pointer, filename);
        });
      }
      passLp(model) {
        const pointer = this._require(false);
        const result = withArena(function(arena) {
          const shape = validateModel(model);
          const matrix = model.matrix;
          const packed = packLpArrays(model, arena, false);
          return numericFunction("Highs_passLp", 15)(pointer, shape.numCols, shape.numRows, shape.numNonzeros, FORMAT[matrix.format], shape.sense, model.offset == null ? 0 : model.offset, ...packed);
        });
        const nameStatus = result === STATUS_ERROR ? result : passNames(pointer, model);
        return rawStatus(result === STATUS_ERROR || nameStatus === STATUS_ERROR ? STATUS_ERROR : Math.max(result, nameStatus));
      }
      passLinearObjectives(objectives) {
        const pointer = this._require(false);
        const numCols = dimensions(pointer).numCols;
        asArray(objectives, "objectives");
        return rawStatus(withArena(function(arena) {
          const count2 = objectives.length;
          const weight = new Float64Array(count2);
          const offset = new Float64Array(count2);
          const coefficients = new Float64Array(count2 * numCols);
          const absoluteTolerance = new Float64Array(count2);
          const relativeTolerance = new Float64Array(count2);
          const priority = new Int32Array(count2);
          for (let index = 0; index < count2; index++) {
            const objective = objectives[index];
            validateLinearObjective(objective, numCols, "objectives[" + index + "]");
            weight[index] = objective.weight;
            offset[index] = objective.offset;
            coefficients.set(objective.coefficients, index * numCols);
            absoluteTolerance[index] = objective.absoluteTolerance;
            relativeTolerance[index] = objective.relativeTolerance;
            priority[index] = requireSignedInteger(objective.priority, "objectives[" + index + "].priority");
          }
          return numericFunction("Highs_passLinearObjectives", 8)(pointer, count2, arena.doubles(weight), arena.doubles(offset), arena.doubles(coefficients), arena.doubles(absoluteTolerance), arena.doubles(relativeTolerance), arena.ints(priority));
        }));
      }
      clearLinearObjectives() {
        return this._simple("Highs_clearLinearObjectives");
      }
      passColName(index, name) {
        const pointer = this._require(false);
        requireInteger(index, "column", 0);
        if (typeof name !== "string") throw validationError("name must be a string");
        return rawStatus(stringFunction("Highs_passColName", 2, 0)(pointer, index, name));
      }
      setOptionValue(name, value) {
        const pointer = this._require(false);
        if (!rawOptionIsAllowed(name)) return rawStatus(STATUS_ERROR);
        const type = typeof value;
        let status;
        if (type === "boolean") status = stringFunction("Highs_setBoolOptionValue", 1, 1)(pointer, name, value ? 1 : 0);
        else if (type === "string") status = nativeFunction("Highs_setStringOptionValue", "number", ["number", "string", "string"])(pointer, name, value);
        else if (type === "number") {
          if (!Number.isFinite(value)) throw validationError("numeric option values must be finite");
          if (Number.isSafeInteger(value) && value >= -2147483648 && value <= 2147483647) {
            status = stringFunction("Highs_setIntOptionValue", 1, 1)(pointer, name, value);
            if (status === STATUS_ERROR) status = stringFunction("Highs_setDoubleOptionValue", 1, 1)(pointer, name, value);
          } else {
            status = stringFunction("Highs_setDoubleOptionValue", 1, 1)(pointer, name, value);
          }
        } else {
          throw validationError("option values must be boolean, number, or string");
        }
        return rawStatus(status);
      }
      getOptionValue(name) {
        const pointer = this._require(false);
        if (!rawOptionIsAllowed(name)) return rawResult(STATUS_ERROR);
        const typeResult = this.getOptionType(name);
        if (typeResult.status === STATUS_ERROR) return rawResult(STATUS_ERROR);
        return withArena(function(arena) {
          if (typeResult.value === "string") {
            const output2 = arena.bytes(512);
            const status2 = stringFunction("Highs_getStringOptionValue", 1, 1)(pointer, name, output2);
            return rawResult(status2, utf8(output2));
          }
          if (typeResult.value === "double") {
            const output2 = arena.outDoubles(1);
            const status2 = stringFunction("Highs_getDoubleOptionValue", 1, 1)(pointer, name, output2);
            return rawResult(status2, heapF64()[output2 >> 3]);
          }
          const output = arena.outInts(1);
          const getter = typeResult.value === "boolean" ? "Highs_getBoolOptionValue" : "Highs_getIntOptionValue";
          const status = stringFunction(getter, 1, 1)(pointer, name, output);
          const value = heap32()[output >> 2];
          return rawResult(status, typeResult.value === "boolean" ? !!value : value);
        });
      }
      readOptions(text) {
        const pointer = this._require(false);
        if (typeof text !== "string") throw validationError("option data must be a string");
        for (const line of text.split(/\r?\n/)) {
          const match = /^\s*([A-Za-z][A-Za-z0-9_]*)\b/.exec(line);
          if (match && !line.trimStart().startsWith("#") && !rawOptionIsAllowed(match[1])) return rawStatus(STATUS_ERROR);
        }
        return rawStatus(withTextInput(text, "options", function(filename) {
          return stringFunction("Highs_readOptions", 1, 0)(pointer, filename);
        }));
      }
      getNumOptions() {
        return numericFunction("Highs_getNumOptions", 1)(this._require(false));
      }
      getOptionValues(name) {
        const pointer = this._require(false);
        if (!rawOptionIsAllowed(name)) return rawResult(STATUS_ERROR);
        const typeResult = this.getOptionType(name);
        if (typeResult.status === STATUS_ERROR) return rawResult(STATUS_ERROR);
        return withArena(function(arena) {
          const type = typeResult.value;
          if (type === "boolean") {
            const current2 = arena.outInts(1);
            const initial2 = arena.outInts(1);
            const status2 = stringFunction("Highs_getBoolOptionValues", 1, 2)(pointer, name, current2, initial2);
            return rawResult(status2, { name, type, current: !!heap32()[current2 >> 2], default: !!heap32()[initial2 >> 2] });
          }
          if (type === "integer") {
            const current2 = arena.outInts(1);
            const minimum = arena.outInts(1);
            const maximum = arena.outInts(1);
            const initial2 = arena.outInts(1);
            const status2 = stringFunction("Highs_getIntOptionValues", 1, 4)(pointer, name, current2, minimum, maximum, initial2);
            return rawResult(status2, { name, type, current: heap32()[current2 >> 2], default: heap32()[initial2 >> 2], minimum: heap32()[minimum >> 2], maximum: heap32()[maximum >> 2] });
          }
          if (type === "double") {
            const current2 = arena.outDoubles(1);
            const minimum = arena.outDoubles(1);
            const maximum = arena.outDoubles(1);
            const initial2 = arena.outDoubles(1);
            const status2 = stringFunction("Highs_getDoubleOptionValues", 1, 4)(pointer, name, current2, minimum, maximum, initial2);
            return rawResult(status2, { name, type, current: heapF64()[current2 >> 3], default: heapF64()[initial2 >> 3], minimum: heapF64()[minimum >> 3], maximum: heapF64()[maximum >> 3] });
          }
          const current = arena.bytes(512);
          const initial = arena.bytes(512);
          const status = stringFunction("Highs_getStringOptionValues", 1, 2)(pointer, name, current, initial);
          return rawResult(status, { name, type, current: utf8(current), default: utf8(initial) });
        });
      }
      getInfoValue(name) {
        const pointer = this._require(false);
        const typeResult = this.getInfoType(name);
        if (typeResult.status === STATUS_ERROR) return rawResult(STATUS_ERROR);
        return withArena(function(arena) {
          if (typeResult.value === "double") {
            const output2 = arena.outDoubles(1);
            const status2 = stringFunction("Highs_getDoubleInfoValue", 1, 1)(pointer, name, output2);
            return rawResult(status2, heapF64()[output2 >> 3]);
          }
          if (typeResult.value === "int64") {
            const output2 = arena.bytes(8);
            const status2 = stringFunction("Highs_getInt64InfoValue", 1, 1)(pointer, name, output2);
            return rawResult(status2, readInt64(output2));
          }
          const output = arena.outInts(1);
          const status = stringFunction("Highs_getIntInfoValue", 1, 1)(pointer, name, output);
          return rawResult(status, heap32()[output >> 2]);
        });
      }
      getPresolvedDimensions() {
        return presolvedDimensions(this._require(false));
      }
      getSizeofHighsInt() {
        return numericFunction("Highs_getSizeofHighsInt", 1)(this._require(false));
      }
      getObjectiveValue() {
        return numericFunction("Highs_getObjectiveValue", 1)(this._require(false));
      }
      getBasis() {
        const pointer = this._require(false);
        const modelStatus = this.getModelStatus();
        if (modelStatus === 0 || modelStatus === 6) throw new HighsError("The model has not been solved", "getBasis");
        const shape = dimensions(pointer);
        return withArena(function(arena) {
          const colStatus = arena.outInts(shape.numCols);
          const rowStatus = arena.outInts(shape.numRows);
          const status = numericFunction("Highs_getBasis", 3)(pointer, colStatus, rowStatus);
          return rawResult(status, { colStatus: copyInts(colStatus, shape.numCols), rowStatus: copyInts(rowStatus, shape.numRows) });
        });
      }
      setSparseSolution(solution) {
        const pointer = this._require(false);
        if (!solution) throw validationError("solution is required");
        const count2 = solution.indices.length;
        validateIndexArray(solution.indices, null, "indices", dimensions(pointer).numCols);
        validateDoubleArray(solution.values, count2, "values");
        return rawStatus(withArena(function(arena) {
          return numericFunction("Highs_setSparseSolution", 4)(pointer, count2, arena.ints(solution.indices), arena.doubles(solution.values));
        }));
      }
      setLogicalBasis() {
        return this._simple("Highs_setLogicalBasis");
      }
      getObjectiveSense() {
        const pointer = this._require(false);
        return withArena(function(arena) {
          const output = arena.outInts(1);
          const status = numericFunction("Highs_getObjectiveSense", 2)(pointer, output);
          return rawResult(status, heap32()[output >> 2]);
        });
      }
      getLp(format) {
        return getLpData(this, "Highs_getLp", format, false);
      }
      getIisLp(format) {
        return getLpData(this, "Highs_getIisLp", format, false);
      }
      ensureColwise() {
        return this._simple("Highs_ensureColwise");
      }
      addVar(lower, upper) {
        validateFiniteOrInfinity(lower, "lower");
        validateFiniteOrInfinity(upper, "upper");
        return rawStatus(numericFunction("Highs_addVar", 3)(this._require(false), lower, upper));
      }
      addRow(lower, upper, entries) {
        const pointer = this._require(false);
        validateFiniteOrInfinity(lower, "lower");
        validateFiniteOrInfinity(upper, "upper");
        validateSparseEntries(entries, dimensions(pointer).numCols);
        return rawStatus(withArena(function(arena) {
          return numericFunction("Highs_addRow", 6)(pointer, lower, upper, entries.indices.length, arena.ints(entries.indices), arena.doubles(entries.values));
        }));
      }
      addRows(data) {
        const pointer = this._require(false);
        const existingCols = dimensions(pointer).numCols;
        if (!data || !data.matrix) throw validationError("row data and matrix are required");
        const count2 = data.lower.length;
        validateDoubleArray(data.lower, count2, "lower");
        validateDoubleArray(data.upper, count2, "upper");
        if (data.matrix.format !== "csr") throw validationError("addRows requires a csr matrix");
        const nonzeros = validateSparseMatrix(data.matrix, count2, existingCols, "matrix");
        return rawStatus(withArena(function(arena) {
          return numericFunction("Highs_addRows", 8)(pointer, count2, arena.doubles(data.lower), arena.doubles(data.upper), nonzeros, arena.ints(Array.prototype.slice.call(data.matrix.starts, 0, -1)), arena.ints(data.matrix.indices), arena.doubles(data.matrix.values));
        }));
      }
      changeObjectiveOffset(offset) {
        validateFiniteOrInfinity(offset, "offset");
        return rawStatus(numericFunction("Highs_changeObjectiveOffset", 2)(this._require(false), offset));
      }
      clearIntegrality() {
        return this._simple("Highs_clearIntegrality");
      }
      changeColBounds(column, lower, upper) {
        requireInteger(column, "column", 0);
        validateFiniteOrInfinity(lower, "lower");
        validateFiniteOrInfinity(upper, "upper");
        return rawStatus(numericFunction("Highs_changeColBounds", 4)(this._require(false), column, lower, upper));
      }
      changeCoeff(row, column, value) {
        requireInteger(row, "row", 0);
        requireInteger(column, "column", 0);
        validateFiniteOrInfinity(value, "value");
        return rawStatus(numericFunction("Highs_changeCoeff", 4)(this._require(false), row, column, value));
      }
      changeColsCost(selection, values) {
        const dimension = dimensions(this._require(false)).numCols;
        return changeSelected(this, "changeColsCost", selection, [values], [], dimension, "columns");
      }
      changeRowsBounds(selection, lower, upper) {
        const dimension = dimensions(this._require(false)).numRows;
        return changeSelected(this, "changeRowsBounds", selection, [lower, upper], [], dimension, "rows");
      }
      deleteRows(selection) {
        return deleteSelected(this, "Rows", selection, dimensions(this._require(false)).numRows);
      }
      scaleRow(row, factor) {
        requireInteger(row, "row", 0);
        validateFiniteOrInfinity(factor, "factor");
        return rawStatus(numericFunction("Highs_scaleRow", 3)(this._require(false), row, factor));
      }
      getRows(selection) {
        return getSelected(this, "Rows", selection);
      }
      getRowName(row) {
        return getSafeName(this, "Highs_js_getRowName", row);
      }
      getPresolvedRowName(row) {
        return getSafeName(this, "Highs_js_getPresolvedRowName", row);
      }
      getRowByName(name) {
        return getIndexByName(this, "Row", name);
      }
      getDualRay() {
        return getRay(this, "Highs_getDualRay", dimensions(this._require(false)).numRows);
      }
      getBasicVariables() {
        const pointer = this._require(false);
        const rows = dimensions(pointer).numRows;
        return withArena(function(arena) {
          const output = arena.outInts(rows);
          const status = numericFunction("Highs_getBasicVariables", 2)(pointer, output);
          return rawResult(status, copyInts(output, rows));
        });
      }
      getBasisInverseCol(column, sparse) {
        return getBasisVector(this, "Highs_getBasisInverseCol", column, dimensions(this._require(false)).numRows, sparse);
      }
      getBasisTransposeSolve(rhs, sparse) {
        return basisSolve(this, "Highs_getBasisTransposeSolve", rhs, sparse);
      }
      getReducedColumn(column, sparse) {
        return getBasisVector(this, "Highs_getReducedColumn", column, dimensions(this._require(false)).numRows, sparse);
      }
      feasibilityRelaxation(input) {
        const pointer = this._require(false);
        const shape = dimensions(pointer);
        if (!input) throw validationError("relaxation input is required");
        validateFiniteOrInfinity(input.globalLowerPenalty, "globalLowerPenalty");
        validateFiniteOrInfinity(input.globalUpperPenalty, "globalUpperPenalty");
        validateFiniteOrInfinity(input.globalRowPenalty, "globalRowPenalty");
        return rawStatus(withArena(function(arena) {
          function penalties(values, length, label) {
            if (values == null) return 0;
            validateDoubleArray(values, length, label);
            return arena.doubles(values);
          }
          return numericFunction("Highs_feasibilityRelaxation", 7)(pointer, input.globalLowerPenalty, input.globalUpperPenalty, input.globalRowPenalty, penalties(input.localLowerPenalty, shape.numCols, "localLowerPenalty"), penalties(input.localUpperPenalty, shape.numCols, "localUpperPenalty"), penalties(input.localRowPenalty, shape.numRows, "localRowPenalty"));
        }));
      }
      getIis() {
        const pointer = this._require(false);
        const shape = dimensions(pointer);
        return withArena(function(arena) {
          const iisNumCols = arena.outInts(1);
          const iisNumRows = arena.outInts(1);
          const colIndex = arena.outInts(shape.numCols);
          const rowIndex = arena.outInts(shape.numRows);
          const colBound = arena.outInts(shape.numCols);
          const rowBound = arena.outInts(shape.numRows);
          const colStatus = arena.outInts(shape.numCols);
          const rowStatus = arena.outInts(shape.numRows);
          const status = numericFunction("Highs_getIis", 9)(pointer, iisNumCols, iisNumRows, colIndex, rowIndex, colBound, rowBound, colStatus, rowStatus);
          if (status === STATUS_ERROR) return rawResult(status);
          const numCols = heap32()[iisNumCols >> 2];
          const numRows = heap32()[iisNumRows >> 2];
          if (numCols < 0 || numCols > shape.numCols || numRows < 0 || numRows > shape.numRows) throw new RangeError("HiGHS returned invalid IIS dimensions");
          return rawResult(status, { colIndex: copyInts(colIndex, numCols), rowIndex: copyInts(rowIndex, numRows), colBound: copyInts(colBound, numCols), rowBound: copyInts(rowBound, numRows), colStatus: copyInts(colStatus, shape.numCols), rowStatus: copyInts(rowStatus, shape.numRows) });
        });
      }
      stopCallback(type) {
        validateCallbackType(type);
        return rawStatus(numericFunction("Highs_stopCallback", 2)(this._require(false), type));
      }
    }
    _RawModel_pointer = /* @__PURE__ */ new WeakMap(), _RawModel_disposed = /* @__PURE__ */ new WeakMap();
    function packLpArrays(model, arena, includeIntegrality) {
      const matrix = model.matrix;
      return arena.pack([{ type: "f64", values: model.colCost }, { type: "f64", values: model.colLower }, { type: "f64", values: model.colUpper }, { type: "f64", values: model.rowLower }, { type: "f64", values: model.rowUpper }, { type: "i32", values: Array.prototype.slice.call(matrix.starts, 0, -1) }, { type: "i32", values: matrix.indices }, { type: "f64", values: matrix.values }, ...includeIntegrality ? [{ type: "i32", values: model.integrality }] : []]);
    }
    function passModelArguments(model, arena) {
      const shape = validateModel(model);
      const matrix = model.matrix;
      const hessian = model.hessian;
      const packed = arena.pack([{ type: "f64", values: model.colCost }, { type: "f64", values: model.colLower }, { type: "f64", values: model.colUpper }, { type: "f64", values: model.rowLower }, { type: "f64", values: model.rowUpper }, { type: "i32", values: Array.prototype.slice.call(matrix.starts, 0, -1) }, { type: "i32", values: matrix.indices }, { type: "f64", values: matrix.values }, ...hessian ? [{ type: "i32", values: Array.prototype.slice.call(hessian.starts, 0, -1) }, { type: "i32", values: hessian.indices }, { type: "f64", values: hessian.values }] : [], ...model.integrality ? [{ type: "i32", values: model.integrality }] : []]);
      let packedIndex = 0;
      const colCost = packed[packedIndex++];
      const colLower = packed[packedIndex++];
      const colUpper = packed[packedIndex++];
      const rowLower = packed[packedIndex++];
      const rowUpper = packed[packedIndex++];
      const matrixStarts = packed[packedIndex++];
      const matrixIndices = packed[packedIndex++];
      const matrixValues = packed[packedIndex++];
      const hessianStarts = hessian ? packed[packedIndex++] : 0;
      const hessianIndices = hessian ? packed[packedIndex++] : 0;
      const hessianValues = hessian ? packed[packedIndex++] : 0;
      const integrality = model.integrality ? packed[packedIndex] : 0;
      return { shape, values: [shape.numCols, shape.numRows, shape.numNonzeros, shape.hessianNonzeros, FORMAT[matrix.format], hessian ? HESSIAN_FORMAT[hessian.format] : 1, shape.sense, model.offset == null ? 0 : model.offset, colCost, colLower, colUpper, rowLower, rowUpper, matrixStarts, matrixIndices, matrixValues, hessianStarts, hessianIndices, hessianValues, integrality] };
    }
    function passNames(pointer, model) {
      let status = STATUS_OK;
      if (model.modelName != null) {
        status = Math.max(status, stringFunction("Highs_passModelName", 1, 0)(pointer, String(model.modelName)));
      }
      if (model.colNames != null) {
        validateLength(model.colNames, model.numCols, "colNames");
        for (let index = 0; index < model.colNames.length; index++) {
          const next = stringFunction("Highs_passColName", 2, 0)(pointer, index, String(model.colNames[index]));
          if (next === STATUS_ERROR) return next;
          status = Math.max(status, next);
        }
      }
      if (model.rowNames != null) {
        validateLength(model.rowNames, model.numRows, "rowNames");
        for (let index = 0; index < model.rowNames.length; index++) {
          const next = stringFunction("Highs_passRowName", 2, 0)(pointer, index, String(model.rowNames[index]));
          if (next === STATUS_ERROR) return next;
          status = Math.max(status, next);
        }
      }
      return status;
    }
    function getLpData(raw, cName, format, includeHessian) {
      const pointer = raw._require(false);
      const hasIntegrality = cName !== "Highs_getFixedLp";
      const matrixFormat = format == null ? "csc" : format;
      if (!(matrixFormat in FORMAT)) throw validationError("format must be 'csc' or 'csr'");
      const knownShape = cName === "Highs_getModel" || cName === "Highs_getLp" ? dimensions(pointer) : cName === "Highs_getPresolvedLp" ? presolvedDimensions(pointer) : cName === "Highs_getFixedLp" ? dimensions(pointer) : void 0;
      return withArena(function(arena) {
        const numCol = arena.outInts(1);
        const numRow = arena.outInts(1);
        const numNz = arena.outInts(1);
        const qNumNz = includeHessian ? arena.outInts(1) : 0;
        const sense = arena.outInts(1);
        const offset = arena.outDoubles(1);
        const argumentCount = includeHessian ? 21 : hasIntegrality ? 16 : 15;
        let status = STATUS_OK;
        let cols = knownShape?.numCols ?? 0;
        let rows = knownShape?.numRows ?? 0;
        let nonzeros = knownShape?.numNonzeros ?? 0;
        let qNonzeros = includeHessian ? knownShape?.hessianNonzeros ?? 0 : 0;
        if (!knownShape) {
          const firstArguments = includeHessian ? [pointer, FORMAT[matrixFormat], 1, numCol, numRow, numNz, qNumNz, sense, offset] : [pointer, FORMAT[matrixFormat], numCol, numRow, numNz, sense, offset];
          const nullOutputs = includeHessian ? new Array(12).fill(0) : new Array(hasIntegrality ? 9 : 8).fill(0);
          status = numericFunction(cName, argumentCount).apply(null, firstArguments.concat(nullOutputs));
          if (status === STATUS_ERROR) return rawResult(status);
          cols = heap32()[numCol >> 2];
          rows = heap32()[numRow >> 2];
          nonzeros = heap32()[numNz >> 2];
          qNonzeros = includeHessian ? heap32()[qNumNz >> 2] : 0;
        }
        const major = matrixFormat === "csc" ? cols : rows;
        const colCost = arena.outDoubles(cols);
        const colLower = arena.outDoubles(cols);
        const colUpper = arena.outDoubles(cols);
        const rowLower = arena.outDoubles(rows);
        const rowUpper = arena.outDoubles(rows);
        const starts = arena.outInts(major);
        const indices = arena.outInts(nonzeros);
        const values = arena.outDoubles(nonzeros);
        const integrality = hasIntegrality ? arena.outInts(cols) : 0;
        const qStarts = includeHessian ? arena.outInts(cols) : 0;
        const qIndices = includeHessian ? arena.outInts(qNonzeros) : 0;
        const qValues = includeHessian ? arena.outDoubles(qNonzeros) : 0;
        const outputArguments = includeHessian ? [pointer, FORMAT[matrixFormat], 1, numCol, numRow, numNz, qNumNz, sense, offset, colCost, colLower, colUpper, rowLower, rowUpper, starts, indices, values, qStarts, qIndices, qValues, integrality] : [pointer, FORMAT[matrixFormat], numCol, numRow, numNz, sense, offset, colCost, colLower, colUpper, rowLower, rowUpper, starts, indices, values].concat(hasIntegrality ? [integrality] : []);
        status = numericFunction(cName, argumentCount).apply(null, outputArguments);
        if (status === STATUS_ERROR) return rawResult(status);
        const detachedStarts = new Int32Array(major + 1);
        detachedStarts.set(copyInts(starts, major));
        detachedStarts[major] = nonzeros;
        const data = { numCols: cols, numRows: rows, sense: heap32()[sense >> 2], offset: heapF64()[offset >> 3], colCost: copyDoubles(colCost, cols), colLower: copyDoubles(colLower, cols), colUpper: copyDoubles(colUpper, cols), rowLower: copyDoubles(rowLower, rows), rowUpper: copyDoubles(rowUpper, rows), matrix: { format: matrixFormat, numRows: rows, numCols: cols, starts: detachedStarts, indices: copyInts(indices, nonzeros), values: copyDoubles(values, nonzeros) }, integrality: hasIntegrality ? copyInts(integrality, cols) : new Int32Array(cols) };
        if (includeHessian && qNonzeros) {
          const detachedQStarts = new Int32Array(cols + 1);
          detachedQStarts.set(copyInts(qStarts, cols));
          detachedQStarts[cols] = qNonzeros;
          data.hessian = { format: "triangular", dimension: cols, starts: detachedQStarts, indices: copyInts(qIndices, qNonzeros), values: copyDoubles(qValues, qNonzeros) };
        }
        return rawResult(status, data);
      });
    }
    function validateSparseEntries(entries, upperBound) {
      if (!entries) throw validationError("entries are required");
      validateIndexArray(entries.indices, null, "entries.indices", upperBound);
      validateDoubleArray(entries.values, entries.indices.length, "entries.values");
    }
    function changeSelected(raw, cPrefix, selection, arrays, integerArrays, dimension, label) {
      const pointer = raw._require(false);
      return rawStatus(withArena(function(arena) {
        const selected = selectionArguments(selection, dimension, arena, label);
        const expected = selected.suffix === "ByMask" ? dimension : selected.count;
        const pointers = arrays.map(function(values, index) {
          validateDoubleArray(values, expected, label + " values " + index);
          return arena.doubles(values);
        });
        const intPointers = integerArrays.map(function(values, index) {
          validateIndexArray(values, expected, label + " integer values " + index);
          return arena.ints(values);
        });
        const args = [pointer].concat(selected.prefix, pointers, intPointers);
        return numericFunction("Highs_" + cPrefix + selected.suffix, args.length).apply(null, args);
      }));
    }
    function deleteSelected(raw, kind, selection, dimension) {
      const pointer = raw._require(false);
      return rawStatus(withArena(function(arena) {
        const selected = selectionArguments(selection, dimension, arena, kind.toLowerCase());
        const args = [pointer].concat(selected.prefix);
        return numericFunction("Highs_delete" + kind + selected.suffix, args.length).apply(null, args);
      }));
    }
    function getSelected(raw, kind, selection) {
      const pointer = raw._require(false);
      const shape = dimensions(pointer);
      const isColumn = kind === "Cols";
      const dimension = isColumn ? shape.numCols : shape.numRows;
      return withArena(function(arena) {
        const selected = selectionArguments(selection, dimension, arena, kind.toLowerCase());
        const outputCount = arena.outInts(1);
        const outputNonzeros = arena.outInts(1);
        const scalarCount = isColumn ? 3 : 2;
        const firstArgs = [pointer].concat(selected.prefix, [outputCount]).concat(new Array(scalarCount).fill(0), [outputNonzeros, 0, 0, 0]);
        const cName = "Highs_get" + kind + selected.suffix;
        let status = numericFunction(cName, firstArgs.length).apply(null, firstArgs);
        if (status === STATUS_ERROR) return rawResult(status);
        const count2 = heap32()[outputCount >> 2];
        const nonzeros = heap32()[outputNonzeros >> 2];
        const first = isColumn ? arena.outDoubles(count2) : 0;
        const lower = arena.outDoubles(count2);
        const upper = arena.outDoubles(count2);
        const starts = arena.outInts(count2);
        const indices = arena.outInts(nonzeros);
        const values = arena.outDoubles(nonzeros);
        const secondArgs = [pointer].concat(selected.prefix, [outputCount]).concat(isColumn ? [first, lower, upper] : [lower, upper]).concat([outputNonzeros, starts, indices, values]);
        status = numericFunction(cName, secondArgs.length).apply(null, secondArgs);
        if (status === STATUS_ERROR) return rawResult(status);
        const detachedStarts = new Int32Array(count2 + 1);
        detachedStarts.set(copyInts(starts, count2));
        detachedStarts[count2] = nonzeros;
        const matrix = { format: isColumn ? "csc" : "csr", numRows: isColumn ? shape.numRows : count2, numCols: isColumn ? count2 : shape.numCols, starts: detachedStarts, indices: copyInts(indices, nonzeros), values: copyDoubles(values, nonzeros) };
        return rawResult(status, isColumn ? { count: count2, cost: copyDoubles(first, count2), lower: copyDoubles(lower, count2), upper: copyDoubles(upper, count2), matrix } : { count: count2, lower: copyDoubles(lower, count2), upper: copyDoubles(upper, count2), matrix });
      });
    }
    function getSafeName(raw, bridgeName, index) {
      const pointer = raw._require(false);
      requireInteger(index, "index", 0);
      return withArena(function(arena) {
        const required = arena.outInts(1);
        let status = numericFunction(bridgeName, 5)(pointer, index, 0, 0, required);
        if (status === STATUS_ERROR) return rawResult(status);
        const capacity = heap32()[required >> 2];
        if (capacity <= 0) return rawResult(status, "");
        const output = arena.bytes(capacity);
        status = numericFunction(bridgeName, 5)(pointer, index, output, capacity, required);
        return rawResult(status, utf8(output));
      });
    }
    function getIndexByName(raw, kind, name) {
      const pointer = raw._require(false);
      if (typeof name !== "string") throw validationError("name must be a string");
      return withArena(function(arena) {
        const output = arena.outInts(1);
        const status = stringFunction("Highs_get" + kind + "ByName", 1, 1)(pointer, name, output);
        return rawResult(status, heap32()[output >> 2]);
      });
    }
    function getRay(raw, name, dimension) {
      const pointer = raw._require(false);
      return withArena(function(arena) {
        const hasRay = arena.outInts(1);
        const values = arena.outDoubles(dimension);
        const status = numericFunction(name, 3)(pointer, hasRay, values);
        return rawResult(status, heap32()[hasRay >> 2] ? { values: copyDoubles(values, dimension) } : void 0);
      });
    }
    function getBasisVector(raw, name, index, dimension, sparse) {
      const pointer = raw._require(false);
      return withArena(function(arena) {
        const values = arena.outDoubles(dimension);
        const nonzeros = arena.outInts(1);
        const indices = arena.outInts(dimension);
        if (index == null) throw validationError("an index is required");
        requireInteger(index, "index", 0);
        const args = [pointer, index, values, nonzeros, indices];
        const status = numericFunction(name, args.length).apply(null, args);
        const value = { values: copyDoubles(values, dimension) };
        if (sparse) value.nonzeroIndices = copyInts(indices, heap32()[nonzeros >> 2]);
        return rawResult(status, value);
      });
    }
    function basisSolve(raw, name, rhs, sparse) {
      const pointer = raw._require(false);
      const rows = dimensions(pointer).numRows;
      validateDoubleArray(rhs, rows, "rhs");
      return withArena(function(arena) {
        const solution = arena.outDoubles(rows);
        const nonzeros = arena.outInts(1);
        const indices = arena.outInts(rows);
        const status = numericFunction(name, 5)(pointer, arena.doubles(rhs), solution, nonzeros, indices);
        const value = { values: copyDoubles(solution, rows) };
        if (sparse) value.nonzeroIndices = copyInts(indices, heap32()[nonzeros >> 2]);
        return rawResult(status, value);
      });
    }
    function rangingRecord(arena, length) {
      return { valuePointer: arena.outDoubles(length), objectivePointer: arena.outDoubles(length), inPointer: arena.outInts(length), outPointer: arena.outInts(length), detach: function() {
        return { value: copyDoubles(this.valuePointer, length), objective: copyDoubles(this.objectivePointer, length), inVariable: copyInts(this.inPointer, length), outVariable: copyInts(this.outPointer, length) };
      } };
    }
    function callbackDataItem(dataOut, name) {
      return stringFunction("Highs_getCallbackDataOutItem", 1, 0)(dataOut, name);
    }
    function readCallbackNumber(dataOut, name, kind) {
      const pointer = callbackDataItem(dataOut, name);
      if (!pointer) return void 0;
      if (kind === "double") return heapF64()[pointer >> 3];
      if (kind === "int64") return readInt64(pointer);
      return heap32()[pointer >> 2];
    }
    const MIP_CALLBACK_FIELDS = [["running_time", "double"], ["objective_function_value", "double"], ["mip_node_count", "int64"], ["mip_total_lp_iterations", "int64"], ["mip_primal_bound", "double"], ["mip_dual_bound", "double"], ["mip_gap", "double"]];
    function callbackTrampoline(type, messagePointer, dataOut, dataIn, userData) {
      const entry = callbacks.get(userData);
      if (!entry) return;
      const raw = entry.raw;
      const callback = entry.callback;
      let eventActive = true;
      function requireActiveEvent() {
        if (!eventActive) throw validationError("callback controls expire when the callback returns");
      }
      raw._callbackDepth += 1;
      try {
        const shape = { numCols: raw._callbackNumCols };
        const data = {};
        const fields = type === 0 ? [["log_type", "int"]] : type === 1 ? [["simplex_iteration_count", "int"]] : type === 2 ? [["ipm_iteration_count", "int"]] : type >= 3 && type <= 9 ? MIP_CALLBACK_FIELDS : [];
        fields.forEach(function(item) {
          const value = readCallbackNumber(dataOut, item[0], item[1]);
          if (value !== void 0) data[item[0]] = value;
        });
        if (type === 3 || type === 4) {
          const solutionPointer = callbackDataItem(dataOut, "mip_solution");
          const solutionSize = numericFunction("Highs_js_getCallbackMipSolutionSize", 1)(dataOut);
          if (solutionSize < 0) throw new RangeError("HiGHS returned an invalid MIP solution size");
          if (solutionPointer) data.mip_solution = copyDoubles(solutionPointer, solutionSize);
          else if (solutionSize) throw new RangeError("HiGHS returned a null MIP solution");
        }
        if (type === 7) {
          const cutCount = readCallbackNumber(dataOut, "cutpool_num_cut", "int");
          const cutNonzeros = readCallbackNumber(dataOut, "cutpool_num_nz", "int");
          const cutColumns = readCallbackNumber(dataOut, "cutpool_num_col", "int");
          if (typeof cutCount === "number" && typeof cutNonzeros === "number" && typeof cutColumns === "number" && cutCount >= 0 && cutNonzeros >= 0) {
            const starts = callbackDataItem(dataOut, "cutpool_start");
            const indices = callbackDataItem(dataOut, "cutpool_index");
            const values = callbackDataItem(dataOut, "cutpool_value");
            const lower = callbackDataItem(dataOut, "cutpool_lower");
            const upper = callbackDataItem(dataOut, "cutpool_upper");
            if (starts && indices && values && lower && upper) {
              data.cut_pool = { numCols: cutColumns, numCuts: cutCount, starts: copyInts(starts, cutCount + 1), indices: copyInts(indices, cutNonzeros), values: copyDoubles(values, cutNonzeros), lower: copyDoubles(lower, cutCount), upper: copyDoubles(upper, cutCount) };
            }
          }
        }
        const event = { type, message: utf8(messagePointer), data };
        if (type === 9) {
          event.setSolution = function(solution) {
            requireActiveEvent();
            try {
              if (solution && solution.indices) {
                validateIndexArray(solution.indices, null, "indices", shape.numCols);
                validateDoubleArray(solution.values, solution.indices.length, "values");
                return rawStatus(withArena(function(arena) {
                  return numericFunction("Highs_setCallbackSparseSolution", 4)(dataIn, solution.indices.length, arena.ints(solution.indices), arena.doubles(solution.values));
                }));
              }
              validateDoubleArray(solution, shape.numCols, "solution");
              return rawStatus(withArena(function(arena) {
                return numericFunction("Highs_setCallbackSolution", 3)(dataIn, shape.numCols, arena.doubles(solution));
              }));
            } catch (error) {
              raw._rememberCallbackError(error);
              return rawStatus(STATUS_ERROR);
            }
          };
          event.repairSolution = function() {
            requireActiveEvent();
            return rawStatus(numericFunction("Highs_repairCallbackSolution", 1)(dataIn));
          };
        } else if (type === 1 || type === 2 || type === 6) {
          event.interrupt = function() {
            requireActiveEvent();
            heap32()[dataIn >> 2] = 1;
          };
        }
        const callbackResult = callback(event);
        if (callbackResult && (typeof callbackResult === "object" || typeof callbackResult === "function") && typeof callbackResult.then === "function") {
          void Promise.resolve(callbackResult).catch(function() {
          });
          throw validationError("callbacks must be synchronous and return undefined");
        }
      } catch (error) {
        raw._rememberCallbackError(error);
        if ((type === 1 || type === 2 || type === 6) && dataIn) heap32()[dataIn >> 2] = 1;
      } finally {
        eventActive = false;
        raw._callbackDepth -= 1;
      }
    }
    function ensureCallbackFunction() {
      if (!callbackFunctionPointer) callbackFunctionPointer = addFunction(callbackTrampoline, "viiiii");
      return callbackFunctionPointer;
    }
    function validateCallbackType(type) {
      requireInteger(type, "callback type", 0);
      if (type === 8 || type > 9) throw validationError("callback type must be one of 0..7 or 9");
    }
    function valueOrThrow(result, operation, owner = void 0) {
      if (result.status === STATUS_ERROR) throw nativeError(operation);
      if (owner) owner._setLast(result.status, operation);
      return result.value;
    }
    class PersistentModel {
      constructor(raw) {
        this.raw = raw;
        this.lastCall = { status: STATUS_OK, warnings: [] };
        this.options = new OptionStoreImpl(this);
        this.info = new InfoStoreImpl(this);
      }
      get disposed() {
        return this.raw.disposed;
      }
      _setLast(status, operation) {
        this.lastCall = callMetadata(status, operation);
        return this.lastCall;
      }
      _value(operation, args = []) {
        return valueOrThrow(this.raw[operation].apply(this.raw, args || []), operation, this);
      }
      exportModel(format) {
        return this._value("exportModel", [format]);
      }
      exportSolution(pretty) {
        return this._value("exportSolution", [pretty]);
      }
      getPresolvedDimensions() {
        return this.raw.getPresolvedDimensions();
      }
      getModelStatus() {
        return this.raw.getModelStatus();
      }
      setSolution(solution) {
        if (solution == null) throw validationError("solution is required");
        return this._status(solution.indices ? "setSparseSolution" : "setSolution", [solution]);
      }
      setLogicalBasis() {
        return this._status("setLogicalBasis");
      }
      dispose() {
        this.raw.dispose();
      }
      _status(operation, args = []) {
        const result = this.raw[operation].apply(this.raw, args || []);
        return this._setLast(result.status, operation);
      }
      exportPresolvedModel(format) {
        return this._value("exportPresolvedModel", [format]);
      }
      getDimensions() {
        return this.raw.getDimensions();
      }
      getRunTime() {
        return this.raw.getRunTime();
      }
      getObjectiveValue() {
        return this.raw.getObjectiveValue();
      }
      getObjectiveSense() {
        return this._value("getObjectiveSense");
      }
      getObjectiveOffset() {
        return this._value("getObjectiveOffset");
      }
      setBasis(basis) {
        return basis == null ? this._status("setLogicalBasis") : this._status("setBasis", [basis]);
      }
      run(callbackMap) {
        const raw = this.raw;
        const activeTypes = [];
        let didRegister = false;
        try {
          if (callbackMap && Object.keys(callbackMap).length) {
            if (raw._callbackId) throw validationError("run callbacks cannot replace a callback registered through model.raw");
            const registration = raw.setCallback(function(event) {
              const callback = callbackMap[event.type];
              if (callback) return callback(event);
              return void 0;
            });
            if (registration.status === STATUS_ERROR) throw nativeError("setCallback");
            didRegister = true;
            Object.keys(callbackMap).forEach(function(key3) {
              const type = Number(key3);
              validateCallbackType(type);
              const result2 = raw.startCallback(type);
              if (result2.status === STATUS_ERROR) throw nativeError("startCallback");
              activeTypes.push(type);
            });
          }
          const result = raw.run();
          const metadata = this._setLast(result.status, "run");
          return { status: metadata.status, warnings: metadata.warnings, modelStatus: raw.getModelStatus() };
        } finally {
          try {
            for (let index = 0; index < activeTypes.length; index++) raw.stopCallback(activeTypes[index]);
          } finally {
            if (didRegister) raw.setCallback(void 0);
          }
        }
      }
      clear(...args) {
        return this._status("clear", args);
      }
      clearModel(...args) {
        return this._status("clearModel", args);
      }
      clearSolver(...args) {
        return this._status("clearSolver", args);
      }
      releaseMemory(...args) {
        return this._status("releaseMemory", args);
      }
      readModel(...args) {
        return this._status("readModel", args);
      }
      passModel(...args) {
        return this._status("passModel", args);
      }
      passHessian(...args) {
        return this._status("passHessian", args);
      }
      passLinearObjectives(...args) {
        return this._status("passLinearObjectives", args);
      }
      addLinearObjective(...args) {
        return this._status("addLinearObjective", args);
      }
      clearLinearObjectives(...args) {
        return this._status("clearLinearObjectives", args);
      }
      presolve(...args) {
        return this._status("presolve", args);
      }
      postsolve(...args) {
        return this._status("postsolve", args);
      }
      zeroAllClocks(...args) {
        return this._status("zeroAllClocks", args);
      }
      addVar(...args) {
        return this._status("addVar", args);
      }
      addVars(...args) {
        return this._status("addVars", args);
      }
      addCol(...args) {
        return this._status("addCol", args);
      }
      addCols(...args) {
        return this._status("addCols", args);
      }
      addRow(...args) {
        return this._status("addRow", args);
      }
      addRows(...args) {
        return this._status("addRows", args);
      }
      ensureColwise(...args) {
        return this._status("ensureColwise", args);
      }
      ensureRowwise(...args) {
        return this._status("ensureRowwise", args);
      }
      changeObjectiveSense(...args) {
        return this._status("changeObjectiveSense", args);
      }
      changeObjectiveOffset(...args) {
        return this._status("changeObjectiveOffset", args);
      }
      changeColIntegrality(...args) {
        return this._status("changeColIntegrality", args);
      }
      changeColsIntegrality(...args) {
        return this._status("changeColsIntegrality", args);
      }
      clearIntegrality(...args) {
        return this._status("clearIntegrality", args);
      }
      changeColCost(...args) {
        return this._status("changeColCost", args);
      }
      changeColsCost(...args) {
        return this._status("changeColsCost", args);
      }
      changeColBounds(...args) {
        return this._status("changeColBounds", args);
      }
      changeColsBounds(...args) {
        return this._status("changeColsBounds", args);
      }
      changeRowBounds(...args) {
        return this._status("changeRowBounds", args);
      }
      changeRowsBounds(...args) {
        return this._status("changeRowsBounds", args);
      }
      deleteCols(...args) {
        return this._status("deleteCols", args);
      }
      deleteRows(...args) {
        return this._status("deleteRows", args);
      }
      scaleCol(...args) {
        return this._status("scaleCol", args);
      }
      scaleRow(...args) {
        return this._status("scaleRow", args);
      }
      passColName(...args) {
        return this._status("passColName", args);
      }
      passRowName(...args) {
        return this._status("passRowName", args);
      }
      passModelName(...args) {
        return this._status("passModelName", args);
      }
      crossover(...args) {
        return this._status("crossover", args);
      }
      feasibilityRelaxation(...args) {
        return this._status("feasibilityRelaxation", args);
      }
      changeCoefficient(...args) {
        return this._status("changeCoeff", args);
      }
      getSolution(...args) {
        return this._value("getSolution", args);
      }
      getBasis(...args) {
        return this._value("getBasis", args);
      }
      getPrimalRay(...args) {
        return this._value("getPrimalRay", args);
      }
      getDualRay(...args) {
        return this._value("getDualRay", args);
      }
      getDualUnboundednessDirection(...args) {
        return this._value("getDualUnboundednessDirection", args);
      }
      getModel(...args) {
        return this._value("getModel", args);
      }
      getLp(...args) {
        return this._value("getLp", args);
      }
      getPresolvedLp(...args) {
        return this._value("getPresolvedLp", args);
      }
      getIisLp(...args) {
        return this._value("getIisLp", args);
      }
      getFixedLp(...args) {
        return this._value("getFixedLp", args);
      }
      getCols(...args) {
        return this._value("getCols", args);
      }
      getRows(...args) {
        return this._value("getRows", args);
      }
      getColName(...args) {
        return this._value("getColName", args);
      }
      getRowName(...args) {
        return this._value("getRowName", args);
      }
      getPresolvedColName(...args) {
        return this._value("getPresolvedColName", args);
      }
      getPresolvedRowName(...args) {
        return this._value("getPresolvedRowName", args);
      }
      getColByName(...args) {
        return this._value("getColByName", args);
      }
      getRowByName(...args) {
        return this._value("getRowByName", args);
      }
      getColIntegrality(...args) {
        return this._value("getColIntegrality", args);
      }
      getBasicVariables(...args) {
        return this._value("getBasicVariables", args);
      }
      getBasisInverseRow(...args) {
        return this._value("getBasisInverseRow", args);
      }
      getBasisInverseCol(...args) {
        return this._value("getBasisInverseCol", args);
      }
      getBasisSolve(...args) {
        return this._value("getBasisSolve", args);
      }
      getBasisTransposeSolve(...args) {
        return this._value("getBasisTransposeSolve", args);
      }
      getReducedRow(...args) {
        return this._value("getReducedRow", args);
      }
      getReducedColumn(...args) {
        return this._value("getReducedColumn", args);
      }
      getRanging(...args) {
        return this._value("getRanging", args);
      }
      getIis(...args) {
        return this._value("getIis", args);
      }
    }
    class OptionStoreImpl {
      constructor(model) {
        this._model = model;
      }
      set(name, value) {
        if (typeof name === "object" && name) {
          Object.keys(name).forEach(validateOption);
          let aggregate = STATUS_OK;
          Object.keys(name).forEach(function(key3) {
            const result = this._model.raw.setOptionValue(key3, name[key3]);
            if (result.status === STATUS_ERROR) throw nativeError("setOptionValue");
            aggregate = Math.max(aggregate, result.status);
          }.bind(this));
          return this._model._setLast(aggregate, "setOptionValue");
        }
        validateOption(name);
        return this._model._status("setOptionValue", [name, value]);
      }
      describe(name) {
        validateOption(name);
        return this._model._value("getOptionValues", [name]);
      }
      reset() {
        return this._model._status("resetOptions");
      }
      export(deviationsOnly) {
        return this._model._value("exportOptions", [deviationsOnly]);
      }
      get(name) {
        validateOption(name);
        return this._model._value("getOptionValue", [name]);
      }
      names() {
        const count2 = this._model.raw.getNumOptions();
        const names = [];
        for (let index = 0; index < count2; index++) {
          const result = this._model.raw.getOptionName(index);
          if (result.status === STATUS_ERROR) throw nativeError("getOptionName");
          if (!isForbiddenOption(result.value)) names.push(result.value);
        }
        return names;
      }
      read(text) {
        validateOptionText(text);
        return this._model._status("readOptions", [text]);
      }
    }
    class InfoStoreImpl {
      constructor(model) {
        this._model = model;
      }
      get(name) {
        return this._model._value("getInfoValue", [name]);
      }
      type(name) {
        return this._model._value("getInfoType", [name]);
      }
    }
    function createRawModel() {
      const pointer = numericFunction("Highs_create", 0)();
      if (!pointer) throw new Error("Highs_create failed");
      const raw = addSymbolDispose(new RawModel(pointer));
      stringFunction("Highs_setIntOptionValue", 1, 1)(pointer, "threads", 1);
      nativeFunction("Highs_setStringOptionValue", "number", ["number", "string", "string"])(pointer, "parallel", "off");
      return raw;
    }
    function createPersistentModel(source) {
      const model = addSymbolDispose(new PersistentModel(createRawModel()));
      try {
        if (source) {
          if (source.format === "lp" || source.format === "mps") model.readModel(source);
          else model.passModel(source);
        }
        return model;
      } catch (error) {
        model.dispose();
        throw error;
      }
    }
    function addSymbolDispose(model) {
      const disposeSymbol = Symbol.dispose;
      if (disposeSymbol !== void 0) {
        Object.defineProperty(model, disposeSymbol, { configurable: true, writable: true, value: model.dispose });
      }
      return model;
    }
    function isPromiseLike(value) {
      return value !== null && (typeof value === "object" || typeof value === "function") && typeof value.then === "function";
    }
    function withPersistentModel(sourceOrOperation, maybeOperation = void 0) {
      const hasSource = typeof sourceOrOperation !== "function";
      const source = hasSource ? sourceOrOperation : void 0;
      const operation = hasSource ? maybeOperation : sourceOrOperation;
      if (typeof operation !== "function") throw validationError("withModel requires a callback");
      const model = createPersistentModel(source);
      try {
        const result = operation(model);
        if (isPromiseLike(result)) {
          return Promise.resolve(result).finally(function() {
            model.dispose();
          });
        }
        model.dispose();
        return result;
      } catch (error) {
        model.dispose();
        throw error;
      }
    }
    function oneShot(name, model) {
      const shape = validateModel(model);
      return withArena(function(arena) {
        const matrix = model.matrix;
        const isMip = name === "Highs_mipCall";
        const colValue = arena.outDoubles(shape.numCols);
        const colDual = isMip ? 0 : arena.outDoubles(shape.numCols);
        const rowValue = arena.outDoubles(shape.numRows);
        const rowDual = isMip ? 0 : arena.outDoubles(shape.numRows);
        const colBasis = isMip ? 0 : arena.outInts(shape.numCols);
        const rowBasis = isMip ? 0 : arena.outInts(shape.numRows);
        const modelStatus = arena.outInts(1);
        const lpPacked = packLpArrays(model, arena, isMip);
        const base = [shape.numCols, shape.numRows, shape.numNonzeros, FORMAT[matrix.format], shape.sense, model.offset == null ? 0 : model.offset, ...lpPacked.slice(0, 8)];
        let args;
        if (name === "Highs_mipCall") {
          if (!model.integrality) throw validationError("mipCall requires integrality");
          args = base.concat([lpPacked[8], colValue, rowValue, modelStatus]);
        } else if (name === "Highs_qpCall") {
          if (!model.hessian) throw validationError("qpCall requires hessian");
          const hessian = model.hessian;
          args = base.slice(0, 3).concat([shape.hessianNonzeros, FORMAT[matrix.format], HESSIAN_FORMAT[hessian.format], shape.sense, model.offset == null ? 0 : model.offset, ...lpPacked.slice(0, 8), arena.ints(Array.prototype.slice.call(hessian.starts, 0, -1)), arena.ints(hessian.indices), arena.doubles(hessian.values), colValue, colDual, rowValue, rowDual, colBasis, rowBasis, modelStatus]);
        } else {
          args = base.concat([colValue, colDual, rowValue, rowDual, colBasis, rowBasis, modelStatus]);
        }
        const status = numericFunction(name, args.length).apply(null, args);
        if (isMip) {
          return rawResult(status, { modelStatus: heap32()[modelStatus >> 2], solution: { colValue: copyDoubles(colValue, shape.numCols), rowValue: copyDoubles(rowValue, shape.numRows) } });
        }
        return rawResult(status, { modelStatus: heap32()[modelStatus >> 2], solution: { colValue: copyDoubles(colValue, shape.numCols), rowValue: copyDoubles(rowValue, shape.numRows), colDual: copyDoubles(colDual, shape.numCols), rowDual: copyDoubles(rowDual, shape.numRows) }, basis: { colStatus: copyInts(colBasis, shape.numCols), rowStatus: copyInts(rowBasis, shape.numRows) } });
      });
    }
    const version = Object.freeze({ major: numericFunction("Highs_versionMajor", 0)(), minor: numericFunction("Highs_versionMinor", 0)(), patch: numericFunction("Highs_versionPatch", 0)(), string: nativeFunction("Highs_version", "string", [])(), gitHash: nativeFunction("Highs_githash", "string", [])() });
    const constants = Object.freeze({ status: Object.freeze({ error: -1, ok: 0, warning: 1 }), variableType: Object.freeze({ continuous: 0, integer: 1, semiContinuous: 2, semiInteger: 3, implicitInteger: 4 }), objectiveSense: Object.freeze({ minimize: 1, maximize: -1 }), matrixFormat: Object.freeze({ columnWise: 1, rowWise: 2 }), hessianFormat: Object.freeze({ triangular: 1, square: 2 }), optionType: Object.freeze({ boolean: 0, integer: 1, double: 2, string: 3 }), infoType: Object.freeze({ int64: -1, integer: 1, double: 2 }), solutionStatus: Object.freeze({ none: 0, infeasible: 1, feasible: 2 }), basisValidity: Object.freeze({ invalid: 0, valid: 1 }), basisStatus: Object.freeze({ lower: 0, basic: 1, upper: 2, zero: 3, nonbasic: 4 }), callbackType: Object.freeze({ logging: 0, simplexInterrupt: 1, ipmInterrupt: 2, mipSolution: 3, mipImprovingSolution: 4, mipLogging: 5, mipInterrupt: 6, mipCutPool: 7, mipUserSolution: 9 }), presolveStatus: Object.freeze({ notPresolved: -1, notReduced: 0, infeasible: 1, unboundedOrInfeasible: 2, reduced: 3, reducedToEmpty: 4, timeout: 5, nullError: 6, optionsError: 7, outOfMemory: 8, exception: 9 }), modelStatus: Object.freeze({ notSet: 0, loadError: 1, modelError: 2, presolveError: 3, solveError: 4, postsolveError: 5, empty: 6, optimal: 7, infeasible: 8, unboundedOrInfeasible: 9, unbounded: 10, objectiveBound: 11, objectiveTarget: 12, timeLimit: 13, iterationLimit: 14, unknown: 15, solutionLimit: 16, interrupted: 17, memoryLimit: 18, highsInterrupt: 19 }), iis: Object.freeze({ strategyLight: 0, strategyRowPriority: 6, strategyColPriority: 14, boundFree: 1, boundLower: 2, boundUpper: 3, boundBoxed: 4, notInConflict: -1, maybeInConflict: 0, inConflict: 1 }) });
    const probe = createRawModel();
    const infinity = probe.getInfinity();
    const intBytes = probe.getSizeofHighsInt();
    probe.dispose();
    if (intBytes !== 4) throw new Error("This highs-js runtime requires a 32-bit HighsInt build; received " + intBytes * 8 + " bits");
    Module3["version"] = version;
    Module3["infinity"] = infinity;
    Module3["intBytes"] = intBytes;
    Module3["intBits"] = intBytes * 8;
    Object.defineProperty(Module3, "memoryBytes", { enumerable: true, get: function() {
      return heapU8().buffer.byteLength;
    } });
    Module3["constants"] = constants;
    Module3["errors"] = Object.freeze({ HighsError, HighsDisposedError, HighsValidationError, HighsReentrancyError, HighsUnsupportedOptionError });
    Module3["createModel"] = createPersistentModel;
    Module3["withModel"] = withPersistentModel;
    Module3["raw"] = Object.freeze({ version: function() {
      return version;
    }, lpCall: function(model) {
      return oneShot("Highs_lpCall", model);
    }, mipCall: function(model) {
      return oneShot("Highs_mipCall", model);
    }, qpCall: function(model) {
      return oneShot("Highs_qpCall", model);
    }, createModel: createRawModel });
  })(Module2);
  ;
  return Module2;
}
var highs_default = Module;

// oml-model.ts
var key = (a, b) => JSON.stringify([a, b]);
var slotKey = (s) => JSON.stringify([s.date, String(s.slot)]);
var intersect = (a, b) => [...a].filter((x) => b.has(x)).sort();
var quarter = (n) => {
  if (!Number.isFinite(n) || !Number.isSafeInteger(Math.round(n * 4)) || Math.abs(n * 4 - Math.round(n * 4)) > 1e-8) throw Error("Credits must be multiples of 0.25");
  return Math.round(4 * n);
};
var unique = (a) => [...new Set(a)].sort();
function pairs(a) {
  return a.flatMap((v, i) => a.slice(i + 1).map((w) => [v, w]));
}
var OmlModel = class {
  constructor(input, settings) {
    this.input = input;
    this.settings = { maxCredits: 9, outsideLimit: 1, penalty: 1e3, timeLimit: 1200, heuristicRounds: 2e3, heuristicPatience: 500, heuristicGroup: 10, heuristicSeed: 2026, showSolverLog: false, ...settings };
    const z = this.settings;
    const record = (v) => v !== null && typeof v === "object" && !Array.isArray(v);
    if (!record(input) || !Array.isArray(input.units) || !input.units.length || !Array.isArray(input.sessions) || !record(input.groups) || !record(input.students)) throw Error("Dataset needs units, sessions, same-content groups and student preferences");
    if (typeof z.showSolverLog !== "boolean") throw Error("Solver logging must be true or false");
    if (!["with", "without"].includes(z.version)) throw Error("External-course access must be with or without");
    for (const [name, n] of Object.entries({ heuristicRounds: z.heuristicRounds, heuristicPatience: z.heuristicPatience, heuristicGroup: z.heuristicGroup, heuristicSeed: z.heuristicSeed })) if (!Number.isSafeInteger(n) || n < (name === "heuristicGroup" ? 1 : 0)) throw Error(`${name} must be a non-negative safe integer (group size at least 1)`);
    if (!Number.isFinite(z.theta) || z.theta < 0 || z.theta > 1) throw Error("Flexibility must be between 0 and 1");
    if (z.floor < 0 || z.floor > z.maxCredits || !Number.isInteger(z.outsideLimit) || z.outsideLimit < 0 || z.outsideLimit > 1) throw Error("Invalid credit floor, ceiling or outside-unit limit");
    quarter(z.floor);
    quarter(z.maxCredits);
    if (!Number.isFinite(z.penalty) || z.penalty <= 4 * input.units.length) throw Error("Penalty must exceed four times the number of units to preserve priority");
    if (z.timeLimit !== null && (!Number.isFinite(z.timeLimit) || z.timeLimit <= 0)) throw Error("Time limit must be positive, or null for unlimited");
    for (const u of input.units) {
      if (!u || typeof u.unit_id !== "string" || !u.unit_id.trim() || this.units.has(u.unit_id)) throw Error("Duplicate or empty unit");
      if (![true, false, 0, 1].includes(u.movable) || ![true, false, 0, 1].includes(u.is_pgpx_or_fabm)) throw Error("Movability and external-course flags must be 0 or 1");
      quarter(u.credits);
      if (u.credits <= 0 || !Number.isSafeInteger(u.seat_cap) || u.seat_cap < 0) throw Error("Invalid unit credits or seats");
      this.units.set(u.unit_id, u);
      this.slots.set(u.unit_id, /* @__PURE__ */ new Set());
      this.classes.set(u.unit_id, /* @__PURE__ */ new Set());
      if (u.is_pgpx_or_fabm) this.outside.add(u.unit_id);
    }
    for (const s of input.sessions) {
      if (!s || typeof s.date !== "string" || !/^\d{4}-\d{2}-\d{2}$/.test(s.date) || !Number.isFinite(Date.parse(s.date)) || new Date(s.date).toISOString().slice(0, 10) !== s.date || !["string", "number"].includes(typeof s.slot) || !String(s.slot).trim() || typeof s.slot === "number" && !Number.isFinite(s.slot) || !this.units.has(s.unit_id) || !["class", "block"].includes(s.session_type)) throw Error("Unknown session unit or type");
      const t = slotKey(s), slots = this.slots.get(s.unit_id);
      if (slots.has(t)) throw Error("Duplicate session");
      slots.add(t);
      if (s.session_type === "class") this.classes.get(s.unit_id).add(t);
    }
    for (const [g, us] of Object.entries(input.groups)) {
      if (!g.trim() || !Array.isArray(us) || !us.length) throw Error("Invalid same-content group");
      for (const u of us) {
        if (!this.units.has(u) || this.groupOf.has(u)) throw Error("Invalid same-content group");
        this.groupOf.set(u, g);
      }
    }
    for (const [i, us] of Object.entries(input.students).sort(([a], [b]) => a.localeCompare(b))) {
      if (!i.trim() || !Array.isArray(us)) throw Error("Invalid student demand record");
      if (us.some((u) => !this.units.has(u) || this.outside.has(u)) || unique(us).length !== us.length) throw Error("Invalid PGP demand list");
      this.bids.set(i, new Set(unique([...us, ...z.version === "with" ? this.outside : []])));
    }
    if (!this.bids.size) throw Error("At least one student is required");
    for (const [u, s] of this.slots) {
      if (!s.size) throw Error("Every unit needs at least one session");
      this.allowance.set(u, this.units.get(u).movable ? Math.floor(z.theta * s.size + 0.5) : 0);
    }
    this.makeClashes();
    this.build();
  }
  input;
  upper = [];
  rows = [];
  x = /* @__PURE__ */ new Map();
  r = /* @__PURE__ */ new Map();
  m = /* @__PURE__ */ new Map();
  f = /* @__PURE__ */ new Map();
  y = /* @__PURE__ */ new Map();
  units = /* @__PURE__ */ new Map();
  slots = /* @__PURE__ */ new Map();
  classes = /* @__PURE__ */ new Map();
  outside = /* @__PURE__ */ new Set();
  groupOf = /* @__PURE__ */ new Map();
  bids = /* @__PURE__ */ new Map();
  allowance = /* @__PURE__ */ new Map();
  clashes = [];
  settings;
  canMove(u, t) {
    return this.allowance.get(u) > 0 && this.classes.get(u).has(t);
  }
  addVar(upper = 1) {
    this.upper.push(upper);
    return this.upper.length - 1;
  }
  row(terms, lo = -Infinity, hi = Infinity) {
    this.rows.push({ terms, lo, hi });
  }
  makeClashes() {
    const bidders = /* @__PURE__ */ new Map();
    for (const [i, us] of this.bids) for (const u of us) {
      if (!bidders.has(u)) bidders.set(u, /* @__PURE__ */ new Set());
      bidders.get(u).add(i);
    }
    for (const [a, b] of pairs([...bidders.keys()].sort())) {
      if (this.outside.has(a) && this.outside.has(b) && this.settings.outsideLimit <= 1) continue;
      if (this.groupOf.has(a) && this.groupOf.get(a) === this.groupOf.get(b)) continue;
      const slots = intersect(this.slots.get(a), this.slots.get(b)), students = intersect(bidders.get(a), bidders.get(b));
      if (!slots.length || !students.length) continue;
      let onlyA = 0, onlyB = 0, either = 0, possible = true;
      for (const t of slots) {
        const ma = this.canMove(a, t), mb = this.canMove(b, t);
        if (ma && mb) either++;
        else if (ma) onlyA++;
        else if (mb) onlyB++;
        else possible = false;
      }
      const separable = possible && onlyA <= this.allowance.get(a) && onlyB <= this.allowance.get(b) && onlyA + onlyB + either <= this.allowance.get(a) + this.allowance.get(b);
      this.clashes.push({ a, b, slots, students, separable });
    }
  }
  build() {
    for (const [i, us] of this.bids) {
      const terms = [];
      for (const u of us) {
        const col = this.addVar();
        this.x.set(key(i, u), col);
        terms.push([col, quarter(this.units.get(u).credits)]);
      }
      const r = this.addVar(quarter(this.settings.floor));
      this.r.set(i, r);
      this.row([...terms, [r, 1]], quarter(this.settings.floor));
      this.row(terms, -Infinity, quarter(this.settings.maxCredits));
    }
    for (const [i, us] of this.bids) {
      const ext = [...us].filter((u) => this.outside.has(u));
      if (ext.length) this.row(ext.map((u) => [this.x.get(key(i, u)), 1]), -Infinity, this.settings.version === "with" ? this.settings.outsideLimit : 0);
      const gs = /* @__PURE__ */ new Map();
      for (const u of us) {
        const g = this.groupOf.get(u);
        if (g) {
          if (!gs.has(g)) gs.set(g, []);
          gs.get(g).push(u);
        }
      }
      for (const same of gs.values()) if (same.length > 1) this.row(same.map((u) => [this.x.get(key(i, u)), 1]), -Infinity, 1);
    }
    for (const u of [...this.units.keys()].sort()) {
      const terms = [];
      for (const i of this.bids.keys()) {
        const c = this.x.get(key(i, u));
        if (c !== void 0) terms.push([c, 1]);
      }
      if (terms.length) this.row(terms, -Infinity, this.units.get(u).seat_cap);
    }
    const worth = /* @__PURE__ */ new Map();
    for (const p of this.clashes.filter((p2) => p2.separable)) for (const u of [p.a, p.b]) for (const t of p.slots) if (this.canMove(u, t)) {
      if (!worth.has(u)) worth.set(u, /* @__PURE__ */ new Set());
      worth.get(u).add(t);
    }
    for (const u of [...worth.keys()].sort()) {
      const f = this.addVar();
      this.f.set(u, f);
      const terms = [];
      for (const t of [...worth.get(u)].sort()) {
        const m = this.addVar();
        this.m.set(key(u, t), m);
        this.row([[m, 1], [f, -1]], -Infinity, 0);
        terms.push([m, 1]);
      }
      this.row([...terms, [f, -this.allowance.get(u)]], -Infinity, 0);
    }
    for (const p of this.clashes.filter((p2) => p2.separable)) {
      const y = this.addVar();
      this.y.set(key(p.a, p.b), y);
      for (const t of p.slots) {
        const terms = [[y, 1]];
        for (const u of [p.a, p.b]) {
          const m = this.m.get(key(u, t));
          if (m !== void 0) terms.push([m, -1]);
        }
        this.row(terms, -Infinity, 0);
      }
    }
    for (const p of this.clashes) for (const i of p.students) {
      const terms = [[this.x.get(key(i, p.a)), 1], [this.x.get(key(i, p.b)), 1]];
      const y = this.y.get(key(p.a, p.b));
      if (y !== void 0) terms.push([y, -1]);
      this.row(terms, -Infinity, 1);
    }
  }
  costs(stage) {
    const c = new Array(this.upper.length).fill(0);
    if (stage === 1) {
      for (const v of this.r.values()) c[v] = this.settings.penalty / 4;
      for (const v of this.f.values()) c[v] = 1;
    } else for (const [k, v] of this.x) {
      const [, u] = JSON.parse(k);
      c[v] = -quarter(this.units.get(u).credits);
    }
    return c;
  }
  locks(first) {
    const rs = [{ terms: [...this.r.values()].map((c) => [c, 1]), lo: -Infinity, hi: quarter(first.short) }];
    if (this.f.size) rs.push({ terms: [...this.f.values()].map((c) => [c, 1]), lo: -Infinity, hi: first.asked.length });
    rs.push({ terms: [...this.x].map(([k, c]) => [c, quarter(this.units.get(JSON.parse(k)[1]).credits)]), lo: quarter(first.credits), hi: Infinity });
    return rs;
  }
  /** LP text uses safe variable indexes, never untrusted course codes. */
  toLP(stage, extra = []) {
    const expr = (terms) => terms.filter(([, v]) => v !== 0).map(([c, v], i) => `${v < 0 ? "-" : i ? "+" : ""} ${Math.abs(v)} v${c}`).join(" ") || "0 v0";
    const out = ["Minimize", " obj: " + expr(this.costs(stage).map((v, c) => [c, v])), "Subject To"];
    let n = 0;
    for (const row of [...this.rows, ...extra]) {
      if (row.lo === row.hi) out.push(` c${n++}: ${expr(row.terms)} = ${row.lo}`);
      else {
        if (Number.isFinite(row.lo)) out.push(` c${n++}: ${expr(row.terms)} >= ${row.lo}`);
        if (Number.isFinite(row.hi)) out.push(` c${n++}: ${expr(row.terms)} <= ${row.hi}`);
      }
    }
    out.push("Bounds", ...this.upper.map((u, c) => ` 0 <= v${c} <= ${u}`), "Generals", ...this.upper.map((_, c) => ` v${c}`), "End");
    return out.join("\n");
  }
  summarize(allocation, moves) {
    let short = 0, credits = 0, students_short = 0;
    for (const i of this.bids.keys()) {
      const held = allocation[i] ?? [];
      const c = held.reduce((a, u) => a + this.units.get(u).credits, 0);
      credits += c;
      const r = Math.max(0, this.settings.floor - c);
      short += r;
      if (r > 1e-8) students_short++;
    }
    return { allocation, moves, short, credits, students_short, asked: unique(moves.map((m) => m.unit_id)) };
  }
  decode(values) {
    const allocation = Object.fromEntries([...this.bids.keys()].map((i) => [i, []]));
    for (const [k, c] of this.x) if (values[c] > 0.5) {
      const [i, u] = JSON.parse(k);
      allocation[i].push(u);
    }
    const moves = [];
    for (const [k, c] of this.m) if (values[c] > 0.5) {
      const [u, t] = JSON.parse(k), [date, slot] = JSON.parse(t);
      moves.push({ unit_id: u, date, slot });
    }
    return this.summarize(allocation, moves);
  }
  start(plan) {
    const values = new Float64Array(this.upper.length), moves = new Set(plan.moves.map((m) => key(m.unit_id, slotKey(m))));
    for (const [k, c] of this.x) {
      const [i, u] = JSON.parse(k);
      values[c] = plan.allocation[i].includes(u) ? 1 : 0;
    }
    for (const [i, c] of this.r) values[c] = Math.max(0, quarter(this.settings.floor) - plan.allocation[i].reduce((n, u) => n + quarter(this.units.get(u).credits), 0));
    for (const [k, c] of this.m) if (moves.has(k)) values[c] = 1;
    for (const [u, c] of this.f) values[c] = plan.moves.some((m) => m.unit_id === u) ? 1 : 0;
    for (const p of this.clashes) {
      const y = this.y.get(key(p.a, p.b));
      if (y !== void 0) values[y] = p.slots.every((t) => moves.has(key(p.a, t)) || moves.has(key(p.b, t))) ? 1 : 0;
    }
    return values;
  }
  validateVector(v, extra = []) {
    if (v.length !== this.upper.length) throw Error("Wrong solver vector length");
    for (let c = 0; c < v.length; c++) if (!Number.isFinite(v[c]) || v[c] < -1e-6 || v[c] > this.upper[c] + 1e-6 || Math.abs(v[c] - Math.round(v[c])) > 1e-6) throw Error("Solver returned invalid integer/bound values");
    for (const r of [...this.rows, ...extra]) {
      const a = r.terms.reduce((s, [c, k]) => s + k * v[c], 0);
      if (a < r.lo - 1e-6 || a > r.hi + 1e-6) throw Error("Solver returned an infeasible plan");
    }
  }
  /** Independent reconstruction: no solver-variable assertions are used here. */
  validate(plan) {
    if (Object.keys(plan.allocation).length !== this.bids.size || [...this.bids.keys()].some((i) => !(i in plan.allocation))) throw Error("Allocation must include each student exactly once");
    const moved = /* @__PURE__ */ new Set(), counts = /* @__PURE__ */ new Map();
    for (const m of plan.moves) {
      const t = slotKey(m), k = key(m.unit_id, t);
      if (moved.has(k) || !this.units.has(m.unit_id) || !this.canMove(m.unit_id, t)) throw Error("Invalid, duplicate or block-day move");
      moved.add(k);
      counts.set(m.unit_id, (counts.get(m.unit_id) ?? 0) + 1);
    }
    for (const [u, n] of counts) if (n > this.allowance.get(u)) throw Error("Move allowance exceeded");
    const seats = /* @__PURE__ */ new Map();
    for (const [i, held] of Object.entries(plan.allocation)) {
      if (unique(held).length !== held.length || held.some((u) => !this.bids.get(i)?.has(u))) throw Error("Invalid allocation or bidding-set violation");
      if (held.filter((u) => this.outside.has(u)).length > (this.settings.version === "with" ? this.settings.outsideLimit : 0)) throw Error("External-unit limit exceeded");
      const gs = held.map((u) => this.groupOf.get(u)).filter(Boolean);
      if (new Set(gs).size !== gs.length) throw Error("Same-content violation");
      if (held.reduce((s, u) => s + this.units.get(u).credits, 0) > this.settings.maxCredits + 1e-8) throw Error("Credit ceiling exceeded");
      for (const [a, b] of pairs(held)) if (intersect(this.slots.get(a), this.slots.get(b)).some((t) => !moved.has(key(a, t)) && !moved.has(key(b, t)))) throw Error("Registration clash remains");
      for (const u of held) seats.set(u, (seats.get(u) ?? 0) + 1);
    }
    for (const [u, n] of seats) if (n > this.units.get(u).seat_cap) throw Error("Seat cap exceeded");
    const fresh = this.summarize(plan.allocation, plan.moves);
    for (const k of ["short", "credits", "students_short"]) if (Math.abs(fresh[k] - plan[k]) > 1e-8) throw Error("Reported metrics do not match allocation");
    if (JSON.stringify(fresh.asked) !== JSON.stringify([...plan.asked].sort())) throw Error("Asked courses do not match moves");
    return true;
  }
  /** Exact minimum subset of already-moved courses in each slot (not new moves). */
  cleanup(plan) {
    const bySlot = /* @__PURE__ */ new Map(), holders = /* @__PURE__ */ new Map();
    for (const [i, us] of Object.entries(plan.allocation)) for (const u of us) {
      if (!holders.has(u)) holders.set(u, /* @__PURE__ */ new Set());
      holders.get(u).add(i);
    }
    for (const m of plan.moves) {
      const t = slotKey(m);
      if (!bySlot.has(t)) bySlot.set(t, /* @__PURE__ */ new Set());
      bySlot.get(t).add(m.unit_id);
    }
    const kept = [];
    for (const [t, moved] of [...bySlot].sort(([a], [b]) => a.localeCompare(b))) {
      const meeting = [...this.slots.keys()].filter((u) => this.slots.get(u).has(t)).sort();
      const edges = pairs(meeting).filter(([a, b]) => intersect(holders.get(a) ?? /* @__PURE__ */ new Set(), holders.get(b) ?? /* @__PURE__ */ new Set()).length);
      const candidates = [...moved].sort();
      let best = [...candidates];
      const search = (selected) => {
        if (selected.size >= best.length) return;
        const e = edges.find(([a, b]) => !selected.has(a) && !selected.has(b));
        if (!e) {
          best = [...selected];
          return;
        }
        for (const u of e) if (moved.has(u)) {
          selected.add(u);
          search(selected);
          selected.delete(u);
        }
      };
      if (!edges.length) best = [];
      else search(/* @__PURE__ */ new Set());
      const [date, slot] = JSON.parse(t);
      for (const u of best) kept.push({ unit_id: u, date, slot });
    }
    const final = this.summarize(plan.allocation, kept);
    this.validate(final);
    return final;
  }
};

// oml-solve.ts
var finite = (x) => Number.isFinite(x) ? x : null;
function solveOML(highs, input, settings, onProgress) {
  onProgress?.("Building model");
  const oml = new OmlModel(input, settings);
  const run = (stage, first2) => {
    onProgress?.(`Solving stage ${stage}`);
    const started = performance.now(), extra = first2 ? oml.locks(first2) : [];
    const model = highs.createModel({ format: "lp", data: oml.toLP(stage, extra) });
    try {
      model.options.set({ output_flag: oml.settings.showSolverLog, mip_rel_gap: 0, ...oml.settings.timeLimit === null ? {} : { time_limit: oml.settings.timeLimit } });
      const indexes = oml.upper.map((_, i) => model.getColByName(`v${i}`));
      if (first2) {
        const src = oml.start(first2);
        oml.validateVector(src, extra);
        const ordered = new Float64Array(src.length);
        indexes.forEach((j, i) => ordered[j] = src[i]);
        model.setSolution({ colValue: ordered });
      }
      model.run();
      const code = model.getModelStatus();
      const status = Object.entries(highs.constants.modelStatus).find(([, v]) => v === code)?.[0] ?? `status ${code}`;
      const info = (name) => {
        try {
          return finite(Number(model.info.get(name)));
        } catch {
          return null;
        }
      };
      const found = model.info.get("primal_solution_status") === highs.constants.solutionStatus.feasible;
      const scale = stage === 1 ? 1 : -0.25;
      const report = { status: status === "timeLimit" ? "time limit" : status, found_plan: found, objective: found ? scale * model.getObjectiveValue() : null, bound: info("mip_dual_bound") === null ? null : scale * info("mip_dual_bound"), gap: info("mip_gap"), seconds: (performance.now() - started) / 1e3, started_from_plan: !!first2 };
      if (!found) return { plan: null, report };
      const raw2 = model.getSolution().colValue, vector = Float64Array.from(indexes, (j) => raw2[j]);
      oml.validateVector(vector, extra);
      const plan2 = oml.decode(vector);
      oml.validate(plan2);
      return { plan: plan2, report };
    } finally {
      model.dispose();
    }
  };
  const first = run(1);
  if (!first.plan) return { plan: null, step1: first.report, step2: null, message: first.report.status === "time limit" ? "Stage 1 reached its time limit without a feasible incumbent. Increase the limit or inspect a saved study run." : `Stage 1 returned ${first.report.status} without a feasible incumbent. No result is being presented.`, model_size: { variables: oml.upper.length, constraints: oml.rows.length } };
  const second = run(2, first.plan);
  const raw = second.plan ?? first.plan;
  if (raw.short > first.plan.short + 1e-8 || raw.asked.length > first.plan.asked.length || raw.credits < first.plan.credits - 1e-8) throw Error("Stage 2 violated priority locks");
  onProgress?.("Validating and removing unnecessary moves");
  const plan = oml.cleanup(raw);
  return { plan, step1: first.report, step2: second.report, optimal: first.report.status === "optimal" && second.report.status === "optimal", message: second.plan ? null : "Stage 2 did not return a feasible plan; showing the independently validated stage 1 incumbent.", model_size: { variables: oml.upper.length, constraints: oml.rows.length } };
}

// oml-heuristic.ts
var cmp = (a, b) => a < b ? -1 : a > b ? 1 : 0;
var sorted = (s) => [...s].sort(cmp);
var diff = (a, b) => new Set([...a].filter((x) => !b.has(x)));
var union = (...sets) => new Set(sets.flatMap((s) => [...s]));
var sum = (values) => [...values].reduce((a, b) => a + b, 0);
var key2 = (u, t) => JSON.stringify([u, t]);
var split = (m) => JSON.parse(m);
var count = (values) => {
  const c = /* @__PURE__ */ new Map();
  for (const v of values) c.set(v, (c.get(v) ?? 0) + 1);
  return c;
};
function tupleCompare(a, b) {
  for (let i = 0; i < a.length; i++) {
    if (a[i] < b[i]) return -1;
    if (a[i] > b[i]) return 1;
  }
  return 0;
}
var PythonRandom = class {
  mt = new Uint32Array(624);
  index = 624;
  constructor(seed) {
    if (!Number.isSafeInteger(seed)) throw Error("Heuristic seed must be a safe integer");
    let n = BigInt(Math.abs(seed));
    const words = [];
    do {
      words.push(Number(n & 0xffffffffn));
      n >>= 32n;
    } while (n);
    this.mt[0] = 19650218;
    for (let i2 = 1; i2 < 624; i2++) this.mt[i2] = Math.imul(1812433253, this.mt[i2 - 1] ^ this.mt[i2 - 1] >>> 30) + i2 >>> 0;
    let i = 1, j = 0;
    for (let k = Math.max(624, words.length); k > 0; k--) {
      this.mt[i] = (this.mt[i] ^ Math.imul(this.mt[i - 1] ^ this.mt[i - 1] >>> 30, 1664525)) + words[j] + j >>> 0;
      i++;
      j++;
      if (i >= 624) {
        this.mt[0] = this.mt[623];
        i = 1;
      }
      if (j >= words.length) j = 0;
    }
    for (let k = 623; k > 0; k--) {
      this.mt[i] = (this.mt[i] ^ Math.imul(this.mt[i - 1] ^ this.mt[i - 1] >>> 30, 1566083941)) - i >>> 0;
      i++;
      if (i >= 624) {
        this.mt[0] = this.mt[623];
        i = 1;
      }
    }
    this.mt[0] = 2147483648;
  }
  word() {
    if (this.index >= 624) {
      for (let i = 0; i < 624; i++) {
        const y2 = this.mt[i] & 2147483648 | this.mt[(i + 1) % 624] & 2147483647;
        this.mt[i] = (this.mt[(i + 397) % 624] ^ y2 >>> 1 ^ (y2 & 1 ? 2567483615 : 0)) >>> 0;
      }
      this.index = 0;
    }
    let y = this.mt[this.index++];
    y ^= y >>> 11;
    y ^= y << 7 & 2636928640;
    y ^= y << 15 & 4022730752;
    y ^= y >>> 18;
    return y >>> 0;
  }
  randbelow(n) {
    if (!Number.isSafeInteger(n) || n <= 0 || n > 2147483647) throw Error("Random choice requires a nonempty, supported range");
    const k = Math.floor(Math.log2(n)) + 1;
    let r;
    do {
      r = this.word() >>> 32 - k;
    } while (r >= n);
    return r;
  }
  choice(items) {
    return items[this.randbelow(items.length)];
  }
};
var Scenario = class {
  constructor(model) {
    this.model = model;
    if (model.settings.version === "with" && model.settings.outsideLimit !== 1 && [...model.bids.values()].some((b) => [...b].some((u) => model.outside.has(u)))) throw Error("The notebook heuristic supports at most one external course; use PGP-only access to exclude them");
    const slots = sorted(union(...model.slots.values()));
    slots.forEach((t, n) => this.bits.set(t, 1n << BigInt(n)));
    const groupBits = /* @__PURE__ */ new Map();
    for (const g of sorted(new Set(model.groupOf.values()))) groupBits.set(g, 1n << BigInt(this.bits.size + groupBits.size));
    const outsideBit = 1n << BigInt(this.bits.size + groupBits.size);
    for (const [u, ts] of model.slots) {
      let m = 0n;
      for (const t of ts) m |= this.bits.get(t);
      const group = model.groupOf.get(u);
      if (group !== void 0) m |= groupBits.get(group);
      if (model.outside.has(u)) m |= outsideBit;
      this.base.set(u, m);
      this.q.set(u, Math.round(4 * model.units.get(u).credits));
      this.listers.set(u, /* @__PURE__ */ new Set());
    }
    for (const [i, b] of model.bids) {
      for (const u of b) this.listers.get(u).add(i);
      this.order.set(i, this.creditOrder(b));
    }
    this.floor4 = Math.round(4 * model.settings.floor);
    this.max4 = Math.round(4 * model.settings.maxCredits);
  }
  model;
  bits = /* @__PURE__ */ new Map();
  base = /* @__PURE__ */ new Map();
  listers = /* @__PURE__ */ new Map();
  cache = /* @__PURE__ */ new Map();
  q = /* @__PURE__ */ new Map();
  order = /* @__PURE__ */ new Map();
  floor4;
  max4;
  creditOrder(options) {
    return [...options].sort((a, b) => this.q.get(b) - this.q.get(a) || cmp(a, b));
  }
  masksAfter(moves) {
    const mask = new Map(this.base);
    for (const move of moves) {
      const [u, t] = split(move);
      mask.set(u, mask.get(u) & ~this.bits.get(t));
    }
    return mask;
  }
  occupied(moves) {
    const occupied = new Map([...this.model.slots].map(([u, ts]) => [u, new Set(ts)]));
    for (const move of moves) {
      const [u, t] = split(move);
      occupied.get(u).delete(t);
    }
    return occupied;
  }
  boundLeft(order) {
    const left = new Array(order.length + 1).fill(0), top = /* @__PURE__ */ new Map();
    let total = 0;
    for (let j = order.length - 1; j >= 0; j--) {
      const u = order[j], k = this.model.outside.has(u) ? "outside" : this.model.groupOf.get(u) ?? u, q = this.q.get(u);
      if (q > (top.get(k) ?? 0)) {
        total += q - (top.get(k) ?? 0);
        top.set(k, q);
      }
      left[j] = total;
    }
    return left;
  }
  most(options, mask, room, stop = room, order) {
    order ??= this.creditOrder(options);
    const credit = order.map((u) => this.q.get(u)), bits = order.map((u) => mask.get(u)), left = this.boundLeft(order), n = order.length;
    let best = 0, chosen = 0n;
    const search = (j, selected, used, total) => {
      if (total > best) {
        best = total;
        chosen = selected;
      }
      if (best >= stop || j === n || total + left[j] <= best) return;
      if (total + credit[j] <= room && !(used & bits[j])) search(j + 1, selected | 1n << BigInt(j), used | bits[j], total + credit[j]);
      search(j + 1, selected, used, total);
    };
    search(0, 0n, 0n, 0);
    return [best, new Set(order.filter((_, j) => !!(chosen & 1n << BigInt(j))))];
  }
  cover(options, mask, target, preference) {
    const order = this.creditOrder(options), credit = order.map((u) => this.q.get(u)), bits = order.map((u) => mask.get(u)), left = this.boundLeft(order), pref = order.map((u) => preference.get(u)), n = order.length;
    let best = null, bestScore = null, chosen = 0n;
    const search = (j, selected, used, total, score) => {
      if (total > this.max4 || best !== null && total > best) return;
      if (total >= target) {
        if (best === null || total < best || score > bestScore) {
          best = total;
          bestScore = score;
          chosen = selected;
        }
        return;
      }
      if (j === n || total + left[j] < target) return;
      if (!(used & bits[j])) search(j + 1, selected | 1n << BigInt(j), used | bits[j], total + credit[j], score + pref[j]);
      search(j + 1, selected, used, total, score);
    };
    search(0, 0n, 0n, 0, 0);
    return best === null ? null : new Set(order.filter((_, j) => !!(chosen & 1n << BigInt(j))));
  }
  studentBest(i, mask, stop) {
    const order = this.order.get(i), k = JSON.stringify([i, stop, order.map((u) => mask.get(u).toString())]);
    let v = this.cache.get(k);
    if (v === void 0) {
      v = this.most(order, mask, this.max4, stop, order)[0];
      this.cache.set(k, v);
    }
    return v;
  }
  gap(i, mask) {
    return Math.max(0, this.floor4 - this.studentBest(i, mask, this.floor4));
  }
  touched(students, mask, extra) {
    const moved = /* @__PURE__ */ new Map();
    for (const m of extra) {
      const [u, t] = split(m);
      moved.set(u, (moved.get(u) ?? 0n) | this.bits.get(t));
    }
    return students.filter((i) => [...moved].some(([u, m]) => this.model.bids.get(i).has(u) && [...this.model.bids.get(i)].some((v) => v !== u && !!(mask.get(u) & mask.get(v) & m))));
  }
  scoreMove(moves, mask, extra, students, gaps) {
    const hit = this.touched(students, mask, extra), after = this.masksAfter(union(moves, extra));
    return sum(hit.map((i) => gaps.get(i) - this.gap(i, after)));
  }
  bestMoves(occupied, unit, short, already) {
    const room = this.model.allowance.get(unit) - already.size;
    if (room <= 0) return /* @__PURE__ */ new Set();
    const blocking = /* @__PURE__ */ new Map();
    for (const i of short) {
      const bids = this.model.bids.get(i);
      if (!bids.has(unit)) continue;
      for (const v of bids) if (v !== unit) {
        for (const t of occupied.get(unit)) if (occupied.get(v).has(t) && this.model.canMove(unit, t)) blocking.set(t, (blocking.get(t) ?? 0) + 1);
      }
    }
    return new Set([...blocking.keys()].sort((a, b) => blocking.get(b) - blocking.get(a) || cmp(a, b)).slice(0, room).map((t) => key2(unit, t)));
  }
  pairRescue(moves, occupied, mask, short, gaps) {
    const used = count([...moves].map((m) => split(m)[0])), shortSet = new Set(short);
    let bestKey = null, bestExtra = /* @__PURE__ */ new Set();
    for (const p of this.model.clashes) {
      if (!p.separable || !p.students.some((i) => shortSet.has(i))) continue;
      const a = p.a, b = p.b, room = /* @__PURE__ */ new Map([[a, this.model.allowance.get(a) - (used.get(a) ?? 0)], [b, this.model.allowance.get(b) - (used.get(b) ?? 0)]]);
      let extra = /* @__PURE__ */ new Set();
      for (const t of sorted(occupied.get(a))) {
        if (!occupied.get(b).has(t)) continue;
        const mover = [a, b].find((u) => room.get(u) > 0 && this.model.canMove(u, t));
        if (mover === void 0) {
          extra = null;
          break;
        }
        extra.add(key2(mover, t));
        room.set(mover, room.get(mover) - 1);
      }
      if (!extra?.size) continue;
      const affected = short.filter((i) => this.model.bids.get(i).has(a) || this.model.bids.get(i).has(b)), gain = this.scoreMove(moves, mask, extra, affected, gaps), newCourses = new Set([...extra].map((m) => split(m)[0]).filter((u) => !used.has(u))).size;
      if (gain > 0) {
        const k = [gain / Math.max(newCourses, 1), -extra.size, a, b];
        if (bestKey === null || tupleCompare(k, bestKey) > 0) {
          bestKey = k;
          bestExtra = extra;
        }
      }
    }
    return bestExtra;
  }
  fixTimetable() {
    let moves = /* @__PURE__ */ new Set(), mask = this.masksAfter(moves);
    const gaps = new Map([...this.model.bids.keys()].map((i) => [i, this.gap(i, mask)]));
    while (true) {
      const short = sorted([...gaps].filter(([, g]) => g > 0).map(([i]) => i));
      if (!short.length) return moves;
      const occupied = this.occupied(moves), asked = new Set([...moves].map((m) => split(m)[0]));
      let bestKey = null, bestExtra = null;
      for (const unit of sorted([...this.model.slots.keys()].filter((u) => this.model.allowance.get(u) > 0))) {
        const already = new Set([...moves].filter((m) => split(m)[0] === unit)), extra = this.bestMoves(occupied, unit, short, already);
        if (!extra.size) continue;
        const gain = this.scoreMove(moves, mask, extra, short.filter((i) => this.model.bids.get(i).has(unit)), gaps);
        if (gain <= 0) continue;
        const k = [asked.has(unit), gain, -extra.size, unit];
        if (bestKey === null || tupleCompare(k, bestKey) > 0) {
          bestKey = k;
          bestExtra = extra;
        }
      }
      bestExtra ??= this.pairRescue(moves, occupied, mask, short, gaps);
      if (!bestExtra.size) return moves;
      moves = union(moves, bestExtra);
      mask = this.masksAfter(moves);
      for (const i of union(...[...bestExtra].map((m) => this.listers.get(split(m)[0])))) gaps.set(i, this.gap(i, mask));
    }
  }
  staticOrder(mask) {
    return [...this.model.bids.keys()].sort((a, b) => this.studentBest(a, mask, this.max4) - this.studentBest(b, mask, this.max4) || cmp(a, b));
  }
  allotCore(moves) {
    const s = new Seats(this, this.masksAfter(moves)), order = this.staticOrder(s.mask);
    s.firstAllotment(order);
    s.repair();
    return [s, order];
  }
  freeGap(options, mask, cache) {
    const order = sorted(options), k = JSON.stringify([order, order.map((u) => mask.get(u).toString())]);
    let g = cache.get(k);
    if (g === void 0) {
      g = Math.max(0, this.floor4 - this.most(options, mask, this.max4, this.floor4)[0]);
      cache.set(k, g);
    }
    return g;
  }
  unblock(s, moves) {
    while (true) {
      const short = sorted([...s.held.keys()].filter((i) => s.credit(i) < this.floor4));
      if (!short.length) return moves;
      const options = new Map(short.map((i) => [i, union(s.held.get(i), [...this.model.bids.get(i)].filter((u) => s.free.get(u) > 0))])), cache = /* @__PURE__ */ new Map(), gaps = new Map(short.map((i) => [i, this.freeGap(options.get(i), s.mask, cache)])), occupied = this.occupied(moves), used = count([...moves].map((m) => split(m)[0]));
      let bestKey = null, bestExtra = null, bestHit = [];
      for (const unit of sorted([...this.model.slots.keys()].filter((u) => this.model.allowance.get(u) - (used.get(u) ?? 0) > 0))) {
        const mine = short.filter((i) => options.get(i).has(unit)), blocking = /* @__PURE__ */ new Map();
        for (const i of mine) for (const v of options.get(i)) if (v !== unit) {
          for (const t of occupied.get(unit)) if (occupied.get(v).has(t) && this.model.canMove(unit, t)) blocking.set(t, (blocking.get(t) ?? 0) + 1);
        }
        const extra = new Set([...blocking.keys()].sort((a, b) => blocking.get(b) - blocking.get(a) || cmp(a, b)).slice(0, this.model.allowance.get(unit) - (used.get(unit) ?? 0)).map((t) => key2(unit, t)));
        if (!extra.size) continue;
        let moved = 0n;
        for (const m of extra) moved |= this.bits.get(split(m)[1]);
        const hit = mine.filter((i) => [...options.get(i)].some((v) => v !== unit && !!(s.mask.get(unit) & s.mask.get(v) & moved))), after = this.masksAfter(union(moves, extra)), gain = sum(hit.map((i) => gaps.get(i) - this.freeGap(options.get(i), after, cache)));
        if (gain <= 0) continue;
        const k = [used.has(unit), gain, -extra.size, unit];
        if (bestKey === null || tupleCompare(k, bestKey) > 0) {
          bestKey = k;
          bestExtra = extra;
          bestHit = hit;
        }
      }
      if (bestExtra === null) return moves;
      moves = union(moves, bestExtra);
      s.mask = this.masksAfter(moves);
      for (const i of bestHit.sort((a, b) => s.credit(a) - s.credit(b) || cmp(a, b))) s.repick(i);
    }
  }
  trimCourses(s, order, moves) {
    const helped = (unit) => {
      const occupied = this.occupied(new Set([...moves].filter((m) => split(m)[0] !== unit)));
      return [...s.held.values()].filter((held) => held.has(unit) && [...held].some((v) => v !== unit && [...occupied.get(unit)].some((t) => occupied.get(v).has(t)))).length;
    };
    const units = sorted(new Set([...moves].map((m) => split(m)[0]))).sort((a, b) => helped(a) - helped(b) || cmp(a, b));
    for (const unit of units) {
      const trialMoves = new Set([...moves].filter((m) => split(m)[0] !== unit)), mine = this.listers.get(unit), now = this.masksAfter(moves), without = this.masksAfter(trialMoves);
      if (sum([...mine].map((i) => this.gap(i, without))) > sum([...mine].map((i) => this.gap(i, now)))) continue;
      const [trial, trialOrder] = this.allotCore(trialMoves);
      if (trial.short() <= s.short()) {
        s = trial;
        order = trialOrder;
        moves = trialMoves;
      }
    }
    return [s, order, moves];
  }
};
var Seats = class {
  constructor(sc, mask) {
    this.sc = sc;
    this.mask = mask;
    for (const [u, v] of sc.model.units) {
      this.free.set(u, v.seat_cap);
      this.holders.set(u, /* @__PURE__ */ new Set());
    }
    for (const i of sc.model.bids.keys()) this.held.set(i, /* @__PURE__ */ new Set());
  }
  sc;
  mask;
  free = /* @__PURE__ */ new Map();
  held = /* @__PURE__ */ new Map();
  holders = /* @__PURE__ */ new Map();
  log = [];
  credit(i) {
    return sum([...this.held.get(i)].map((u) => this.sc.q.get(u)));
  }
  give(i, u) {
    if (this.free.get(u) <= 0 || this.held.get(i).has(u)) throw Error(`No free seat or duplicate allotment in ${u}`);
    this.held.get(i).add(u);
    this.holders.get(u).add(i);
    this.free.set(u, this.free.get(u) - 1);
    this.log.push([i, u, 1]);
  }
  take(i, u) {
    if (!this.held.get(i).has(u)) throw Error("Cannot release an unheld course");
    this.held.get(i).delete(u);
    this.holders.get(u).delete(i);
    this.free.set(u, this.free.get(u) + 1);
    this.log.push([i, u, -1]);
  }
  undo(mark) {
    while (this.log.length > mark) {
      const [i, u, sign] = this.log.pop();
      if (sign === 1) {
        this.held.get(i).delete(u);
        this.holders.get(u).delete(i);
        this.free.set(u, this.free.get(u) + 1);
      } else {
        this.held.get(i).add(u);
        this.holders.get(u).add(i);
        this.free.set(u, this.free.get(u) - 1);
      }
    }
  }
  fits(current, u) {
    if (current.has(u) || sum([...current].map((v) => this.sc.q.get(v))) + this.sc.q.get(u) > this.sc.max4) return false;
    let used = 0n;
    for (const v of current) used |= this.mask.get(v);
    return !(used & this.mask.get(u));
  }
  short() {
    return sum([...this.held.keys()].map((i) => Math.max(0, this.sc.floor4 - this.credit(i))));
  }
  firstAllotment(order) {
    const sc = this.sc, still = count(order.flatMap((i) => [...sc.model.bids.get(i)]));
    for (const i of order) {
      const bids = sc.model.bids.get(i);
      for (const u of bids) still.set(u, still.get(u) - 1);
      const open = new Set([...bids].filter((u) => this.free.get(u) > 0)), pref = new Map([...open].map((u) => [u, this.free.get(u) / (1 + still.get(u))])), chosen = sc.cover(open, this.mask, sc.floor4, pref) ?? sc.most(open, this.mask, sc.max4)[1];
      for (const u of sorted(chosen)) this.give(i, u);
    }
  }
  repick(i) {
    const sc = this.sc, bids = sc.model.bids.get(i), spare = /* @__PURE__ */ new Map(), spareOf = (j) => {
      if (!spare.has(j)) spare.set(j, this.credit(j) - sc.floor4);
      return spare.get(j);
    };
    const releasable = [...diff(bids, this.held.get(i))].filter((u) => this.free.get(u) === 0 && [...this.holders.get(u)].some((j) => spareOf(j) >= sc.q.get(u))), available = union(this.held.get(i), [...bids].filter((u) => this.free.get(u) > 0), releasable);
    let [value, chosen] = sc.most(available, this.mask, sc.floor4);
    if (value < sc.floor4) {
      const [up, chosenUp] = sc.most(available, this.mask, sc.max4);
      if (up >= sc.floor4) {
        value = up;
        chosen = chosenUp;
      }
    }
    if (value <= this.credit(i)) return false;
    const releasers = /* @__PURE__ */ new Map();
    for (const u of sorted(diff(chosen, this.held.get(i)))) {
      if (this.free.get(u) > 0) continue;
      const giver = sorted(this.holders.get(u)).find((j) => spareOf(j) >= sc.q.get(u));
      if (giver === void 0) return false;
      spare.set(giver, spareOf(giver) - sc.q.get(u));
      releasers.set(u, giver);
    }
    for (const u of sorted(diff(this.held.get(i), chosen))) this.take(i, u);
    for (const u of sorted(diff(chosen, this.held.get(i)))) {
      if (releasers.has(u)) this.take(releasers.get(u), u);
      this.give(i, u);
    }
    return true;
  }
  makeRoom(u, chain, depth = 2) {
    const sc = this.sc;
    for (const j of sorted(diff(this.holders.get(u), chain))) {
      const need = Math.min(this.credit(j), sc.floor4), pool = union(diff(this.held.get(j), /* @__PURE__ */ new Set([u])), [...sc.model.bids.get(j)].filter((v) => v !== u && (this.free.get(v) > 0 || depth > 1))), pref = new Map([...pool].map((v) => [v, this.held.get(j).has(v) ? 2 : this.free.get(v) > 0 ? 1 : 0])), cover = sc.cover(pool, this.mask, need, pref);
      if (cover === null) continue;
      const missing = sorted([...diff(cover, this.held.get(j))].filter((v) => this.free.get(v) === 0));
      if (!missing.every((v) => this.makeRoom(v, union(chain, [j]), depth - 1))) continue;
      if ([...diff(cover, this.held.get(j))].some((v) => this.free.get(v) === 0)) continue;
      for (const v of sorted(diff(this.held.get(j), cover))) this.take(j, v);
      for (const v of sorted(diff(cover, this.held.get(j)))) this.give(j, v);
      return true;
    }
    return false;
  }
  deepRepick(i) {
    const sc = this.sc, bids = sc.model.bids.get(i), pref = new Map([...bids].map((u) => [u, this.held.get(i).has(u) ? 2 : this.free.get(u) > 0 ? 1 : 0])), chosen = sc.cover(bids, this.mask, sc.floor4, pref) ?? sc.most(bids, this.mask, sc.max4)[1];
    if (sum([...chosen].map((u) => sc.q.get(u))) <= this.credit(i)) return false;
    for (const u of sorted(diff(chosen, this.held.get(i)))) if (this.free.get(u) === 0 && !this.makeRoom(u, /* @__PURE__ */ new Set([i]))) return false;
    if ([...diff(chosen, this.held.get(i))].some((u) => this.free.get(u) === 0)) return false;
    for (const u of sorted(diff(this.held.get(i), chosen))) this.take(i, u);
    for (const u of sorted(diff(chosen, this.held.get(i)))) this.give(i, u);
    return true;
  }
  switchTrade(i) {
    const sc = this.sc;
    for (const u of sc.creditOrder(diff(sc.model.bids.get(i), this.held.get(i)))) {
      if (this.free.get(u) > 0 || !this.fits(this.held.get(i), u)) continue;
      for (const j of sorted(this.holders.get(u))) {
        const others = diff(this.held.get(j), /* @__PURE__ */ new Set([u])), keep = Math.min(this.credit(j), sc.floor4), switches = [...sc.model.bids.get(j)].filter((v) => this.free.get(v) > 0 && v !== u && this.fits(others, v) && sum([...others].map((z) => sc.q.get(z))) + sc.q.get(v) >= keep);
        if (switches.length) {
          const v = switches.sort((a, b) => tupleCompare([sc.q.get(b), this.free.get(b), b], [sc.q.get(a), this.free.get(a), a]))[0];
          this.take(j, u);
          this.give(j, v);
          this.give(i, u);
          return true;
        }
      }
    }
    return false;
  }
  repair() {
    let changed = true;
    while (changed) {
      changed = false;
      const short = [...this.held.keys()].filter((i) => this.credit(i) < this.sc.floor4).sort((a, b) => this.credit(a) - this.credit(b) || cmp(a, b));
      for (const i of short) if (this.repick(i) || this.deepRepick(i) || this.switchTrade(i)) changed = true;
    }
  }
  pickGroup(rng, size) {
    const short = sorted([...this.held.keys()].filter((i) => this.credit(i) < this.sc.floor4));
    if (!short.length) return [];
    const group = [rng.choice(short)];
    for (let n = 0; n < 20 * size; n++) {
      if (group.length === size) break;
      const listed = sorted(this.sc.model.bids.get(rng.choice(group)));
      if (!listed.length) continue;
      const u = rng.choice(listed), others = sorted(diff(this.holders.get(u), new Set(group)));
      if (others.length) group.push(rng.choice(others));
    }
    return group;
  }
  handOutAgain(group) {
    const sc = this.sc, waiting = new Set(group), still = count(group.flatMap((i) => [...sc.model.bids.get(i)]));
    while (waiting.size) {
      const reach = new Map([...waiting].map((i2) => [i2, sc.most([...sc.model.bids.get(i2)].filter((u) => this.free.get(u) > 0), this.mask, sc.max4)[0]])), i = sorted(waiting).sort((a, b) => reach.get(a) - reach.get(b) || cmp(a, b))[0];
      waiting.delete(i);
      for (const u of sc.model.bids.get(i)) still.set(u, still.get(u) - 1);
      const open = new Set([...sc.model.bids.get(i)].filter((u) => this.free.get(u) > 0)), pref = new Map([...open].map((u) => [u, this.free.get(u) / (1 + still.get(u))])), chosen = sc.cover(open, this.mask, sc.floor4, pref) ?? sc.most(open, this.mask, sc.max4)[1];
      for (const u of sorted(chosen)) this.give(i, u);
    }
    for (const i of [...group].sort((a, b) => this.credit(a) - this.credit(b) || cmp(a, b))) if (this.credit(i) < sc.floor4) this.repick(i) || this.switchTrade(i);
  }
  changeSince(mark) {
    const delta = /* @__PURE__ */ new Map();
    for (const [i, u, sign] of this.log.slice(mark)) delta.set(i, (delta.get(i) ?? 0) + sign * this.sc.q.get(u));
    const short = sum([...delta].map(([i, d]) => Math.max(0, this.sc.floor4 - this.credit(i)) - Math.max(0, this.sc.floor4 - (this.credit(i) - d))));
    return [short, sum(delta.values())];
  }
  ruin(rounds, patience, size, seed, onProgress) {
    const rng = new PythonRandom(seed);
    let calm = 0, done = 0;
    for (done = 1; done <= rounds; done++) {
      const group = this.pickGroup(rng, size);
      if (!group.length) break;
      const mark = this.log.length;
      for (const i of group) for (const u of sorted(this.held.get(i))) this.take(i, u);
      this.handOutAgain(group);
      const [short, credits] = this.changeSince(mark);
      if (short > 0 || short === 0 && credits < 0) this.undo(mark);
      calm = short < 0 ? 0 : calm + 1;
      if (done % 50 === 0) onProgress?.(`Heuristic step 6 of 7: rebuilding seats (${done} of ${rounds} rounds)`);
      if (calm >= patience) break;
    }
    this.log = [];
    return Math.min(done, rounds);
  }
  fill(order) {
    const sc = this.sc;
    let changed = true;
    while (changed) {
      changed = false;
      for (const i of order) {
        for (const u of sc.creditOrder(diff(sc.model.bids.get(i), this.held.get(i)))) if (this.free.get(u) > 0 && this.fits(this.held.get(i), u)) {
          this.give(i, u);
          changed = true;
        }
        for (const u of [...this.held.get(i)].sort((a, b) => sc.q.get(a) - sc.q.get(b) || cmp(a, b))) {
          const bigger = [...sc.model.bids.get(i)].filter((v) => this.free.get(v) > 0 && sc.q.get(v) > sc.q.get(u) && this.fits(diff(this.held.get(i), /* @__PURE__ */ new Set([u])), v));
          if (bigger.length) {
            const v = bigger.sort((a, b) => sc.q.get(b) - sc.q.get(a) || cmp(b, a))[0];
            this.take(i, u);
            this.give(i, v);
            changed = true;
            break;
          }
        }
      }
    }
  }
  score() {
    return [this.short(), -sum([...this.held.keys()].map((i) => this.credit(i)))];
  }
};
function runHeuristic(input, settings, onProgress) {
  const started = performance.now(), rounds = settings.heuristicRounds ?? 2e3, patience = settings.heuristicPatience ?? 500, size = settings.heuristicGroup ?? 10, seed = settings.heuristicSeed ?? 2026;
  if (!Number.isSafeInteger(rounds) || rounds < 0 || rounds > 1e5) throw Error("Heuristic rounds must be an integer between 0 and 100,000");
  if (!Number.isSafeInteger(patience) || patience < 1 || patience > 1e5) throw Error("Heuristic patience must be an integer between 1 and 100,000");
  if (!Number.isSafeInteger(size) || size < 1 || size > 1e4) throw Error("Heuristic group size must be an integer between 1 and 10,000");
  if (!Number.isSafeInteger(seed)) throw Error("Heuristic seed must be a safe integer");
  onProgress?.("Heuristic step 1 of 7: fixing the timetable");
  const model = new OmlModel(input, settings), sc = new Scenario(model);
  let moves = sc.fixTimetable();
  onProgress?.("Heuristic steps 2 and 3 of 7: allotting and repairing seats");
  let [s, order] = sc.allotCore(moves);
  onProgress?.("Heuristic step 4 of 7: trimming course requests");
  [s, order, moves] = sc.trimCourses(s, order, moves);
  onProgress?.("Heuristic step 5 of 7: unblocking free seats");
  const widened = sc.unblock(s, moves);
  if (widened.size !== moves.size) {
    moves = widened;
    s.repair();
  }
  const lowest = sum([...sc.model.bids.keys()].map((i) => sc.gap(i, s.mask)));
  let roundsCompleted = 0;
  if (s.short() > lowest) {
    const kept = new Map([...s.held].map(([i, held]) => [i, new Set(held)]));
    onProgress?.("Heuristic step 6 of 7: rebuilding seat allocations");
    roundsCompleted = s.ruin(rounds, patience, size, seed, onProgress);
    const before = new Seats(sc, s.mask);
    for (const [i, held] of kept) for (const u of sorted(held)) before.give(i, u);
    onProgress?.("Heuristic step 7 of 7: filling remaining credits");
    before.fill(order);
    s.fill(order);
    if (tupleCompare(before.score(), s.score()) < 0) s = before;
  } else {
    onProgress?.("Heuristic step 7 of 7: filling remaining credits");
    s.fill(order);
  }
  const allocation = Object.fromEntries([...s.held].map(([i, held]) => [i, sorted(held)])), planMoves = [...moves].map((m) => {
    const [u, t] = split(m), [date, slot] = JSON.parse(t);
    return { unit_id: u, date, slot };
  });
  onProgress?.("Validating the heuristic plan and removing unnecessary moves");
  const plan = model.cleanup(model.summarize(allocation, planMoves));
  model.validate(plan);
  return { plan, seconds: (performance.now() - started) / 1e3, method: "heuristic", rounds_completed: roundsCompleted, message: null, optimal: false };
}

// oml.worker.ts
var ENGINE_VERSION = "oml-2026-11-24-seven-step-v1";
var runtime;
var busy = false;
var logSink;
self.onmessage = async (event) => {
  const { id, input, settings, wasmUrl, method = "solver" } = event.data;
  if (busy) {
    self.postMessage({ id, type: "error", error: "An execution is already running" });
    return;
  }
  busy = true;
  try {
    if (!["solver", "heuristic", "both"].includes(method)) throw Error("Choose solver, heuristic, or both");
    const results = {};
    logSink = settings.showSolverLog ? (message) => self.postMessage({ id, type: "log", message }) : void 0;
    for (const chosen of method === "both" ? ["heuristic", "solver"] : [method]) {
      const started = performance.now();
      const progress = (phase) => self.postMessage({ id, type: "progress", phase: `${chosen === "solver" ? "Integer program" : "Heuristic"}: ${phase}` });
      let result;
      if (chosen === "heuristic") result = runHeuristic(input, settings, progress);
      else {
        progress("Loading solver");
        runtime ??= highs_default({ print: (message) => logSink?.(message), printErr: (message) => logSink?.(message), locateFile: () => wasmUrl ?? new URL("/lab/solver-assets/highs.wasm", self.location.origin).href });
        result = solveOML(await runtime, input, settings, progress);
      }
      if (!result.plan) throw Error(result.message ?? `${chosen} finished without a feasible plan. This execution has not replaced any recent run.`);
      results[chosen] = { ...result, method: chosen, total_seconds: (performance.now() - started) / 1e3 };
    }
    self.postMessage({ id, type: "result", results, engineVersion: ENGINE_VERSION });
  } catch (e) {
    self.postMessage({ id, type: "error", error: e instanceof Error ? e.message : String(e) });
  } finally {
    busy = false;
    logSink = void 0;
  }
};
export {
  ENGINE_VERSION
};
