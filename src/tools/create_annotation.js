phantasus.CreateAnnotation = function () {
};
phantasus.CreateAnnotation.prototype = {
  toString: function () {
    return 'Create Calculated Annotation';
  },
  gui: function () {
    this.operationDict = {
      'Mean': 'MEAN()',
      'MAD': 'MAD()',
      'Median': 'MEDIAN()',
      'Max': 'MAX()',
      'Min': 'MIN()',
      'Sum': 'SUM()',
    };

    return [{
        name: 'annotate',
        options: ['Columns', 'Rows'],
        value: 'Rows',
        type: 'radio'
      }, {
        name: 'annotation_name',
        value: '',
        type: 'text',
        help: 'Optional name. If not specified operation will be used as name',
        autocomplete: 'off'
      }, {
        name: 'operation',
        value: _.first(Object.keys(this.operationDict)),
        type: 'select',
        options: Object.keys(this.operationDict)
      }, {
        name: 'use_selected_rows_and_columns_only',
        type: 'checkbox'
      }];
  },
  execute: function (options) {
    var project = options.project;
    var opName = options.input.operation;
    var colName = options.input.annotation_name || opName;
    var operation = this.operationDict[opName];
    var selectedOnly = options.input.use_selected_rows_and_columns_only;
    var isColumns = options.input.annotate === 'Columns';
    var promise = $.Deferred();
    var args = {
      operation: opName,
      isColumns: isColumns,
      name: colName
    };
    var dataset = selectedOnly
      ? project.getSelectedDataset({
        selectedRows: true,
        selectedColumns: true,
      })
      : project.getFullDataset();

    if (selectedOnly) {
      var indices = phantasus.Util.getTrueIndices(dataset);
      args.columns = indices.columns;
      args.rows = indices.rows;
    }

    if (isColumns) {
      dataset = phantasus.DatasetUtil.transposedView(dataset);
    }

    var rowView = new phantasus.DatasetRowView(dataset);
    var vector = dataset.getRowMetadata().add(colName);

    var MAD = function () {
      return phantasus.MAD(rowView);
    };
    var MAX = function () {
      return phantasus.Max(rowView);
    };
    var MEAN = function () {
      return phantasus.Mean(rowView);
    };
    var MEDIAN = function (p) {
      return phantasus.Percentile(rowView, 50);
    };
    var MIN = function () {
      return phantasus.Min(rowView);
    };
    var SUM = function () {
      return phantasus.Sum(rowView);
    };
    var idx = 0;

    for (var size = dataset.getRowCount(); idx < size; idx++) {
      rowView.setIndex(idx);
      var val = eval(operation);
      vector.setValue(idx, val.valueOf());
    }

    dataset = project.getFullDataset();
    dataset.getESSession().then(function (esSession) {
      args.es = esSession;

      ocpu
        .call("calculatedAnnotation", args, function (newSession) {
          dataset.setESSession(new Promise(function (resolve) {resolve(newSession)}));
          dataset.setESVariable('es');
          phantasus.VectorUtil.maybeConvertStringToNumber(vector);
          project.trigger('trackChanged', {
            vectors: [vector],
            display: ['text'],
            columns: isColumns
          });
          promise.resolve();
        }, false, "::" + dataset.getESVariable())
        .fail(function () {
          promise.reject();
          throw new Error("Calculated annotation failed. See console");
        });
    });



    return promise;
  }
};
