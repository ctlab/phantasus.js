phantasus.GctWriter = function () {
  this.nf = phantasus.Util.createNumberFormat('.5g');
};

phantasus.GctWriter.idFirst = function (model) {
  var fields = ['id', 'Id', 'pr_id'];
  var idIndex = -1;
  for (var i = 0; i < fields.length; i++) {
    idIndex = phantasus.MetadataUtil.indexOf(model, fields[i]);
    if (idIndex !== -1) {
      break;
    }
  }
  if (idIndex !== -1) {
    var order = [];
    order[0] = idIndex;
    for (var i = 0, j = 1, count = model.getMetadataCount(); i < count; i++) {
      if (i !== idIndex) {
        order[j++] = i;
      }
    }
    return new phantasus.MetadataModelColumnView(model, order);
  }
  return model;
};

phantasus.GctWriter.prototype = {
  setNumberFormat: function (nf) {
    this.nf = nf;
  },
  getExtension: function () {
    return 'gct';
  },
  write: function (dataset, pw) {
    if (pw == null) {
      pw = [];
    }
    var rowMetadata = phantasus.GctWriter.idFirst(dataset.getRowMetadata());
    var columnMetadata = phantasus.GctWriter.idFirst(dataset
      .getColumnMetadata());
    this.writeHeader(rowMetadata, columnMetadata, pw);
    this.writeData(dataset, rowMetadata, pw);

    //console.log(this, dataset, pw);

    return pw.join('');
  },
  writeData: function (dataset, rowMetadata, pw) {
    //console.log("writeData")
    var ncols = dataset.getColumnCount();
    var rowMetadataCount = rowMetadata.getMetadataCount();
    var nf = this.nf;
    for (var i = 0, rows = dataset.getRowCount(); i < rows; i++) {
      for (var rowMetadataIndex = 0; rowMetadataIndex < rowMetadataCount; rowMetadataIndex++) {
        if (rowMetadataIndex > 0) {
          pw.push('\t');
        }
        var vector = rowMetadata.get(rowMetadataIndex);
        var value = vector.getValue(i);

        if (value !== null) {
          var toString = phantasus.VectorTrack.vectorToString(vector);
          pw.push(toString(value));
        }
      }
      for (var j = 0; j < ncols; j++) {
        pw.push('\t');
        var value = dataset.getValue(i, j);
        pw.push(nf(value));
      }
      pw.push('\n');
    }
  },
  writeHeader: function (rowMetadata, columnMetadata, pw) {
    var rows = rowMetadata.getItemCount();
    var ncols = columnMetadata.getItemCount();
    pw.push('#1.3\n');
    var rowMetadataCount = rowMetadata.getMetadataCount();
    pw.push(rows + '\t' + ncols + '\t' + (rowMetadataCount - 1) + '\t'
      + (columnMetadata.getMetadataCount() - 1));
    pw.push('\n');
    for (var i = 0; i < rowMetadataCount; i++) {
      if (i > 0) {
        pw.push('\t');
      }
      var name = rowMetadata.get(i).getName();
      if (i === 0 && name !== columnMetadata.get(0).getName()) {
        name = name + '/' + columnMetadata.get(0).getName();
      }
      pw.push(name);
    }
    var toString = phantasus.VectorTrack.vectorToString(columnMetadata.get(0));
    for (var j = 0; j < ncols; j++) {
      pw.push('\t');
      pw.push(toString(columnMetadata.get(0).getValue(j)));
    }
    pw.push('\n');
    for (var columnMetadataIndex = 1, metadataSize = columnMetadata
      .getMetadataCount(); columnMetadataIndex < metadataSize; columnMetadataIndex++) {
      pw.push(columnMetadata.get(columnMetadataIndex).getName());
      for (var i = 1; i < rowMetadataCount; i++) {
        pw.push('\t');
        pw.push('na');
      }
      for (var j = 0; j < ncols; j++) {
        pw.push('\t');
        var vector = columnMetadata.get(columnMetadataIndex);
        var value = vector.getValue(j);
        if (value != null) {
          toString = phantasus.VectorTrack.vectorToString(columnMetadata.get(j));
          pw.push(toString(value));
        }
      }
      pw.push('\n');
    }
  }
};
