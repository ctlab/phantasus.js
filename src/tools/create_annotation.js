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
    var name = options.input.operation;
    var operation = this.operationDict[name];
    var selectedOnly = options.input.use_selected_rows_and_columns_only;
    var isColumns = options.input.annotate === 'Columns';
    var promise = $.Deferred();
    var args = {
      operation: name,
      isColumns: isColumns
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
    var vector = dataset.getRowMetadata().add(name);

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
          promise.resolve();
          phantasus.DatasetUtil.probeDataset(dataset).then(function (result) {console.log(result);});
        }, false, "::" + dataset.getESVariable())
        .fail(function () {
          promise.reject();
          throw new Error("Calculated annotation failed. See console");
        });
    });

    phantasus.VectorUtil.maybeConvertStringToNumber(vector);
    project.trigger('trackChanged', {
      vectors: [vector],
      display: ['text'],
      columns: isColumns
    });

    return promise;
  }
};
