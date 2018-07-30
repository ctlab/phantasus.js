phantasus.DatasetAdapter = function (dataset, rowMetadata, columnMetadata) {
  if (dataset == null) {
    throw 'dataset is null';
  }
  this.dataset = dataset;
  this.esSession = null;
  this.esVariable = null;
  this.rowMetadata = rowMetadata || dataset.getRowMetadata();
  this.columnMetadata = columnMetadata || dataset.getColumnMetadata();
  if (_.isEqual(this.rowMetadata, dataset.getRowMetadata()) && _.isEqual(this.columnMetadata, dataset.getColumnMetadata())) {
    this.esSession = new Promise(function (resolve) {resolve(dataset.getESSession())});
    this.esVariable = _.clone(this.dataset.getESVariable());
  }
};
phantasus.DatasetAdapter.prototype = {
  getDataset: function () {
    return this.dataset;
  },
  getName: function (seriesIndex) {
    return this.dataset.getName(seriesIndex);
  },
  setName: function (seriesIndex, name) {
    this.dataset.setName(seriesIndex, name);
  },
  getRowMetadata: function () {
    return this.rowMetadata;
  },
  getColumnMetadata: function () {
    return this.columnMetadata;
  },
  getRowCount: function () {
    return this.dataset.getRowCount();
  },
  getColumnCount: function () {
    return this.dataset.getColumnCount();
  },
  getValue: function (rowIndex, columnIndex, seriesIndex) {
    return this.dataset.getValue(rowIndex, columnIndex, seriesIndex);
  },
  setValue: function (rowIndex, columnIndex, value, seriesIndex) {
    this.dataset.setValue(rowIndex, columnIndex, value, seriesIndex);
  },
  addSeries: function (options) {
    return this.dataset.addSeries(options);
  },
  removeSeries: function (seriesIndex) {
    this.dataset.removeSeries(seriesIndex);
  },
  getSeriesCount: function () {
    return this.dataset.getSeriesCount();
  },
  getDataType: function (seriesIndex) {
    return this.dataset.getDataType(seriesIndex);
  },
  toString: function () {
    return this.dataset.toString();
  },
  getESSession: function () {
    return this.esSession;
  },
  setESSession: function (esSession) {
    this.esSession = esSession;
  },
  getESVariable: function () {
    return this.esVariable;
  },
  setESVariable: function (variable) {
    this.esVariable = variable;
  }
};
