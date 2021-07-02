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

    return [ {
        name: 'annotate',
        options: ['Columns', 'Rows'],
        value: 'Rows',
        type: 'radio'
      },{
        name: 'operation',
        value: _.first(Object.keys(this.operationDict)),
        type: 'select',
        options: Object.keys(this.operationDict)
      }, {
        name: 'annotation_name',
        value: '',
        type: 'text',
        help: 'Optional annotation name. If not specified, the operation name will be used.',
        autocomplete: 'off'
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

    var fullDataset = project.getFullDataset();
    var session = fullDataset.getESSession();

    fullDataset.setESSession(new Promise(function (resolve, reject) {
      session.then(function (esSession) {
        args.es = esSession;

        ocpu
          .call("calculatedAnnotation", args, function (newSession) {
            resolve(newSession);
          }, false, "::es")
          .fail(function () {
            reject();
            throw new Error("Calculated annotation failed. See console");
          });
      });
    }));

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
    vector.getProperties().set(phantasus.VectorKeys.DATA_TYPE, 'number');
    project.trigger('trackChanged', {
      vectors: [vector],
      display: ['text, continuous'],
      columns: isColumns
    });
  }
};
