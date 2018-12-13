phantasus.gseaTool = function (heatmap, project) {
  var self = this;

  var fullDataset = project.getFullDataset();
  var numberFields = phantasus.MetadataUtil.getMetadataSignedNumericFields(fullDataset
    .getRowMetadata());

  if (numberFields.length === 0) {
    throw new Error('No number fields available. Cannot rank by');
  }

  var rows = numberFields.map(function (field) {
    return field.getName();
  });


  var annotations = ['(None)'].concat(phantasus.MetadataUtil.getMetadataNames(fullDataset.getColumnMetadata()))

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
    name: 'rank_by',
    options: rows,
    value: _.first(rows),
    type: 'select'
  }, {
    name: 'vertical',
    type: 'checkbox',
    value: false
  }, {
    name: 'annotate_by',
    options: annotations,
    value: _.first(annotations),
    type: 'select'
  }, {
    type: 'button',
    name: 'export_to_SVG'
  }/*, {
    name: 'chart_width',
    type: 'range',
    value: 400,
    min: 60,
    max: 800,
    step: 10
  }, {
    name: 'chart_height',
    type: 'range',
    value: 400,
    min: 60,
    max: 800,
    step: 10
  }*/].forEach(function (a) {
    self.formBuilder.append(a);
  });

  var onChange = _.debounce(function (e) {
    var selectedDataset = project.getSelectedDataset();
    var fullDataset = project.getSortedFilteredDataset();
    $notifyRow.toggle(selectedDataset.getRowCount() === fullDataset.getRowCount());

    if (selectedDataset.getRowCount() === fullDataset.getRowCount()) {
      return;
    }

    if (self.promise) {
      self.promise.reject('Cancelled');
    }

    self.$configPane.find('button').css('display', 'none');
    self.request(heatmap, project).then(function (url) {
      self.url = url;
      self.draw(url);
      self.$configPane.find('button').css('display', 'block');
    }, function (e) {
      self.$chart.empty();
      self.$configPane.find('button').css('display', 'none');
    });
  }, 500);

  this.formBuilder.$form.on('change', 'select', onChange);
  this.formBuilder.$form.on('change', 'input', onChange);
  project.getRowSelectionModel().on('selectionChanged.chart', onChange);


  this.$configPane = this.$el.find('[data-name=configPane]');
  this.formBuilder.$form.appendTo(this.$configPane);
  this.$configPane.find('button').css('display', 'none');
  this.$el.appendTo(this.$dialog);
  this.$chart = this.$el.find("[data-name=chartDiv]");
  this.$dialog.dialog({
    open: function (event, ui) {
      $(this).css('overflow', 'hidden'); //this line does the actual hiding
    },
    close: function (event, ui) {
      project.getRowSelectionModel().off("selectionChanged.chart", onChange);
      self.$dialog.dialog('destroy').remove();
      event.stopPropagation();
    },

    resizable: true,
    height: 600,
    width: 900
  });

  this.$configPane.find('button').on('click', function () {
    var a = document.createElement("a");
    document.body.appendChild(a);
    a.style = "display: none";
    a.href = self.url;
    a.download = "gsea-plot.svg";
    a.click();
    setTimeout(function () {
      document.body.removeChild(a);
    }, 0)
  });

  onChange();
};

phantasus.gseaTool.prototype = {
  toString: function () {
    return 'GSEA Plot';
  },
  request: function (heatmap, project) {
    this.$chart.empty();
    phantasus.Util.createLoadingEl().appendTo(this.$chart);
    this.promise = $.Deferred();

    var selectedDataset = project.getSelectedDataset();
    var parentDataset = selectedDataset.dataset;

    var fullDataset = project.getFullDataset();

    if (selectedDataset.getRowCount() === fullDataset.getRowCount()) {
      this.promise.reject('Invalid rows');
      // throw new Error('Invalid amount of rows are selected (zero rows or whole dataset selected)');
        return this.promise;
    }

    var idxs = selectedDataset.rowIndices.map(function (idx) {
      return parentDataset.rowIndices[idx] + 1;
      //return idx + 1; // #' @param selectedGenes indexes of selected genes (starting from one, in the order of fData)
    });

    var self = this;
    var rankBy = this.formBuilder.getValue('rank_by');

    var vertical = this.formBuilder.getValue('vertical');


    var height = 4;//this.formBuilder.getValue('chart_height');
    var width = 6;//this.formBuilder.getValue('chart_width');
    if (vertical) {
        height = 6;
        width = 6;
    }

    var request = {
      rankBy: rankBy,
      selectedGenes: idxs,
      width: width,
      height: height,
      vertical: vertical,
      addHeatmap: true,
      pallete: heatmap.heatmap.colorScheme.getColors()
    };

    var annotateBy = this.formBuilder.getValue('annotate_by');

    if (annotateBy === "(None)") {
      request.width = width - 1;
    } else {
      request.showAnnotation = annotateBy;

      var colorByVector = fullDataset.getColumnMetadata().getByName(annotateBy) ;
      var colorModel = project.getColumnColorModel();
      var uniqColors = {};
      _.each(phantasus.VectorUtil.getValues(colorByVector), function (value) {
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
      });

      request.annotationColors = uniqColors;
    }

    fullDataset.getESSession().then(function (esSession) {
      request.es = esSession;

      ocpu.call('gseaPlot', request, function (session) {
        session.getObject(function (filenames) {
          var svgPath = JSON.parse(filenames)[0];
          var absolutePath = phantasus.Util.getFilePath(session, svgPath);
          phantasus.BlobFromPath.getFileObject(absolutePath, function (blob) {
            self.imageURL = URL.createObjectURL(blob);
            self.promise.resolve(self.imageURL);
          });
        });
      }, false, "::es")
        .fail(function () {
          self.promise.reject();
        });
    })

    return self.promise;
  },
  draw: function (url) {
    this.$chart.empty();
    var svg = $('<img src="' + url + '" style="max-width: 100%; height: 100%; position: absolute; margin: auto; top: 0; left: 0; right: 0; bottom: 0;">');
    svg.appendTo(this.$chart);

  }
};
