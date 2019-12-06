phantasus.volcanoTool = function (heatmap, project) {
    var self = this;
    var drawFunction = null;

    var fullDataset = project.getFullDataset();

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

    [{
      name: 'p_val_significance',
      value: '0.05',
      type: 'text'
    }, {
      name: 'logFC_significance',
      value: '2',
      type: 'text'
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
    self.formBuilder.$form.find("select").on("change", function (e) {
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
        project.off('trackChanged.chart', trackChanged);
        project.getRowSelectionModel().off('selectionChanged.chart', trackChanged);
        project.getColumnSelectionModel().off('selectionChanged.chart', trackChanged);
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


phantasus.volcanoTool.prototype = {
  toString: function () {
    return 'Volcano Plot';
  },
  draw: function(){
    var plotlyDefaults = phantasus.volcanoTool.getPlotlyDefaults();
    var layout = plotlyDefaults.layout;
    var config = plotlyDefaults.config;
    console.log("inside draw")
    var myPlot = this.$chart[0];
    //console.log(myPlot);
    console.log(this.plotFields)
    var traces = [{
      x: this.plotFields[0].array,
      y: this.plotFields[1].array,
      mode: 'markers',
      type: 'scatter'
    }];
    phantasus.volcanoTool.newPlot(myPlot, traces, layout, config);

  }
}

phantasus.volcanoTool.newPlot = function (myPlot, traces, layout, config) {
  return Plotly.newPlot(myPlot, traces, layout, config);
};