phantasus.GzReader = function (options) {
    this.readOptions = options;
};

phantasus.GzReader.prototype = {
  read: function (fileOrUrl, callback) {
    var _this = this;
    var name = phantasus.Util.getFileName(fileOrUrl);

    var dotIndex = name.lastIndexOf('.');
    if (dotIndex > 0) {
    name = name.substring(0, dotIndex);
    } 
    phantasus.ArrayBufferReader.getArrayBuffer(fileOrUrl, function (err,
                                                                   arrayBuffer) {
      if (err) {
        callback(err);
      } else {
        try {
          _this._read(name, arrayBuffer,callback);
        }
        catch (x) {
          callback(x);
        }
      }
    });
  },
  _read: function (unGzName, binData, cb) {
    const inflator = new pako.Inflate();
    inflator.push(binData);
    if (inflator.err) {
        console.log(inflator.msg);
    }
    var unGzFile = new File( [inflator.result], unGzName);
    var ext = phantasus.Util.getExtension(unGzName);
    var datasetReader = null;
    datasetReader = phantasus.DatasetUtil.getDatasetReader(ext, this.readOptions);
    if (datasetReader == null) {
      datasetReader = isFile ? (options.interactive ? new phantasus.Array2dReaderInteractive() : new phantasus.TxtReader()) : new phantasus.GctReader();
    }
    return datasetReader.read(unGzFile, cb);
    }
};
