/* eslint-disable no-underscore-dangle */

'use strict';

const VirtualStats = require('./virtual-stats');

class VirtualModulePluginDynamic {
  constructor(options) {
    this.options = options;
  }

  apply(compiler) {
    const self = this;
    const moduleName = this.options.moduleName;
    const ctime = VirtualModulePluginDynamic.statsDate();
    let modulePath = this.options.path;

    function resolverPlugin(request, cb) {
      // populate the file system cache with the virtual module
      const fs = this.fileSystem;

      // webpack 1.x compatibility
      if (typeof request === 'string') {
        request = cb;
        cb = null;
      }

      if (!modulePath) {
        modulePath = this.join(compiler.context, moduleName);
      }

      if (modulePath === request.request) {
        VirtualModulePluginDynamic.populateFilesystem({ fs, modulePath, contents: self.options.contents(), ctime }, this);
      }

      cb();
    }

    if (!compiler.resolvers.normal) {
      compiler.plugin('after-resolvers', () => {
        compiler.resolvers.normal.plugin('before-resolve', resolverPlugin);
      });
    } else {
      compiler.resolvers.normal.plugin('before-resolve', resolverPlugin);
    }
  }

  static populateFilesystem(options, instance) {
    const { fs, modulePath, contents } = options;

    if (VirtualModulePluginDynamic.storageContainsFile(fs._readFileStorage, modulePath)) {
      return;
    }

    if (instance._prevContents !== contents) {
      instance._prevContents = contents;
      instance._prevStats = VirtualModulePluginDynamic.createStats(options);
    }

    VirtualModulePluginDynamic.setStorageData(fs._statStorage, modulePath, [null, instance._prevStats]);
    VirtualModulePluginDynamic.setStorageData(fs._readFileStorage, modulePath, [null, instance._prevContents]);
  }

  static storageContainsFile(storage, modulePath) {
    const storageIsMap = typeof Map !== 'undefined' && storage.data instanceof Map;

    if (storageIsMap) { // enhanced-resolve@3.4.0 or greater
      return storage.data.has(modulePath);
    } else { // enhanced-resolve@3.3.0 or lower
      return storage.data[modulePath];
    }
  }

  static setStorageData(storage, modulePath, value) {
    const storageIsMap = typeof Map !== 'undefined' && storage.data instanceof Map;

    if (storageIsMap) { // enhanced-resolve@3.4.0 or greater
      storage.data.set(modulePath, value);
    } else { // enhanced-resolve@3.3.0 or lower
      storage.data[modulePath] = value;
    }
  }

  static statsDate(inputDate) {
    if (!inputDate) {
      inputDate = new Date();
    }
    return inputDate.toString();
  }

  static createStats(options) {
    if (!options) {
      options = {};
    }
    if (!options.ctime) {
      options.ctime = VirtualModulePluginDynamic.statsDate();
    }
    if (!options.mtime) {
      options.mtime = VirtualModulePluginDynamic.statsDate();
    }
    if (!options.size) {
      options.size = 0;
    }
    if (!options.size && options.contents) {
      options.size = options.contents.length;
    }
    return new VirtualStats({
      dev: 8675309,
      nlink: 1,
      uid: 501,
      gid: 20,
      rdev: 0,
      blksize: 4096,
      ino: 44700000,
      mode: 33188,
      size: options.size,
      atime: options.mtime,
      mtime: options.mtime,
      ctime: options.ctime,
      birthtime: options.ctime,
    });
  }
}

module.exports = VirtualModulePluginDynamic;
