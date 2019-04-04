/**
 * @param chartOptions.project
 *            phantasus.Project
 * @param chartOptions.getVisibleTrackNames
 *            {Function}
 */
phantasus.ChartTool = function (chartOptions) {
  var _this = this;
  this.getVisibleTrackNames = chartOptions.getVisibleTrackNames;
  this.project = chartOptions.project;
  var project = this.project;
  this.$el = $('<div class="container-fluid">'
    + '<div class="row" style="height: 100%">'
    + '<div data-name="configPane" class="col-xs-2"></div>'
    + '<div class="col-xs-10" style="height: 90%"><div style="position:relative; height: 100%" data-name="chartDiv"></div></div>'
    + '</div></div>');

  var formBuilder = new phantasus.FormBuilder({
    formStyle: 'vertical'
  });
  this.formBuilder = formBuilder;
  formBuilder.append({
    name: 'chart_type',
    type: 'bootstrap-select',
    options: ["row profile", "column profile", 'boxplot']
  });
  var rowOptions = [];
  var columnOptions = [];
  var numericRowOptions = [];
  var numericColumnOptions = [];
  var unitedColumnsRowsOptions = [];
  var options = [];
  var numericOptions = [];
  var updateOptions = function () {
    var dataset = project.getFullDataset();
    rowOptions = [{
      name: '(None)',
      value: ''
    }];
    columnOptions = [{
      name: '(None)',
      value: ''
    }];
    numericRowOptions = [{
      name: '(None)',
      value: ''
    }];
    numericColumnOptions = [{
      name: '(None)',
      value: ''
    }];
    options = [{
      name: '(None)',
      value: ''
    }];
    numericOptions = [{
      name: '(None)',
      value: ''
    }];

    phantasus.MetadataUtil.getMetadataNames(dataset.getRowMetadata())
      .forEach(
        function (name) {
          var dataType = phantasus.VectorUtil
            .getDataType(dataset.getRowMetadata()
              .getByName(name));
          if (dataType === 'number'
            || dataType === '[number]') {
            numericRowOptions.push({
              name: name + ' (row)',
              value: name + '_r'
            });
          }
          rowOptions.push({
            name: name + ' (row)',
            value: name + '_r'
          });
        });

    phantasus.MetadataUtil.getMetadataNames(dataset.getColumnMetadata())
      .forEach(
        function (name) {
          var dataType = phantasus.VectorUtil
            .getDataType(dataset.getColumnMetadata()
              .getByName(name));
          if (dataType === 'number'
            || dataType === '[number]') {
            numericColumnOptions.push({
              name: name + ' (column)',
              value: name + '_c'
            });
          }
          columnOptions.push({
            name: name + ' (column)',
            value: name + '_c'
          });
        });

    options = options.concat(rowOptions.slice(1));
    options = options.concat(columnOptions.slice(1));

    numericOptions = numericOptions.concat(numericRowOptions.slice(1));
    numericOptions = numericOptions.concat(numericColumnOptions.slice(1));

    unitedColumnsRowsOptions = columnOptions.concat(rowOptions.slice(1));
  };


  updateOptions();

  formBuilder.append({
    name: 'group_by',
    type: 'bootstrap-select',
    options: unitedColumnsRowsOptions
  });

  formBuilder.append({
    name: 'box_show_points',
    type: 'bootstrap-select',
    options: [{name: '(None)', value: ""}, 'all', 'outliers'],
    title: 'Show points'
  });

  formBuilder.append({
    name: 'axis_label',
    type: 'bootstrap-select',
    options: rowOptions
  });
  formBuilder.append({
    name: 'show_points',
    type: 'checkbox',
    value: true
  });
  formBuilder.append({
    name: 'show_lines',
    type: 'checkbox',
    value: true
  });
  formBuilder.append({
    name: 'add_profile',
    type: 'bootstrap-select',
    options: [{
      name: "(None)",
      value: ""
    },{
      name: "mean",
      value: "mean"
    }, {
      name: "median",
      value: "median"
    }]
  });

  formBuilder.append({
    name: 'color',
    type: 'bootstrap-select',
    options: unitedColumnsRowsOptions
  });

  formBuilder.append({
    name: 'tooltip',
    type: 'bootstrap-select',
    multiple: true,
    search: true,
    options: options.slice(1)
  });

  formBuilder.append({
    name: "adjust_data",
    title: "Adjust Data",
    type: 'collapsed-checkboxes',
    showLabel: false,
    checkboxes: [{
      name: 'log2'
    }, {
      name: 'z-score',
      title: 'Z-Score'
    }]
  });

  formBuilder.append({
    name: 'export_to_SVG',
    type: 'button'
  });


  function setVisibility() {
    var chartType = formBuilder.getValue('chart_type');
    formBuilder.setVisible('axis_label', chartType !== 'boxplot');
    formBuilder.setVisible('color', chartType !== 'boxplot');
    formBuilder.setVisible('tooltip', chartType !== 'boxplot');
    formBuilder.setVisible('add_profile', chartType !== 'boxplot');
    formBuilder.setVisible('show_points', chartType !== 'boxplot');
    formBuilder.setVisible('show_lines', chartType !== 'boxplot');
    formBuilder.setVisible('group_by', chartType === 'boxplot');
    formBuilder.setVisible('box_show_points', chartType === 'boxplot');

    if (chartType === 'column profile' || chartType === 'row profile') {
      formBuilder.setOptions('axis_label', chartType === 'column profile' ? rowOptions : columnOptions,
        true);
    }


  }

  this.tooltip = [];
  var draw = _.debounce(this.draw.bind(this), 100);
  formBuilder.$form.on('change', 'select', function (e) {
    if ($(this).attr('name') === 'tooltip') {
      var tooltipVal = _this.formBuilder.getValue('tooltip');
      _this.tooltip.length = 0; // clear array
      if (tooltipVal != null) {
        tooltipVal.forEach(function (tip) {
          _this.tooltip.push(phantasus.ChartTool.getVectorInfo(tip));
        });
      }
    } else {
      setVisibility();
      draw();
    }
  });

  formBuilder.$form.on('click', 'input[type=checkbox]', function (e) {
    draw();
  });

  setVisibility();

  var selectionChanged = function () {
    var selected = project.getRowSelectionModel().count();
    if (selected >= 100) {
      if (!phantasus.ChartTool.prototype.warningShown) {
        phantasus.FormBuilder.showInModal({
          title: 'Warning',
          html: 'Selected 100 or more genes in dataset. Lines and points of profile were automatically disabled due performance concerns. Process with caution.',
          z: 10000
        });
        phantasus.ChartTool.prototype.warningShown = true;
      }

      formBuilder.setValue('show_points', false);
      formBuilder.setValue('show_lines', false);
    }

    draw();
  };

  var trackChanged = function () {
    updateOptions();
    setVisibility();
    selectionChanged();
    formBuilder.setOptions('group_columns_by', options, true);
    formBuilder.setOptions('group_rows_by', options, true);
  };

  project.getColumnSelectionModel().on('selectionChanged.chart', selectionChanged);
  project.getRowSelectionModel().on('selectionChanged.chart', selectionChanged);
  project.on('trackChanged.chart', trackChanged);

  var $dialog = $('<div style="background:white;" title="Chart"></div>');
  var $configPane = this.$el.find('[data-name=configPane]');
  this.$chart = this.$el.find('[data-name=chartDiv]');
  var $chart = $('<div></div>');
  $chart.appendTo(this.$chart);
  formBuilder.$form.appendTo($configPane);
  this.$el.appendTo($dialog);

  this.exportButton = this.$el.find('button[name=export_to_SVG]');
  this.exportButton.on('click', function () {
    var svgs = _this.$el.find("svg");
    if (svgs.length < 1) {
      throw Error('Chart is not ready. Cannot export')
    }

    var svgx = svgs[0].cloneNode(true);
    svgs[1].childNodes.forEach(function (x) {
      svgx.appendChild(x.cloneNode(true));
    });
    $(svgx).find('.drag').remove();
    phantasus.Util.saveAsSVG(svgx, "chart.svg");
  });

  $dialog.dialog({
    dialogClass: 'phantasus',
    close: function (event, ui) {
      event.stopPropagation();
      $(this).dialog('destroy');
      project.off('trackChanged.chart', trackChanged);
      project.getRowSelectionModel().off('selectionChanged.chart', draw);
      project.getColumnSelectionModel().off('selectionChanged.chart',
        draw);
    },

    resizable: true,
    height: 580,
    width: 900
  });
  this.$dialog = $dialog;
  this.draw();
};

phantasus.ChartTool.BUTTONS_TO_REMOVE_FOR_STATIC_CHART = ['select2d', 'lasso2d']; // ['zoom2d', 'pan2d', 'select2d', 'lasso2d', 'autoScale2d', 'resetScale2d'];
phantasus.ChartTool.getPlotlyDefaults = function () {
  var layout = {
    hovermode: 'closest',
    autosize: true,
    // paper_bgcolor: 'rgb(255,255,255)',
    // plot_bgcolor: 'rgb(229,229,229)',
    showlegend: false,
    margin: {
      b: 40,
      l: 60,
      t: 25,
      r: 10,
      autoexpand: true
    },
    titlefont: {
      size: 12
    },
    xaxis: {
      zeroline: false,
      titlefont: {
        size: 12
      },
      // gridcolor: 'rgb(255,255,255)',
      showgrid: true,
      //   showline: true,
      showticklabels: true,
      tickcolor: 'rgb(127,127,127)',
      ticks: 'outside'
    },
    yaxis: {
      zeroline: false,
      titlefont: {
        size: 12
      },
      // gridcolor: 'rgb(255,255,255)',
      showgrid: true,
      //   showline: true,
      showticklabels: true,
      tickcolor: 'rgb(127,127,127)',
      ticks: 'outside'
    }
  };

  var config = {
    modeBarButtonsToAdd: [],
    showLink: false,
    displayModeBar: true, // always show modebar
    displaylogo: false,
    staticPlot: false,
    showHints: true,
    doubleClick: "reset",
    modeBarButtonsToRemove: ['sendDataToCloud', 'zoomIn2d', 'zoomOut2d', 'hoverCompareCartesian', 'hoverClosestCartesian', 'autoScale2d']
  };
  return {
    layout: layout,
    config: config
  };
};

phantasus.ChartTool.getVectorInfo = function (value) {
  var field = value.substring(0, value.length - 2);
  var isColumns = value.substring(value.length - 2) === '_c';
  return {
    field: field,
    isColumns: isColumns
  };
};

phantasus.ChartTool.specialProfilers = {
  mean: function (rowView) {
    return phantasus.Mean(rowView);
  },
  median: function (rowView) {
    return phantasus.Percentile(rowView, 50);
  }
};

phantasus.ChartTool.prototype = {
  warningShown: false,
  _createProfile: function (options) {
    var dataset = options.dataset;
    var _this = this;
    // only allow coloring by row

    var colorByVector = options.colorByVector;
    var colorModel = options.colorModel;
    var axisLabelVector = options.axisLabelVector;
    var addProfile = options.addProfile;
    var isColumnChart = options.isColumnChart;
    var colorByInfo = options.colorByInfo;
    var traceMode = [
      options.showLines ? 'lines' : '',
      options.showPoints ? 'markers' : ''
    ] .filter(function (val) { return val.length; })
      .join('+') || 'none';

    var heatmap = this.heatmap;
    var uniqColors = {};
    var myPlot = options.myPlot;
    var xmin = 0,
      xmax = 0,
      ymin = 0,
      ymax = 0;

    var traces = [];
    var ticktext = [];
    var tickvals = [];
    var color = undefined;

    if (traceMode !== 'none') {
      if (colorByVector) {
        _.each(phantasus.VectorUtil.toArray(colorByVector), function (value) {
          if (!uniqColors[value]) {
            if (colorModel.containsDiscreteColor(colorByVector, value)
              && colorByVector.getProperties().get(phantasus.VectorKeys.DISCRETE)) {
              uniqColors[value] = colorModel.getMappedValue(colorByVector, value);
            } else if (colorModel.isContinuous(colorByVector)) {
              uniqColors[value] = colorModel.getContinuousMappedValue(colorByVector, value);
            } else {
              uniqColors[value] = phantasus.VectorColorModel.CATEGORY_ALL[_.size(uniqColors) % 60];
            }
          }

          return uniqColors[value]
        });

        _.each(uniqColors, function (color, categoryName) {
          categoryName = phantasus.Util.chunk(categoryName, 10).join('<br>');
          traces.push({
            x: [1000000], y: [1000000],
            marker: {
              fillcolor: color,
              color: color,
              size: 10
            },
            name: categoryName,
            legendgroup: 'colors',
            mode: "markers",
            type: "scatter",
            showlegend: true,
            invisiblePoint: true
          });
        });
      }

      for (var i = 0, nrows = dataset.getRowCount(); i < nrows; i++) {
        // each row is a new trace
        var x = [];
        var y = [];
        var text = [];
        var size = 6;

        if (colorByVector) {
          if (colorByInfo.isColumns === isColumnChart) {
            color = uniqColors[colorByVector.getValue(i)];
          } else {
            color = [];
            for (var j = 0, ncols = dataset.getColumnCount(); j < ncols; j++) {
              color.push(uniqColors[colorByVector.getValue(j)])
            }
          }
        }


        for (var j = 0, ncols = dataset.getColumnCount(); j < ncols; j++) {
          x.push(j);
          y.push(dataset.getValue(i, j));

          var obj = {
            i: i,
            j: j
          };
          obj.toString = function () {
            var s = [];
            for (var tipIndex = 0; tipIndex < _this.tooltip.length; tipIndex++) {
              var tip = _this.tooltip[tipIndex];
              if (tip.isColumns) {
                phantasus.HeatMapTooltipProvider.vectorToString(dataset.getColumnMetadata().getByName(tip.field),
                  this.j, s, '<br>');
              } else {
                phantasus.HeatMapTooltipProvider.vectorToString(dataset.getRowMetadata().getByName(tip.field),
                  this.i, s, '<br>');
              }
            }

            return s.join('');

          };

          text.push(obj);
        }

        var trace = {
          x: x,
          y: y,
          name: colorByVector ? colorByVector.getValue(i) : '',
          tickmode: 'array',
          marker: {
            size: size,
            symbol: 'circle',
            color: color
          },
          text: text,
          mode: traceMode,
          type: 'scatter',
          showlegend: false
        };

        if (colorByVector && colorByInfo.isColumns !== isColumnChart) {
          trace.marker.size = 10;
          trace.line = {
            color: 'rgba(125,125,125,0.35)',
          }
        }

        traces.push(trace);
      }
    }

    if (addProfile) {
      var moddedX = [];
      var moddedY = [];
      var rowView = new phantasus.DatasetColumnView(dataset);

      for (var idx = 0, size = dataset.getColumnCount(); idx < size; idx++) {
        rowView.setIndex(idx);
        var val = phantasus.ChartTool.specialProfilers[addProfile](rowView);
        moddedY.push(val);
        moddedX.push(idx);
      }

      _.each(traces, function (trace) {
        if (trace.showlegend) return;
        trace.opacity = 0.3;
        trace.line = trace.line || {};
        trace.line.color = colorByInfo.isColumns !== isColumnChart ? 'rgb(125,125,125);' : trace.line.color;
      });

      traces.push({
        x: moddedX,
        y: moddedY,
        name: addProfile,
        tickmode: 'array',
        marker: {
          color: _.isArray(color) && _.size(color) > 1 ? color : 'rgb(100,100,100)',
          shape: 'cross',
          size: 10
        },
        line: {
          color: 'rgb(100,100,100)',
          width: 4
        },
        mode: 'lines',
        type: 'scatter',
        showlegend: true,
        legendgroup: 'added_profile'
      });
    }

    _.each(traces, function (trace) {
      if (trace.invisiblePoint) return;
      xmin = Math.min(xmin, _.min(trace.x));
      xmax = Math.max(xmax, _.max(trace.x));
      ymin = Math.min(ymin, _.min(trace.y));
      ymax = Math.max(ymax, _.max(trace.y));
    });

    for (var j = 0, ncols = dataset.getColumnCount(); j < ncols; j++) {
      ticktext.push(axisLabelVector != null ? axisLabelVector.getValue(j) : '' + j);
      tickvals.push(j);
    }

    options.layout.xaxis.tickvals = tickvals;
    options.layout.xaxis.ticktext = ticktext;
    options.layout.xaxis.range = [xmin - (xmax - xmin) * 0.15, xmax + (xmax - xmin) * 0.15];
    options.layout.xaxis.tickmode = 'array';
    options.layout.yaxis.range = [ymin - (ymax - ymin) * 0.15, ymax + (ymax - ymin) * 0.15];
    var $parent = $(myPlot).parent();
    options.layout.width = $parent.width();
    options.layout.height = this.$dialog.height() - 30;
    phantasus.ChartTool.newPlot(myPlot, traces, options.layout, options.config);
    // myPlot.on('plotly_selected', function (eventData) {
    //   selection = eventData;
    // });
    myPlot.on('plotly_legendclick', function () {
      return false;
    });

    myPlot.on('plotly_legenddoubleclick', function () {
      return false;
    });

    var resize = _.debounce(function () {
      var width = $parent.width();
      var height = _this.$dialog.height() - 30;
      Plotly.relayout(myPlot, {
        width: width,
        height: height
      });
    }, 500);

    this.$dialog.on('dialogresize', resize);
    $(myPlot).on('remove', function () {
      _this.$dialog.off('dialogresize');
    });

  },
  _createBoxPlot: function (options) {
    var _this = this;
    var showPoints = options.showPoints;
    var myPlot = options.myPlot;
    var datasets = options.datasets;
    var colors = options.colors;
    var ids = options.ids;
    var boxData = [];

    for (var k = 0, ndatasets = datasets.length; k < ndatasets; k++) {
      var dataset = datasets[k];
      var id = ids[k];
      var values = new Float32Array(dataset.getRowCount() * dataset.getColumnCount());
      var counter = 0;
      for (var i = 0, nrows = dataset.getRowCount(); i < nrows; i++) {
        for (var j = 0, ncols = dataset.getColumnCount(); j < ncols; j++) {
          var value = dataset.getValue(i, j);
          if (!isNaN(value)) {
            values[counter] = value;
            counter++;
          }
        }
      }
      if (counter !== values.length) {
        values = values.slice(0, counter);
      }
      values.sort();
      boxData.push(values);
    }

    var $parent = $(myPlot).parent();
    options.layout.width = $parent.width();
    options.layout.height = this.$dialog.height() - 30;

    var traces = boxData.map(function (box, index) {
      var trace = {
        y: box,
        type: 'box',
        hoverinfo: 'y+text',
        boxpoints: showPoints,
        name: ids[index],
        marker: {
          color: colors[index]
        }
      };

      if (showPoints === 'all') {
        trace.pointpos = -1.8;
        trace.jitter = 0.3;
      }

      return trace;
    });

    phantasus.ChartTool.newPlot(myPlot, traces, options.layout, options.config);

    var resize = _.debounce(function () {
      var width = $parent.width();
      var height = _this.$dialog.height() - 30;
      Plotly.relayout(myPlot, {
        width: width,
        height: height
      });
    }, 500);

    this.$dialog.on('dialogresize', resize);
    $(myPlot).on('remove', function () {
      _this.$dialog.off('dialogresize');
    });
  },
  draw: function () {
    var _this = this;
    this.$chart.empty();
    var myPlot = this.$chart[0];
    var plotlyDefaults = phantasus.ChartTool.getPlotlyDefaults();
    var layout = plotlyDefaults.layout;
    var config = plotlyDefaults.config;
    var boxShowPoints = this.formBuilder.getValue('box_show_points');

    var showPoints = this.formBuilder.getValue('show_points');
    var showLines = this.formBuilder.getValue('show_lines');
    var showOutliers = this.formBuilder.getValue('show_outliers');
    var addProfile = this.formBuilder.getValue('add_profile');
    var adjustData = this.formBuilder.getValue('adjust_data');

    var axisLabel = this.formBuilder.getValue('axis_label');
    var colorBy = this.formBuilder.getValue('color');
    var chartType = this.formBuilder.getValue('chart_type');

    var dataset;
    if (_.size(adjustData)) {
      var log2 = adjustData.indexOf('log2') !== -1;
      var zScore = adjustData.indexOf('z-score') !== -1;

      var tempheatmap = new phantasus.HeatMap({
        dummy: true,
        dataset: this.project.getSelectedDataset({
          emptyToAll: false
        })
      });

      dataset = new phantasus.AdjustDataTool().execute({
        heatMap: tempheatmap,
        project: tempheatmap.getProject(),
        rawDataset: true,
        input: {
          log_2: log2,
          'z-score': zScore
        }
      });
    } else {
      dataset = this.project.getSelectedDataset({
        emptyToAll: false
      });
    }

    this.dataset = dataset;
    if (dataset.getRowCount() === 0 && dataset.getColumnCount() === 0) {
      $('<h4>Please select rows and columns in the heat map.</h4>')
        .appendTo(this.$chart);
      return;
    } else if (dataset.getRowCount() === 0) {
      $('<h4>Please select rows in the heat map.</h4>')
        .appendTo(this.$chart);
      return;
    }
    if (dataset.getColumnCount() === 0) {
      $('<h4>Please select columns in the heat map.</h4>')
        .appendTo(this.$chart);
      return;
    }

    var groupBy = this.formBuilder.getValue('group_by');
    var colorByInfo = phantasus.ChartTool.getVectorInfo(colorBy);

    var colorModel = !colorByInfo.isColumns ?
      this.project.getRowColorModel() :
      this.project.getColumnColorModel();

    var axisLabelInfo = phantasus.ChartTool.getVectorInfo(axisLabel);
    var axisLabelVector = axisLabelInfo.isColumns ?
      dataset.getColumnMetadata().getByName(axisLabelInfo.field) :
      dataset.getRowMetadata().getByName(axisLabelInfo.field);


    var colorByVector = colorByInfo.isColumns ?
      dataset.getColumnMetadata().getByName(colorByInfo.field) :
      dataset.getRowMetadata().getByName(colorByInfo.field);


    if (chartType === 'row profile' || chartType === 'column profile') {
      showPoints = showPoints && (dataset.getRowCount() * dataset.getColumnCount()) <= 100000;
      if (chartType === 'column profile') {
        dataset = new phantasus.TransposedDatasetView(dataset);
      }
      this
        ._createProfile({
          showPoints: showPoints,
          showLines: showLines,
          isColumnChart: chartType === 'column profile',
          axisLabelVector: axisLabelVector,
          colorByVector: colorByVector,
          colorByInfo: colorByInfo,
          colorModel: colorModel,
          addProfile: addProfile,
          myPlot: myPlot,
          dataset: dataset,
          config: config,
          layout: $
            .extend(
              true,
              {},
              layout,
              {
                showlegend: true,
                margin: {
                  b: 80
                },
                yaxis: {},
                xaxis: {}
              })
        });
    } else {
      if (boxShowPoints === '') boxShowPoints = false;

      var datasets = [];//1-d array of datasets
      var ids = []; // 1-d array of grouping values
      var colors = [undefined];

      if (groupBy) {
        var groupByInfo = phantasus.ChartTool.getVectorInfo(groupBy);
        var vector = groupByInfo.isColumns ?
          dataset.getColumnMetadata().getByName(groupByInfo.field) :
          dataset.getRowMetadata().getByName(groupByInfo.field);

        var boxColorModel = !groupByInfo.isColumns ?
          this.project.getRowColorModel() :
          this.project.getColumnColorModel();

        var uniqColors = {};
        colors = [];
        _.each(phantasus.VectorUtil.toArray(vector), function (value) {
          if (!uniqColors[value]) {
            if (boxColorModel.containsDiscreteColor(vector, value)
              && vector.getProperties().get(phantasus.VectorKeys.DISCRETE)) {
              uniqColors[value] = boxColorModel.getMappedValue(vector, value);
            } else if (boxColorModel.isContinuous(vector)) {
              uniqColors[value] = boxColorModel.getContinuousMappedValue(vector, value);
            } else {
              uniqColors[value] = phantasus.VectorColorModel.CATEGORY_ALL[_.size(uniqColors) % 60];
            }
          }

          return uniqColors[value]
        });

        var valueToIndices = phantasus.VectorUtil.createValueToIndicesMap(vector, true);
        valueToIndices.forEach(function (indices, value) {
          datasets.push(new phantasus.SlicedDatasetView(dataset,
            groupByInfo.isColumns ? null : indices,
            groupByInfo.isColumns ? indices : null)
          );
          ids.push(value);
          colors.push(uniqColors[value]);
        });
      } else {
        datasets.push(dataset);
        ids.push('');
      }

      this._createBoxPlot({
        showPoints: boxShowPoints,
        myPlot: myPlot,
        datasets: datasets,
        colors: colors,
        ids: ids,
        layout: layout,
        config: config
      });
    }
  }
};

phantasus.ChartTool.newPlot = function (myPlot, traces, layout, config) {
  return Plotly.newPlot(myPlot, traces, layout, config);
};
