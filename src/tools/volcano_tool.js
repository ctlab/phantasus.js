phantasus.volcanoTool = function(heatmap, project) {
  var _this = this;

  var fullDataset = project.getFullDataset();
  _this.fullDataset = fullDataset;

  var selectedDataset = project.getSelectedDataset();
  _this.selectedDataset = selectedDataset;

  var rowMetaNames = phantasus.MetadataUtil.getMetadataNames(
    fullDataset.getRowMetadata()
  );

  var pValColname =
    rowMetaNames.indexOf("adj.P.Val") !== -1
      ? "adj.P.Val"
      : rowMetaNames.indexOf("padj") !== -1
      ? "padj"
      : null;
  var logfcColname =
    rowMetaNames.indexOf("logFC") !== -1
      ? "logFC"
      : rowMetaNames.indexOf("log2FoldChange") !== -1
      ? "log2FoldChange"
      : null;

  var numberFields = phantasus.MetadataUtil.getMetadataSignedNumericFields(
    fullDataset.getRowMetadata()
  );

  this.$dialog = $(
    '<div style="background:white;" title="' +
      this.toString() +
      '"><h4>Please select rows.</h4></div>'
  );
  this.$el = $(
    [
      '<div class="container-fluid" style="height: 100%">',
      ' <div class="row" style="height: 100%">',
      '   <div data-name="configPane" class="col-xs-2"></div>',
      '   <div class="col-xs-10" style="height: 100%">',
      '     <div style="position:relative; height: 100%;" data-name="chartDiv"></div>',
      " </div>",
      "</div>",
      "</div>"
    ].join("")
  );

  var $notifyRow = this.$dialog.find("h4");

  this.formBuilder = new phantasus.FormBuilder({
    formStyle: "vertical"
  });

  var rowOptions = [];
  var numericRowOptions = [];

  var updateOptions = function() {
    rowOptions = [
      {
        name: "(None)",
        value: ""
      }
    ];
    numericRowOptions = [
      {
        name: "(None)",
        value: ""
      }
    ];
    phantasus.MetadataUtil.getMetadataNames(
      fullDataset.getRowMetadata()
    ).forEach(function(name) {
      var dataType = phantasus.VectorUtil.getDataType(
        fullDataset.getRowMetadata().getByName(name)
      );
      if (dataType === "number" || dataType === "[number]") {
        numericRowOptions.push({
          name: name,
          value: name
        });
      }
      rowOptions.push({
        name: name,
        value: name
      });
    });
  };

  updateOptions();

  [
    {
      name: "p_value",
      type: "select",
      options: rowOptions,
      value: pValColname
    },
    {
      name: "logFC",
      type: "select",
      options: rowOptions,
      value: logfcColname
    },
    {
      name: "Adjusted_p_value_significance",
      value: "0.05",
      type: "text"
    },
    {
      name: "Absolute_logFC_significance",
      value: "1",
      type: "text"
    },
    {
      name: "label_by_selected",
      type: "checkbox",
      value: false
    },
    {
      name: "label",
      type: "select",
      options: rowOptions
    },
    {
      name: "tooltip",
      type: "bootstrap-select",
      multiple: true,
      search: true,
      options: rowOptions
    },
    {
      name: "advanced_options",
      type: "checkbox",
      value: false
    },
    {
      name: "shape",
      type: "select",
      options: rowOptions
    },
    {
      name: "size",
      type: "select",
      options: numericRowOptions
    },
    {
      type: "button",
      name: "export_to_SVG"
    }
  ].forEach(function(a) {
    _this.formBuilder.append(a);
  });

  function setVisibility() {
    var labelSelected = _this.formBuilder.getValue("label_by_selected");
    _this.formBuilder.setVisible("label", labelSelected);

    var advancedOptions = _this.formBuilder.getValue("advanced_options");
    _this.formBuilder.setVisible("size", advancedOptions);
    _this.formBuilder.setVisible("shape", advancedOptions);
  }

  this.tooltip = [];
  var draw = _.debounce(this.draw.bind(this), 100);
  var annotateLabel = this.annotateLabel.bind(this);
  _this.formBuilder.$form.on("change", "select,input", function(e) {
    if ($(this).attr("name") === "tooltip") {
      var tooltipVal = _this.formBuilder.getValue("tooltip");
      _this.tooltip.length = 0; // clear array
      if (tooltipVal != null) {
        _this.tooltip = tooltipVal;
      }
    } else if ($(this).attr("type") === "checkbox") {
      if ($(this).attr("name") === "label_by_selected") {
        annotateLabel();
      }
      setVisibility();
    } else if ($(this).attr("name") === "label") {
      setVisibility();
      annotateLabel();
    } else {
      setVisibility();
      draw();
    }
  });

  var onSelectedChange = _.debounce(function(e) {
    var selectedDataset = project.getSelectedDataset();
    _this.selectedDataset = selectedDataset;
    setVisibility();
    annotateLabel();
  }, 500);

  project.getRowSelectionModel().on('selectionChanged.chart', onSelectedChange);

  setVisibility();

  this.$chart = this.$el.find("[data-name=chartDiv]");
  var $dialog = $('<div style="background:white;" title="Chart"></div>');
  var $configPane = this.$el.find("[data-name=configPane]");
  _this.formBuilder.$form.appendTo($configPane);
  this.$el.appendTo($dialog);

  /// for saving svg
  this.exportButton = this.$el.find("button[name=export_to_SVG]");
  this.exportButton.toggle(false);
  this.exportButton.on("click", function() {
    var svgs = _this.$el.find(".main-svg");  
    var svgx = svgs[0].cloneNode(true);
    svgs[1].childNodes.forEach(function(x) {
      svgx.appendChild(x.cloneNode(true));
    });
    $(svgx)
      .find(".drag")
      .remove();
    var glCanvas = _this.$el.find(".gl-canvas"); 
    phantasus.Util.saveAsSVGGL({svgx: svgx, glCanvas: glCanvas[0]}, "volcano-plot.svg");
  });

  $dialog.dialog({
    close: function(event, ui) {
      project.getRowSelectionModel().off("selectionChanged.chart", onSelectedChange);
      $dialog.dialog("destroy").remove();
      event.stopPropagation();
      _this.volcano = null;
    },

    resizable: true,
    height: 620,
    width: 950
  });

  this.$dialog = $dialog;
  this.draw();
  this.exportButton.toggle(true);
};

phantasus.volcanoTool.getPlotlyDefaults = function() {
  var layout = {
    hovermode: "closest",
    autosize: true,
    // paper_bgcolor: 'rgb(255,255,255)',
    // plot_bgcolor: 'rgb(229,229,229)',
    showlegend: true,
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
      title: "log" + "2".sub() + "FC",
      zeroline: false,
      titlefont: {
        size: 14
      },
      // gridcolor: 'rgb(255,255,255)',
      showgrid: true,
      //   showline: true,
      showticklabels: true,
      tickcolor: "rgb(127,127,127)",
      ticks: "outside"
    },
    yaxis: {
      title: "-log" + "10".sub() + "(adj.P.Val)",
      zeroline: false,
      titlefont: {
        size: 14
      },
      // gridcolor: 'rgb(255,255,255)',
      showgrid: true,
      //   showline: true,
      showticklabels: true,
      tickcolor: "rgb(127,127,127)",
      ticks: "outside"
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
    modeBarButtonsToRemove: [
      "sendDataToCloud",
      "zoomIn2d",
      "zoomOut2d",
      "hoverCompareCartesian",
      "hoverClosestCartesian",
      "autoScale2d"
    ]
  };
  return {
    layout: layout,
    config: config
  };
};

phantasus.volcanoTool.prototype = {
  toString: function() {
    return "Volcano Plot";
  },
  getSignificant: function(logfcValues, pvalValues) {
    var _this = this;

    var pvalCutoff = _this.formBuilder.getValue(
      "Adjusted_p_value_significance"
    );
    var logfcCutoff = _this.formBuilder.getValue("Absolute_logFC_significance");

    let sigIndex = [];
    let nonSigIndex = [];
    logfcValues.map(Math.abs).forEach(function(a, i) {
      if (a >= logfcCutoff && pvalValues[i] <= pvalCutoff) sigIndex.push(i);
      else nonSigIndex.push(i);
    });
    return { sig: sigIndex, nonsig: nonSigIndex };
  },
  annotateLabel: function() {
    var _this = this;
    var fullDataset = _this.fullDataset;
    var selectedDataset = _this.selectedDataset;
    var parentDataset = selectedDataset.dataset;

    var myPlot = _this.myPlot;
    var data = _this.data;
    var config = _this.config;
    var layout = _this.layout;

    var labelBy = _this.formBuilder.getValue("label");
    var labelBySelected = _this.formBuilder.getValue("label_by_selected");
    var annotations = [];

    if (!labelBySelected) layout.annotations = [];
    else {
      if (labelBy.length > 0) {
        if (selectedDataset.getRowCount() == fullDataset.getRowCount()) {
          throw new Error(
            "Invalid amount of rows are selected (zero rows or whole dataset selected)"
          );
        }

        if (selectedDataset.getRowCount() > 1000) {
          throw new Error(
            "More than 1000 rows selected. Please select less rows"
          );
        }

        var idxs = selectedDataset.rowIndices.map(function(idx) {
          return parentDataset.rowIndices[idx];
        });

        var logFC_a = _this.plotFields[0].array;
        var pval_a = _this.plotFields[1].array;

        _.range(0, idxs.length).map(function(i) {
          annotations.push({
            x: logFC_a[idxs[i]],
            y: -Math.log10(pval_a[idxs[i]]),
            xref: "x",
            yref: "y",
            text: phantasus.VectorUtil.toArray(
              selectedDataset.getRowMetadata().getByName(labelBy)
            )[i],
            showarrow: true,
            arrowhead: 6,
            arrowsize: 0.3,
            arrowidth: 0.2,
            ax: 0,
            ay: -40
          });
        });
        layout.annotations = annotations;
      }
    }

    return phantasus.volcanoTool.react(myPlot, data, layout, config);
  },
  annotate: function() {
    var _this = this;
    var fullDataset = _this.fullDataset;
    var selectedDataset = _this.selectedDataset;

    var data = [];

    var pValColname = _this.formBuilder.getValue("p_value");
    var logfcColname = _this.formBuilder.getValue("logFC");

    if (!logfcColname || !pValColname) return { data: data, axisTitle: [] };

    _this.plotFields = phantasus.MetadataUtil.getVectors(
      fullDataset.getRowMetadata(),
      [logfcColname, pValColname]
    );

    var sizeBy = _this.formBuilder.getValue("size");
    var shapeBy = _this.formBuilder.getValue("shape");

    var sizeByVector = fullDataset.getRowMetadata().getByName(sizeBy);
    var shapeByVector = fullDataset.getRowMetadata().getByName(shapeBy);
    var size = sizeByVector ? [] : 8;
    var shapes = shapeByVector ? [] : null;

    if (sizeByVector) {
      var minMax = phantasus.VectorUtil.getMinMax(sizeByVector);
      var sizeFunction = d3.scale
        .linear()
        .domain([minMax.min, minMax.max])
        .range([3, 15])
        .clamp(true);

      size = _.map(phantasus.VectorUtil.toArray(sizeByVector), sizeFunction);
    }

    // TODO : give warning before running map
    if (shapeByVector) {
      var allShapes = [
        "circle",
        "square",
        "diamond",
        "cross",
        "triangle-up",
        "star",
        "hexagram",
        "bowtie",
        "diamond-cross",
        "hourglass",
        "hash-open"
      ];
      var uniqShapes = {};
      shapes = _.map(phantasus.VectorUtil.toArray(shapeByVector), function(
        value
      ) {
        if (!uniqShapes[value]) {
          uniqShapes[value] = allShapes[_.size(uniqShapes) % _.size(allShapes)];
        }

        return uniqShapes[value];
      });

      if (_.size(uniqShapes) > _.size(allShapes)) {
        phantasus.FormBuilder.showInModal({
          title: "Warning",
          html: "Too much factors for shapes. Repeating will occur"
        });
      }

      _.each(uniqShapes, function(shape, categoryName) {
        data.push({
          x: [1000],
          y: [1000],
          marker: {
            symbol: shape,
            color: "#0000newPlot00",
            size: 6
          },
          name: categoryName,
          legendgroup: "shapes",
          mode: "markers",
          type: "scattergl",
          showlegend: true
        });
      });
    }

    var text = [];
    for (var i = 0, nrows = fullDataset.getRowCount(); i < nrows; i++) {
      var obj = { i: i };
      obj.toString = function() {
        var s = [];
        for (var tipIndex = 0; tipIndex < _this.tooltip.length; tipIndex++) {
          var tip = _this.tooltip[tipIndex];
          phantasus.HeatMapTooltipProvider.vectorToString(
            fullDataset.getRowMetadata().getByName(tip),
            this.i,
            s,
            "<br>"
          );
        }
        return s.join("");
      };
      text.push(obj);
    }

    data.unshift(
      {
        marker: {
          color: "#CC0C00FF",
          size: size,
          symbol: shapes
        },
        name: "significant",
        type: "scattergl",
        mode: "markers",
        legendgroup: "significance",
        showlegend: true
      },
      {
        marker: {
          color: "#5C88DAFF",
          size: size,
          symbol: shapes
        },
        name: "non-significant",
        mode: "markers",
        type: "scattergl",
        legendgroup: "significance",
        showlegend: true
      }
    );

    var SigObj = _this.getSignificant(
      _this.plotFields[0].array,
      _this.plotFields[1].array
    );

    var logFC_a = _this.plotFields[0].array;
    var pval_a = _this.plotFields[1].array;

    data[0].x = SigObj["sig"].map(function(i) {
      return logFC_a[i];
    });
    data[0].y = SigObj["sig"]
      .map(function(i) {
        return pval_a[i];
      })
      .map(Math.log10)
      .map(function(x) {
        return -x;
      });
    data[0].text = SigObj["sig"].map(function(i) {
      return text[i];
    });

    data[1].x = SigObj["nonsig"].map(function(i) {
      return logFC_a[i];
    });
    data[1].y = SigObj["nonsig"]
      .map(function(i) {
        return pval_a[i];
      })
      .map(Math.log10)
      .map(function(x) {
        return -x;
      });
    data[1].text = SigObj["nonsig"].map(function(i) {
      return text[i];
    });

    return { data: data, axisTitle: [pValColname, logfcColname] };
  },
  draw: function() {
    var _this = this;
    var plotlyDefaults = phantasus.volcanoTool.getPlotlyDefaults();
    var layout = plotlyDefaults.layout;
    var config = plotlyDefaults.config;
    var myPlot = this.$chart[0];
    var dataAnnotate = _this.annotate();
    var data = dataAnnotate.data;
    var axisTitle = dataAnnotate.axisTitle;

    if (data.length === 0) {
      throw new Error(
        "Appropriate p-value or logFC columns not found. Please select columns"
      );
    }

    var xmin = _.min(data[0].x.concat(data[1].x)),
      xmax = _.max(data[0].x.concat(data[1].x)),
      ymin = _.min(data[0].y.concat(data[1].y)),
      ymax = _.max(data[0].y.concat(data[1].y));

    layout.xaxis.range = [
      xmin - (xmax - xmin) * 0.15,
      xmax + (xmax - xmin) * 0.15
    ];
    layout.yaxis.range = [
      ymin - (ymax - ymin) * 0.15,
      ymax + (ymax - ymin) * 0.15
    ];

    layout.xaxis.title = axisTitle[1];
    layout.yaxis.title = "-log" + "10".sub() + "(" + axisTitle[0] + ")";

    _this.myPlot = myPlot;
    _this.data = data;
    _this.layout = layout;
    _this.config = config;

    return phantasus.volcanoTool.newPlot(myPlot, data, layout, config);
  }
};

phantasus.volcanoTool.newPlot = function(myPlot, traces, layout, config) {
  return Plotly.newPlot(myPlot, traces, layout, config);
};

phantasus.volcanoTool.react = function(myPlot, traces, layout, config) {
  return Plotly.react(myPlot, traces, layout, config);
};
