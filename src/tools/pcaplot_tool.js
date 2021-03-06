phantasus.PcaPlotTool = function (chartOptions) {
  var _this = this;
  this.project = chartOptions.project;
  var project = this.project;
  var drawFunction = null;

  if (project.getFullDataset().getColumnCount() <= 1) {
    throw new Error("Not enough columns (at least 2 required)");
  }

  if (_.size(project.getRowFilter().enabledFilters) > 0 || _.size(project.getColumnFilter().enabledFilters) > 0) {
    phantasus.FormBuilder.showInModal({
      title: 'Warning',
      html: 'Your dataset is filtered.<br/>PCA Plot will apply to unfiltered dataset. Consider using New Heat Map tool.',
      z: 10000
    });
  }


  this.$el = $('<div class="container-fluid">'
    + '<div class="row">'
    + '<div data-name="configPane" class="col-xs-2"></div>'
    + '<div class="col-xs-10"><div style="position:relative;" data-name="chartDiv"></div></div>'
    + '<div class=""'
    + '</div></div>');

  var formBuilder = new phantasus.FormBuilder({
    formStyle: 'vertical'
  });
  this.formBuilder = formBuilder;
  var rowOptions = [];
  var columnOptions = [];
  var numericRowOptions = [];
  var numericColumnOptions = [];
  var options = [];
  var numericOptions = [];
  var pcaOptions = [];
  var naOptions = [{
    name: "mean",
    value: "mean"
  }, {
    name: "median",
    value: "median"
  }];
  var updateOptions = function () {
    var dataset = project.getFullDataset();
    rowOptions = [{
      name: "(None)",
      value: ""
    }];
    columnOptions = [{
      name: "(None)",
      value: ""
    }];
    numericRowOptions = [{
      name: "(None)",
      value: ""
    }];
    numericColumnOptions = [{
      name: "(None)",
      value: ""
    }];
    options = [{
      name: "(None)",
      value: ""
    }];
    numericOptions = [{
      name: "(None)",
      value: ""
    }];
    pcaOptions = [];

    for (var i = 1; i <= _this.project.getSelectedDataset().getColumnCount(); i++) {
      pcaOptions.push({
        name: "PC" + String(i),
        value: i - 1
      });
    }


    phantasus.MetadataUtil.getMetadataNames(dataset.getRowMetadata())
      .forEach(
        function (name) {
          var dataType = phantasus.VectorUtil
            .getDataType(dataset.getRowMetadata()
              .getByName(name));
          if (dataType === "number"
            || dataType === "[number]") {
            numericRowOptions.push({
              name: name + " (row)",
              value: name
            });
          }
          rowOptions.push({
            name: name + " (row)",
            value: name
          });
        });

    phantasus.MetadataUtil.getMetadataNames(dataset.getColumnMetadata())
      .forEach(
        function (name) {
          var dataType = phantasus.VectorUtil
            .getDataType(dataset.getColumnMetadata()
              .getByName(name));
          if (dataType === "number"
            || dataType === "[number]") {
            numericColumnOptions.push({
              name: name + " (column)",
              value: name
            });
          }
          columnOptions.push({
            name: name + " (column)",
            value: name
          });
        });
  };

  updateOptions();

  formBuilder.append({
    name: "size",
    type: "bootstrap-select",
    options: numericColumnOptions
  });
  formBuilder.append({
    name: 'shape',
    type: 'bootstrap-select',
    options: columnOptions
  });
  formBuilder.append({
    name: "color",
    type: "bootstrap-select",
    options: columnOptions
  });
  formBuilder.append({
    name: "x-axis",
    type: "bootstrap-select",
    options: pcaOptions,
    value: 0
  });
  formBuilder.append({
    name: "y-axis",
    type: "bootstrap-select",
    options: pcaOptions,
    value: 1
  });
  formBuilder.append({
    name: "label",
    type: "bootstrap-select",
    options: columnOptions,
    value: columnOptions.indexOf('title') ? 'title' : null
  });
  formBuilder.append({
    name: 'visible_labels',
    type: 'bootstrap-select',
    options: ['On', 'Off'],
    value: 'On'
  });
  formBuilder.append({
    name: 'export_to_SVG',
    type: 'button'
  });


  function setVisibility() {
    formBuilder.setOptions("color", columnOptions, true);
    formBuilder.setOptions("size", numericColumnOptions, true);
    formBuilder.setOptions("label", columnOptions, true);
  }

  this.tooltip = [];
  formBuilder.$form.find("select").on("change", function (e) {
    setVisibility();
    drawFunction();
  });
  setVisibility();

  var trackChanged = function () {
    //// console.log("track changed");
    updateOptions();
    setVisibility();
    formBuilder.setOptions("x-axis", pcaOptions, true);
    formBuilder.setOptions("y-axis", pcaOptions, true);
  };

  project.getColumnSelectionModel().on("selectionChanged.chart", trackChanged);
  project.getRowSelectionModel().on("selectionChanged.chart", trackChanged);
  project.on("trackChanged.chart", trackChanged);
  this.$chart = this.$el.find("[data-name=chartDiv]");
  var $dialog = $('<div style="background:white;" title="Chart"></div>');
  var $configPane = this.$el.find('[data-name=configPane]');
  formBuilder.$form.appendTo($configPane);
  this.$el.appendTo($dialog);

  this.exportButton = this.$el.find('button[name=export_to_SVG]');
  this.exportButton.toggle(false);
  this.exportButton.on('click', function () {
    var svgs = _this.$el.find(".main-svg");
    var svgx = svgs[0].cloneNode(true);
    svgs[1].childNodes.forEach(function (x) {
      svgx.appendChild(x.cloneNode(true));
    });
    $(svgx).find('.drag').remove();
    phantasus.Util.saveAsSVG(svgx, "pca-plot.svg");
  });

  $dialog.dialog({
    close: function (event, ui) {
      project.off('trackChanged.chart', trackChanged);
      project.getRowSelectionModel().off('selectionChanged.chart', trackChanged);
      project.getColumnSelectionModel().off('selectionChanged.chart', trackChanged);
      $dialog.dialog('destroy').remove();
      event.stopPropagation();
      _this.pca = null;
    },

    resizable: true,
    height: 620,
    width: 950
  });
  this.$dialog = $dialog;

  drawFunction = this.init();
  drawFunction();
};

phantasus.PcaPlotTool.getVectorInfo = function (value) {
  var field = value.substring(0, value.length - 2);
  var isColumns = value.substring(value.length - 2) === '_c';
  return {
    field: field,
    isColumns: isColumns
  };
};
phantasus.PcaPlotTool.prototype = {
  annotate: function (options) {
    var _this = this;
    var formBuilder = new phantasus.FormBuilder();
    formBuilder.append({
      name: 'annotation_name',
      type: 'text',
      required: true
    });
    formBuilder.append({
      name: 'annotation_value',
      type: 'text',
      required: true
    });
    phantasus.FormBuilder
      .showOkCancel({
        title: 'Annotate Selection',
        content: formBuilder.$form,
        okCallback: function () {
          var dataset = options.dataset;
          var eventData = options.eventData;
          var array = options.array;
          var value = formBuilder.getValue('annotation_value');
          var annotationName = formBuilder
            .getValue('annotation_name');
          // var annotate = formBuilder.getValue('annotate');
          var isRows = true;
          var isColumns = true;
          var existingRowVector = null;
          var rowVector = null;
          if (isRows) {
            existingRowVector = dataset.getRowMetadata()
              .getByName(annotationName);
            rowVector = dataset.getRowMetadata().add(
              annotationName);
          }
          var existingColumnVector = null;
          var columnVector = null;
          if (isColumns) {
            existingColumnVector = dataset.getColumnMetadata()
              .getByName(annotationName);
            columnVector = dataset.getColumnMetadata().add(
              annotationName);
          }

          for (var p = 0, nselected = eventData.points.length; p < nselected; p++) {
            var item = array[eventData.points[p].pointNumber];
            if (isRows) {
              if (_.isArray(item.row)) {
                item.row.forEach(function (r) {
                  rowVector.setValue(r, value);
                });

              } else {
                rowVector.setValue(item.row, value);
              }

            }
            if (isColumns) {
              columnVector.setValue(item.column, value);
            }
          }
          if (isRows) {
            phantasus.VectorUtil
              .maybeConvertStringToNumber(rowVector);
            _this.project.trigger('trackChanged', {
              vectors: [rowVector],
              display: existingRowVector != null ? []
                : [phantasus.VectorTrack.RENDER.TEXT],
              columns: false
            });
          }
          if (isColumns) {
            phantasus.VectorUtil
              .maybeConvertStringToNumber(columnVector);
            _this.project.trigger('trackChanged', {
              vectors: [columnVector],
              display: existingColumnVector != null ? []
                : [phantasus.VectorTrack.RENDER.TEXT],
              columns: true
            });
          }
        }
      });

  },
  init: function () {
    var _this = this;
    var dataset = _this.project.getFullDataset();

    return function () {
      _this.$chart.empty();

      var plotlyDefaults = phantasus.PcaPlotTool.getPlotlyDefaults();
      var data = [];
      var layout = plotlyDefaults.layout;
      var config = plotlyDefaults.config;

      var colorBy = _this.formBuilder.getValue('color');
      var sizeBy = _this.formBuilder.getValue('size');
      var shapeBy = _this.formBuilder.getValue('shape');
      var pc1 = _this.formBuilder.getValue('x-axis');
      var pc2 = _this.formBuilder.getValue('y-axis');
      var label = _this.formBuilder.getValue('label');
      var drawLabels = _this.formBuilder.getValue('visible_labels') === 'On';

      var getTrueVector = function (vector) {
        while (vector && vector.indices && vector.indices.length === 0) {
          vector = vector.v;
        }
        return vector;
      };

      var colorByVector = getTrueVector(dataset.getColumnMetadata().getByName(colorBy));
      var sizeByVector = getTrueVector(dataset.getColumnMetadata().getByName(sizeBy));
      var shapeByVector = getTrueVector(dataset.getColumnMetadata().getByName(shapeBy));
      var textByVector = getTrueVector(dataset.getColumnMetadata().getByName(label));

      _this.colorByVector = colorByVector;

      var na = 'mean';
      var color = colorByVector ? [] : null;
      var size = sizeByVector ? [] : 12;
      var shapes = shapeByVector ? [] : null;
      var text = null;


      if (sizeByVector) {
        var minMax = phantasus.VectorUtil.getMinMax(sizeByVector);
        var sizeFunction = d3.scale.linear()
          .domain([minMax.min, minMax.max])
          .range([6, 19])
          .clamp(true);

        size = _.map(phantasus.VectorUtil.toArray(sizeByVector), sizeFunction);
      }

      if (textByVector) {
        text = phantasus.VectorUtil.toArray(textByVector);
      }

      if (shapeByVector) {
        var allShapes = ['circle', 'square', 'diamond', 'cross', 'triangle-up', 'star', 'hexagram', 'bowtie', 'diamond-cross', 'hourglass', 'hash-open'];
        var uniqShapes = {};
        shapes = _.map(phantasus.VectorUtil.toArray(shapeByVector), function (value) {
          if (!uniqShapes[value]) {
            uniqShapes[value] = allShapes[_.size(uniqShapes) % _.size(allShapes)];
          }

          return uniqShapes[value]
        });

        if (_.size(uniqShapes) > _.size(allShapes)) {
          phantasus.FormBuilder.showInModal({
            title: 'Warning',
            html: 'Too much factors for shapes. Repeating will occur'
          });
        }

        _.each(uniqShapes, function (shape, categoryName) {
          data.push({
            x: [1000], y: [1000],
            marker: {
              symbol: shape,
              color: '#000000',
              size: 10
            },
            name: categoryName,
            legendgroup: 'shapes',
            mode: "markers",
            type: "scatter",
            showlegend: true
          });
        });
      }

      if (colorByVector) {
        var colorModel = _this.project.getColumnColorModel();
        var uniqColors = {};
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
          data.push({
            x: [1000], y: [1000],
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

      data.unshift({
        marker: {
          color: color,
          size: size,
          symbol: shapes
        },
        name: "",
        mode: drawLabels ? "markers+text" : "markers",
        text: text,
        textfont: {
          size: 11
        },
        textposition: "top right",
        type: "scatter",
        showlegend: false
      });

      var expressionSetPromise = dataset.getESSession();

      expressionSetPromise.then(function (essession) {
        var args = {
          es: essession,
          replacena: na
        };

        var drawResult = function () {
          data[0].x = _this.pca.pca[pc1];
          data[0].y = _this.pca.pca[pc2];

          layout.margin = {
            b: 40,
            l: 60,
            t: 25,
            r: 10
          };
          var xmin = _.min(data[0].x),
              xmax = _.max(data[0].x),
              ymin = _.min(data[0].y),
              ymax = _.max(data[0].y);

          layout.xaxis = {
            title: _this.pca.xlabs[pc1],
            range: [xmin - (xmax - xmin) * 0.15, xmax + (xmax - xmin) * 0.15],
            zeroline: false
          };
          layout.yaxis = {
            title: _this.pca.xlabs[pc2],
            range: [ymin - (ymax - ymin) * 0.15, ymax + (ymax - ymin) * 0.15],
            zeroline: false
          };
          layout.showlegend = true;
          var $chart = $('<div></div>');
          var plot = $chart[0];
          $chart.appendTo(_this.$chart);

          Plotly.newPlot(plot, data, layout, config).then(Plotly.annotate);
          _this.exportButton.toggle(true);

          plot.on('plotly_selected', function(eventData) {
            var indexes = new phantasus.Set();
            eventData.points.forEach(function (point) {
              indexes.add(point.pointIndex);
            });

            _this.project.getColumnSelectionModel().setViewIndices(indexes, true);
          });

        };

        if (!_this.pca) {
          var req = ocpu.call("calcPCA/print", args, function (session) {
              _this.pca = JSON.parse(session.txt);
              drawResult();
          }, false, "::es");
          req.fail(function () {
            new Error("PcaPlot call failed" + req.responseText);
          });
        } else {
          drawResult();
        }
      }).catch(function (reason) {
        alert("Problems occurred during transforming dataset to ExpressionSet\n" + reason);
      });

    };
  }
};


phantasus.PcaPlotTool.getPlotlyDefaults = function () {
  var layout = {
    hovermode: 'closest',
    autosize: true,
    // paper_bgcolor: 'rgb(255,255,255)',
    // plot_bgcolor: 'rgb(229,229,229)',
    showlegend: false,
    margin: {
      l: 80,
      r: 10,
      t: 8, // leave space for modebar
      b: 14,
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
