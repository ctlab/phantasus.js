phantasus.volcanoTool = function (heatmap, project) {
    var self = this;
    var drawFunction = null;
    /// var project = this.project;

    var fullDataset = project.getFullDataset();
    self.fullDataset = fullDataset;
    //console.log('full', fullDataset.getRowMetadata());

    var rowMetaNames = phantasus.MetadataUtil.getMetadataNames(fullDataset.getRowMetadata());
    console.log(rowMetaNames)
    if(!(rowMetaNames.includes("logFC") && rowMetaNames.includes("adj.P.Val"))){
      throw new Error('logFC and adj.P.Val columns not found. Run Differential Expression perhaps');
    }

    var numberFields = phantasus.MetadataUtil.getMetadataSignedNumericFields(fullDataset
      .getRowMetadata());
      

    //console.log("numberFields", numberFields)

    if (numberFields.length === 0) {
      throw new Error('No fields in row annotation appropriate for ranking.');
    }

    // assign for use later while plotting 

    self.plotFields = phantasus.MetadataUtil.getVectors(fullDataset.getRowMetadata(),
                                                         ["logFC", "adj.P.Val"])

    /// get two columns from the dataset

    var rows = numberFields.map(function (field) {
      return field.getName();
    });
    console.log("rows", rows)


    var annotations = ['(None)'].concat(phantasus.MetadataUtil.getMetadataNames(fullDataset.getColumnMetadata()))

    console.log("annotations", annotations)

    this.$dialog = $('<div style="background:white;" title="' + this.toString() + '"><h4>Please select rows.</h4></div>');
    this.$el = $([
      '<div class="container-fluid" style="height: 100%">',
      ' <div class="row" style="height: 100%">',
      '   <div data-name="configPane" class="col-xs-2"></div>',
      '   <div class="col-xs-10" style="height: 100%">',
      '     <div style="position:relative; height: 100%;" data-name="chartDiv"></div>',
      ' </div>',
      '</div>',
      '</div>'].join('')
    );

    var $notifyRow = this.$dialog.find('h4');

    this.formBuilder = new phantasus.FormBuilder({
      formStyle: 'vertical'
    });

    var rowOptions = []; 
    var numericRowOptions = [];

    var updateOptions = function () {
      rowOptions = [{
        name: "(None)",
        value: ""
      }];
      numericRowOptions = [{
        name: "(None)",
        value: ""
      }];
      phantasus.MetadataUtil.getMetadataNames(fullDataset.getRowMetadata())
      .forEach(
        function (name) {
          var dataType = phantasus.VectorUtil
            .getDataType(fullDataset.getRowMetadata()
              .getByName(name));
          if (dataType === "number"
            || dataType === "[number]") {
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

    [{
      name: 'p_val_significance',
      value: '0.05',
      type: 'text'
    }, {
      name: 'logFC_significance',
      value: '2',
      type: 'text'
    }, {
      name: 'shape',
      type: 'select',
      options: rowOptions
    }, {
      name: 'size',
      type: 'select',
      options: numericRowOptions,
    }, {
      name: 'annotate_by',
      options: annotations,
      value: _.first(annotations),
      type: 'select'
    }, {
      type: 'button',
      name: 'export_to_SVG'
    }].forEach(function (a) {
      self.formBuilder.append(a);
    });


    console.log("appended to form form builder")
    function setVisibility() {
      self.formBuilder.setOptions("annotate_by", rowMetaNames, true);
    }

    this.tooltip = [];
    var draw = this.draw.bind(this);
    self.formBuilder.$form.find('select,input').on("change", function (e) {
      console.log("something changed")
      setVisibility();
      draw();
    });
    setVisibility();

    // var trackChanged = function () {
    //   //// console.log("track changed");
    //   //updateOptions();
    //   setVisibility();
    //   formBuilder.setOptions("x-axis", pcaOptions, true);
    //   formBuilder.setOptions("y-axis", pcaOptions, true);
    // };

    // project.getColumnSelectionModel().on("selectionChanged.chart", trackChanged);
    // project.getRowSelectionModel().on("selectionChanged.chart", trackChanged);
    // project.on("trackChanged.chart", trackChanged);
    this.$chart = this.$el.find("[data-name=chartDiv]");
    var $dialog = $('<div style="background:white;" title="Chart"></div>');
    var $configPane = this.$el.find('[data-name=configPane]');
    self.formBuilder.$form.appendTo($configPane);
    this.$el.appendTo($dialog);

    /// for saving svg
    this.exportButton = this.$el.find('button[name=export_to_SVG]');
    this.exportButton.toggle(false);
    this.exportButton.on('click', function () {
      var svgs = _this.$el.find(".main-svg");
      var svgx = svgs[0].cloneNode(true);
      svgs[1].childNodes.forEach(function (x) {
        svgx.appendChild(x.cloneNode(true));
      });
      $(svgx).find('.drag').remove();
      phantasus.Util.saveAsSVG(svgx, "volcano-plot.svg");
    });

    $dialog.dialog({
      close: function (event, ui) {
        // project.off('trackChanged.chart', trackChanged);
        // project.getRowSelectionModel().off('selectionChanged.chart', trackChanged);
        // project.getColumnSelectionModel().off('selectionChanged.chart', trackChanged);
        $dialog.dialog('destroy').remove();
        event.stopPropagation();
        self.volcano = null;
      },

      resizable: true,
      height: 620,
      width: 950
    });
    
    this.$dialog = $dialog;
    this.draw();
  };


phantasus.volcanoTool.getPlotlyDefaults = function(){
  var layout = {
    hovermode: 'closest',
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
    congetSignificantfig: config
  };
};


phantasus.volcanoTool.prototype = {
  toString: function () {
    return 'Volcano Plot';
  },
  getSignificant: function(logFC_array, pval_array){
    var _this = this

    var pvalCutoff = _this.formBuilder.getValue('p_val_significance');
    var logFCcutoff = _this.formBuilder.getValue('logFC_significance');

    console.log("cutoffs")
    console.log(pvalCutoff, logFCcutoff)

    let sig_index = []
    let non_sig_index = []
    logFC_array.map(Math.abs).forEach(function(a, i) {
      if(a>=logFCcutoff && pval_array[i] <= pvalCutoff)
        sig_index.push(i)
      else
        non_sig_index.push(i)
    });
    return({'sig':sig_index, 'non_sig': non_sig_index})
  },
  annotate: function() {

    var _this = this;
    console.log("inside annotate")
    var fullDataset = _this.fullDataset;
    console.log(_this.fullDataset)
    /// var fullDataset = _this.project.getFullDataset();
    var data = [];
    var sizeBy = _this.formBuilder.getValue('size');
    var shapeBy = _this.formBuilder.getValue('shape');

    console.log("options")
    console.log(sizeBy, shapeBy);

    var sizeByVector = fullDataset.getRowMetadata().getByName(sizeBy);
    var shapeByVector = fullDataset.getRowMetadata().getByName(shapeBy);

    var size = sizeByVector ? [] : 8;
    var shapes = shapeByVector ? [] : null;

    if (sizeByVector) {
      var minMax = phantasus.VectorUtil.getMinMax(sizeByVector);
      console.log("MinMax", minMax);
      var sizeFunction = d3.scale.linear()
          .domain([minMax.min, minMax.max])
          .range([3, 15])
          .clamp(true);

        size = _.map(phantasus.VectorUtil.toArray(sizeByVector), sizeFunction);
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
          x: [], y: [],
          marker: {
            symbol: shape,
            color: '#000000',
            size: 6
          },
          name: categoryName,
          legendgroup: 'shapes',
          mode: "markers",
          type: "scatter",
          showlegend: true
        });
      });
    }

    data.unshift({
      marker: {
        color: "blue",
        size: size,
        symbol: shapes
      },
      name: "",
      type: "scatter",
      mode: "markers",
      showlegend: false
    });

    data.unshift({
      marker: {
        color: "red",
        size: size,
        symbol: shapes
      },
      name: "",
      mode: "markers",
      type: "scatter",
      showlegend: false
    });

    console.log(data);

    var SigObj =  _this.getSignificant(_this.plotFields[0].array, _this.plotFields[1].array)
    console.log("Sig")

    var logFC_a = _this.plotFields[0].array;
    var pval_a = _this.plotFields[1].array

    data[0].x = SigObj["sig"].map(function(i) {return(logFC_a[i])})
    data[0].y = SigObj["sig"].map(function(i) {return(pval_a[i])}).map(Math.log10).map(function(x) {return(-x)})

    data[1].x = SigObj["non_sig"].map(function(i) {return(logFC_a[i])})
    data[1].y = SigObj["non_sig"].map(function(i) {return(pval_a[i])}).map(Math.log10).map(function(x) {return(-x)})

    /// var non_signifcant_trace = {
    ///   x : SigObj["non_sig"].map(function(i) {return(logFC_a[i])}),
    ///   y : SigObj["non_sig"].map(function(i) {return(pval_a[i])}).map(Math.log10).map(function(x) {return(-x)}),
    ///   mode: 'markers',
    ///   type: 'scatter',
    ///   color: 'blue'
    /// }
    return data;
    //traces.push()
  },
  draw: function(){
    var _this = this; 
    console.log("inside draw")
    console.log(this.project)
    //console.log(_this.project.getFullDataset());
    console.log("loaded")
    var plotlyDefaults = phantasus.volcanoTool.getPlotlyDefaults();
    var layout = plotlyDefaults.layout;
    var config = plotlyDefaults.config;
    console.log("inside draw")
    var myPlot = this.$chart[0];
    var traces = _this.annotate()
    //console.log(myPlot);
    return(phantasus.volcanoTool.newPlot(myPlot, traces, layout, config));
  }
}

phantasus.volcanoTool.newPlot = function (myPlot, traces, layout, config) {
  return Plotly.newPlot(myPlot, traces, layout, config);
};