phantasus.AdjustDataTool = function () {
};
phantasus.AdjustDataTool.prototype = {
  toString: function () {
    return 'Adjust';
  },
  init: function (project, form) {
    var dataset = project.getFullDataset();
    var _this = this;

    var filterNumeric = function (metadata, currentName) {
      var meta = metadata.getByName(currentName);
      var type = phantasus.VectorUtil.getDataType(meta);
      return type === 'number' || type === 'integer' || type === 'real' || type === '[number]'
    };

    var numericRows = phantasus.MetadataUtil.getMetadataNames(dataset.getRowMetadata()).filter(filterNumeric.bind(null,dataset.getRowMetadata()));
    var numericColumns = phantasus.MetadataUtil.getMetadataNames(dataset.getColumnMetadata()).filter(filterNumeric.bind(null,dataset.getColumnMetadata()));

    var rows = ['(None)'].concat(numericRows);
    var columns = ['(None)'].concat(numericColumns);
    this.sweepRowColumnSelect = form.$form.find('[name=sweep-row-column]');
    this.sweepAction = form.$form.find('[name=sweep-action]');
    this.sweepTarget = form.$form.find('[name=sweep-target]');

    this.sweepTarget.on('change', function (e) {
      var mode = e.currentTarget.value;

      _this.sweepRowColumnSelect.empty();
      $.each(mode === 'row' ? rows : columns, function(key,value) {
        _this.sweepRowColumnSelect.append($("<option></option>")
          .attr("value", value).text(value));
      });
    });

    this.sweepAction.on('change', function (e) {
      var action = e.currentTarget.value;
      var firstDividerText = (function(op) {
        switch(op){  
        case 'Subtract':
          return 'from each'
        case 'Divide':
          return 'each'
        case 'Add':
          return 'to each'
        case 'Multiply':
          return 'each'
      }})(action);

      var secondDividerText = (function(op) {
        switch(op){  
        case 'Subtract':
          return 'field'
        case 'Divide':
          return 'by field'
        case 'Add':
          return 'field'
        case 'Multiply':
          return 'by field'
      }})(action);

      form.$form.find('#Sweep-first-divider').text(
        firstDividerText
      );
      form.$form.find('#Sweep-second-divider').text(
        secondDividerText
      );
    });

    form.$form.find('[name=scale_column_sum]').on('change', function (e) {
      form.setVisible('column_sum', form.getValue('scale_column_sum'));
    });

    form.setVisible('column_sum', false);
    this.sweepTarget.trigger('change');
  },
  gui: function () {
    // z-score, robust z-score, log2, inverse
    return [{
      name: 'warning',
      showLabel: false,
      type: 'custom',
      value: 'Operations are performed in order listed'
    }, {
      name: 'scale_column_sum',
      type: 'checkbox',
      help: 'Whether to scale each column sum to a specified value'
    }, {
      name: 'column_sum',
      type: 'text',
      style: 'max-width:150px;'
    }, {
      name: 'log_2',
      type: 'checkbox'
    }, {
      name: 'one_plus_log_2',
      type: 'checkbox',
      help: 'Take log2(1 + x)'
    }, {
      name: 'inverse_log_2',
      type: 'checkbox'
    }, {
      name: 'quantile_normalize',
      type: 'checkbox'
    }, {
      name: 'z-score',
      type: 'checkbox',
      help: 'Subtract mean, divide by standard deviation'
    }, {
      name: 'robust_z-score',
      type: 'checkbox',
      help: 'Subtract median, divide by median absolute deviation'
    }, {
      name: 'Sweep',
      type: 'triple-select',
      firstName: 'sweep-action',
      firstOptions: ['Divide', 'Subtract', 'Add', 'Multiply'],
      firstDivider: 'each',
      secondName: 'sweep-target',
      secondOptions: ['row', 'column'],
      secondDivider: 'by field:',
      thirdName: 'sweep-row-column',
      thirdOptions: [],
      comboboxStyle: 'display: inline-block; width: auto; padding: 0; margin-left: 2px; margin-right: 2px; height: 25px; max-width: 120px;',
      value: '',
      showLabel: false
    }];
  },
  execute: function (options) {
    var project = options.project;
    var heatMap = options.heatMap;

    var sweepBy = (_.size(this.sweepRowColumnSelect) > 0) ? this.sweepRowColumnSelect[0].value : '(None)';
    if (!options.input.log_2 &&
        !options.input.inverse_log_2 &&
        !options.input['z-score'] &&
        !options.input['robust_z-score'] &&
        !options.input.quantile_normalize &&
        !options.input.scale_column_sum &&
        !options.input.one_plus_log_2 &&
        sweepBy === '(None)') {
        // No action selected;
        return;
    }

    // clone the values 1st
    var sortedFilteredDataset = phantasus.DatasetUtil.copy(project
      .getSortedFilteredDataset());

    var rowIndices = project
      .getRowSelectionModel()
      .getViewIndices()
      .values().sort(
        function (a, b) {
          return (a === b ? 0 : (a < b ? -1 : 1));
        });

    if (rowIndices.length === 0) {
      rowIndices = null;
    }

    var columnIndices = project
      .getColumnSelectionModel()
      .getViewIndices()
      .values()
      .sort(
        function (a, b) {
          return (a === b ? 0 : (a < b ? -1 : 1));
        });

    if (columnIndices.length === 0) {
      columnIndices = null;
    }

    var dataset = sortedFilteredDataset;
    var rowView = new phantasus.DatasetRowView(dataset);
    var functions = {};

    if (options.input.scale_column_sum) {
      var scaleToValue = parseFloat(options.input.column_sum);
      functions.scaleColumnSum = scaleToValue;

      if (!isNaN(scaleToValue)) {
        for (var j = 0, ncols = dataset.getColumnCount(); j < ncols; j++) {
          var sum = 0;
          for (var i = 0, nrows = dataset.getRowCount(); i < nrows; i++) {
            var value = dataset.getValue(i, j);
            if (!isNaN(value)) {
              sum += value;
            }
          }
          var ratio = scaleToValue / sum;
          for (var i = 0, nrows = dataset.getRowCount(); i < nrows; i++) {
            var value = dataset.getValue(i, j);
            dataset.setValue(i, j, value * ratio);
          }
        }
      }
    }

    if (options.input.log_2) {
      functions.log2 = true;
      for (var i = 0, nrows = dataset.getRowCount(); i < nrows; i++) {
        for (var j = 0, ncols = dataset.getColumnCount(); j < ncols; j++) {
          dataset.setValue(i, j, phantasus.Log2(dataset.getValue(
            i, j)));
        }
      }
    }

    if (options.input.one_plus_log_2) {
      functions.onePlusLog2 = true;
      for (var i = 0, nrows = dataset.getRowCount(); i < nrows; i++) {
        for (var j = 0, ncols = dataset.getColumnCount(); j < ncols; j++) {
          dataset.setValue(i, j, phantasus.Log2(dataset.getValue(
            i, j) + 1));
        }
      }
    }

    if (options.input.inverse_log_2) {
      functions.inverseLog2 = true;
      for (var i = 0, nrows = dataset.getRowCount(); i < nrows; i++) {
        for (var j = 0, ncols = dataset.getColumnCount(); j < ncols; j++) {
          dataset.setValue(i, j, Math.pow(2, dataset.getValue(i, j)));
        }
      }
    }

    if (options.input.quantile_normalize) {
      functions.quantileNormalize = true;
      phantasus.QNorm.execute(dataset);
    }

    if (options.input['z-score']) {
      functions.zScore = true;
      for (var i = 0, nrows = dataset.getRowCount(); i < nrows; i++) {
        rowView.setIndex(i);
        var mean = phantasus.Mean(rowView);
        var stdev = Math.sqrt(phantasus.Variance(rowView));
        for (var j = 0, ncols = dataset.getColumnCount(); j < ncols; j++) {
          dataset.setValue(i, j, (dataset.getValue(i, j) - mean)
            / stdev);
        }
      }
    }

    if (options.input['robust_z-score']) {
      functions.robustZScore = true;
      for (var i = 0, nrows = dataset.getRowCount(); i < nrows; i++) {
        rowView.setIndex(i);
        var median = phantasus.Median(rowView);
        var mad = phantasus.MAD(rowView, median);
        for (var j = 0, ncols = dataset.getColumnCount(); j < ncols; j++) {
          dataset.setValue(i, j,
            (dataset.getValue(i, j) - median) / mad);
        }
      }
    }

    if (sweepBy !== '(None)') {
      functions.sweep = {};
      
      var op = (function(op) {
        switch(op){  
          case 'Subtract':
            return function (a,b) {return a - b; };
          case 'Divide':
            return function(a,b) {return a / b; };
          case 'Add':
            return function(a,b) {return a + b; };
          case 'Multiply':
            return function(a,b) {return a * b; };
        }})(this.sweepAction[0].value);

      var mode = this.sweepTarget[0].value;
      var sweepVector = mode === 'row' ?
        dataset.getRowMetadata().getByName(sweepBy) :
        dataset.getColumnMetadata().getByName(sweepBy);

      functions.sweep.mode = mode;
      functions.sweep.name = sweepBy;
      functions.sweep.op = (function(op) {
        switch(op) {
          case 'Subtract':
            return '-';
          case 'Divide':
            return '/';
          case 'Add':
            return '+';  
          case 'Multiply':
            return '*';
          }})(this.sweepAction[0].value);

      for (var j = 0, ncols = dataset.getColumnCount(); j < ncols; j++) {
        for (var i = 0, nrows = dataset.getRowCount(); i < nrows; i++) {
          var value = dataset.getValue(i, j);
          if (!isNaN(value)) {
            var operand = sweepVector.getValue(mode === 'row' ? i : j);
            dataset.setValue(i, j, op(value, operand));
          }
        }
      }
    }

    var currentSessionPromise = dataset.getESSession();

    if (currentSessionPromise) {
      dataset.setESSession(new Promise(function (resolve, reject) {
        currentSessionPromise.then(function (essession) {
          functions.es = essession;
          var req = ocpu.call("adjustDataset", functions, function (newSession) {
            resolve(newSession);
          }, false, "::es");


          req.fail(function () {
            reject();
            throw new Error("adjustDataset call to OpenCPU failed" + req.responseText);
          });
        });
      }));
    }

    if (options.rawDataset) {
      return dataset;
    }

    return new phantasus.HeatMap({
      name: heatMap.getName(),
      dataset: dataset,
      parent: heatMap,
      symmetric: project.isSymmetric() && dataset.getColumnCount() === dataset.getRowCount()
    });
  }
};
