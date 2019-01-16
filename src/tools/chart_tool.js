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
    + '<div class="row">'
    + '<div data-name="configPane" class="col-xs-2"></div>'
    + '<div class="col-xs-10"><div style="position:relative;" data-name="chartDiv"></div></div>'
    + '</div></div>');

  var formBuilder = new phantasus.FormBuilder({
    formStyle: 'vertical'
  });
  this.formBuilder = formBuilder;
  formBuilder.append({
    name: 'chart_type',
    type: 'bootstrap-select',
    options: ['row' +
    ' profile', 'column' +
    ' profile']
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
    options: options
  });

  formBuilder.append({
    name: 'size',
    type: 'bootstrap-select',
    options: numericOptions
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
    options: [{
      name: 'log2',
      value: 'log2'
    }, {
      name: 'Z-Score',
      value: 'z-score',
    }],
    type: 'bootstrap-select',
    multiple: true,
    search: true
  });

  formBuilder.append({
    name: 'export_to_SVG',
    type: 'button'
  });


  function setVisibility() {
    var chartType = formBuilder.getValue('chart_type');
    formBuilder.setOptions('axis_label', chartType === 'column profile' ? rowOptions : columnOptions,
      true);
    formBuilder.setOptions('color', chartType === 'column profile' ? columnOptions : rowOptions, true);
    formBuilder.setOptions('size', chartType === 'row profile' ? numericColumnOptions : numericRowOptions, true);
  }

  this.tooltip = [];
  var draw = _.debounce(this.draw.bind(this), 100);
  formBuilder.$form.on('change', 'select', function (e) {
      setVisibility();
      draw();
  });

  formBuilder.$form.on('click', 'input[type=checkbox]', function (e) {
    draw();
  });

  setVisibility();

  var trackChanged = function () {
    updateOptions();
    setVisibility();
    formBuilder.setOptions('group_columns_by', options, true);
    formBuilder.setOptions('group_rows_by', options, true);
  };

  project.getColumnSelectionModel().on('selectionChanged.chart', draw);
  project.getRowSelectionModel().on('selectionChanged.chart', draw);
  project.on('trackChanged.chart', trackChanged);

  var $dialog = $('<div style="background:white;" title="Chart"></div>');
  var $configPane = this.$el.find('[data-name=configPane]');
  this.$chart = this.$el.find('[data-name=chartDiv]');
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
      project.off('trackChanged.chart', trackChanged);
      project.getRowSelectionModel().off('selectionChanged.chart', draw);
      project.getColumnSelectionModel().off('selectionChanged.chart',
        draw);
      _this.$el.empty();
    },

    resizable: true,
    height: 800,
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

  _createProfile: function (options) {
    var dataset = options.dataset;
    var _this = this;
    // only allow coloring by row

    var colorByVector = options.colorByVector;
    var colorModel = options.colorModel;
    var sizeByVector = options.sizeByVector;
    var sizeFunction = options.sizeFunction;
    var axisLabelVector = options.axisLabelVector;
    var addProfile = options.addProfile;
    var isColumnChart = options.isColumnChart;
    var colorByInfo = options.colorByInfo;
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

    if (colorByVector) {
      color = _.map(phantasus.VectorUtil.toArray(colorByVector), function (value) {
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
          showlegend: true
        });
      });
    }

    for (var j = 0, ncols = dataset.getColumnCount(); j < ncols; j++) {
      ticktext.push(axisLabelVector != null ? axisLabelVector.getValue(j) : '' + j);
      tickvals.push(j);
    }

    for (var i = 0, nrows = dataset.getRowCount(); i < nrows; i++) {
      // each row is a new trace
      var x = [];
      var y = [];
      var text = [];
      var size = sizeByVector ? [] : 6;
      var color = colorByVector ? uniqColors[colorByVector.getValue(i)] : undefined;

      for (var j = 0, ncols = dataset.getColumnCount(); j < ncols; j++) {
        x.push(j);
        y.push(dataset.getValue(i, j));

        if (sizeByVector) {
          var sizeByValue = sizeByVector.getValue(j);
          size.push(sizeFunction(sizeByValue));
        }
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

      xmin = Math.min(xmin, _.min(x));
      xmax = Math.max(xmax, _.max(x));
      ymin = Math.min(ymin, _.min(y));
      ymax = Math.max(ymax, _.max(y));
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
          mode: 'lines' + (options.showPoints ? '+markers' : ''
          ),
          type: 'scatter',
          showlegend: false
      };
      traces.push(trace);
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
        trace.opacity = 0.5;
      });

      traces.push({
        x: moddedX,
        y: moddedY,
        name: addProfile,
        tickmode: 'array',
        marker: {
          color: '#0571b0',
          shape: 'cross'
        },
        line: {
          width: 4
        },
        mode: 'lines+marker',
        type: 'scatter',
        showlegend: true
      });
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

    function resize() {
      var width = $parent.width();
      var height = _this.$dialog.height() - 30;
      Plotly.relayout(myPlot, {
        width: width,
        height: height
      });
    }

    this.$dialog.on('dialogresize', resize);
    $(myPlot).on('remove', function () {
      _this.$dialog.off('dialogresize');
    });

  },
  draw: function () {
    var _this = this;
    this.$chart.empty();
    var plotlyDefaults = phantasus.ChartTool.getPlotlyDefaults();
    var layout = plotlyDefaults.layout;
    var config = plotlyDefaults.config;
    var showPoints = this.formBuilder.getValue('show_points');
    var addProfile = this.formBuilder.getValue('add_profile');
    var adjustData = this.formBuilder.getValue('adjust_data');

    var axisLabel = this.formBuilder.getValue('axis_label');
    var colorBy = this.formBuilder.getValue('color');
    var sizeBy = this.formBuilder.getValue('size');
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

    var colorByInfo = phantasus.ChartTool.getVectorInfo(colorBy);
    var sizeByInfo = phantasus.ChartTool.getVectorInfo(sizeBy);
    var colorModel = !colorByInfo.isColumns ? this.project.getRowColorModel()
      : this.project.getColumnColorModel();
    var axisLabelInfo = phantasus.ChartTool.getVectorInfo(axisLabel);
    var axisLabelVector = axisLabelInfo.isColumns ?
      dataset.getColumnMetadata().getByName(axisLabelInfo.field) :
      dataset.getRowMetadata().getByName(axisLabelInfo.field);

    var sizeByVector = sizeByInfo.isColumns ?
      dataset.getColumnMetadata().getByName(sizeByInfo.field) :
      dataset.getRowMetadata().getByName(sizeByInfo.field);

    var colorByVector = colorByInfo.isColumns ?
      dataset.getColumnMetadata().getByName(colorByInfo.field) :
      dataset.getRowMetadata().getByName(colorByInfo.field);

    var sizeByScale = null;
    if (sizeByVector) {
      var minMax = phantasus.VectorUtil.getMinMax(sizeByVector);
      sizeByScale = d3.scale.linear().domain(
        [minMax.min, minMax.max]).range([3, 16])
        .clamp(true);
    }

    if (chartType === 'row profile' || chartType === 'column profile') {
      showPoints = showPoints && (dataset.getRowCount() * dataset.getColumnCount()) <= 100000;
      var $chart = $('<div></div>');
      var myPlot = $chart[0];
      $chart.appendTo(this.$chart);
      if (chartType === 'column profile') {
        dataset = new phantasus.TransposedDatasetView(dataset);
      }
      this
        ._createProfile({
          showPoints: showPoints,
          isColumnChart: chartType === 'column profile',
          axisLabelVector: axisLabelVector,
          colorByVector: colorByVector,
          colorByInfo: colorByInfo,
          colorModel: colorModel,
          sizeByVector: sizeByVector,
          sizeFunction: sizeByScale,
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
    }
  }
};

phantasus.ChartTool.newPlot = function (myPlot, traces, layout, config) {
  return Plotly.newPlot(myPlot, traces, layout, config);
};
