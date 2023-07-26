/**
 *
 * @param options.dataRowStart
 * @param options.dataColumnStart
 * @constructor
 */
phantasus.TxtReader = function (options) {
  if (options == null) {
    options = {};
  }
  this.options = options;
};
phantasus.TxtReader.prototype = {
  read: function (fileOrUrl, callback) {
    var _this = this;
    var name = phantasus.Util.getBaseFileName(phantasus.Util
      .getFileName(fileOrUrl));
    phantasus.ArrayBufferReader.getArrayBuffer(fileOrUrl, function (err,
                                                                   arrayBuffer) {
      if (err) {
        callback(err);
      } else {
        try {
          callback(null, _this._read(name,
            new phantasus.ArrayBufferReader(new Uint8Array(
              arrayBuffer))));
        }
        catch (x) {
          callback(x);
        }
      }
    });

  },
  _read: function (datasetName, reader) {
    var dataColumnStart = this.options.dataColumnStart;
    var dataRowStart = this.options.dataRowStart;
    if (dataRowStart == null) {
      dataRowStart = 1;
    }
    var headerLine = reader.readLine();
    var separator = phantasus.Util.detectSeparator(headerLine);
    if (dataRowStart > 1) {
      for (var i = 1; i < dataRowStart; i++) {
        reader.readLine(); // skip
      }
    }
    var testLine = null;
    var rtrim = /\s+$/;
    var header = headerLine.trim().split(separator);

    if (dataColumnStart == null) { // try to figure out where data starts by finding 1st
      // numeric column
      
      testLine = reader.readLine().replace(rtrim, '');
      var tokens = testLine.split(separator);
      for (var i = 1; i < tokens.length; i++) {
        var token = tokens[i];
        if (token === '' || token === 'NA' || token === 'NaN' || $.isNumeric(token)) {
          dataColumnStart = i;
          break;
        }
      }

      if (dataColumnStart == null) {
        dataColumnStart = 1;
      }
    }

    var ncols = header.length - dataColumnStart;
    var matrix = [];
    var s;
    var arrayOfRowArrays = [];
    for (var i = 0; i < dataColumnStart; i++) {
      arrayOfRowArrays.push([]);
    }
    if (testLine != null) {
      var array = new Float32Array(ncols);
      matrix.push(array);
      var tokens = testLine.split(separator);
      for (var j = 0; j < dataColumnStart; j++) {
        // row metadata
        arrayOfRowArrays[j].push(phantasus.Util.copyString(tokens[j]));
      }
      for (var j = dataColumnStart, k = 0; k < ncols; j++, k++) {
        var token = tokens[j];
        array[j - dataColumnStart] = parseFloat(token);
      }
    }
    while ((s = reader.readLine()) !== null) {
      s = s.replace(rtrim, '');
      if (s !== '') {
        var array = new Float32Array(ncols);
        matrix.push(array);
        var tokens = s.split(separator);
        for (var j = 0; j < dataColumnStart; j++) {
          // row metadata
          arrayOfRowArrays[j].push(phantasus.Util.copyString(tokens[j]));
        }
        for (var j = dataColumnStart, k = 0; k < ncols; j++, k++) {
          var token = tokens[j];
          array[j - dataColumnStart] = parseFloat(token);
        }
      }
    }
    var dataset = new phantasus.Dataset({
      name: datasetName,
      rows: matrix.length,
      columns: ncols,
      array: matrix,
      dataType: 'Float32'
    });

    var columnIds = dataset.getColumnMetadata().add('id');
    for (var i = 0, j = dataColumnStart; i < ncols; i++, j++) {
      columnIds.setValue(i, phantasus.Util.copyString(header[j]));
    }
    var rowIdVector = dataset.getRowMetadata().add('id');
    rowIdVector.array = arrayOfRowArrays[0];
    // add additional row metadata
    for (var i = 1; i < dataColumnStart; i++) {
      var v = dataset.getRowMetadata().add(header[i]);
      v.array = arrayOfRowArrays[i];
    }

    return dataset;
  }
};
