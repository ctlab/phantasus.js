
phantasus.initFGSEATool = function (options) {
  if (!phantasus.fgseaTool.init) {
    var $el = $('<div style="background:white;" title="Init"><h5>Loading FGSEA meta information</h5></div>');
    phantasus.Util.createLoadingEl().appendTo($el);
    $el.dialog({
      resizable: false,
      height: 150,
      width: 300
    });

    var req = ocpu.call("availableFGSEADatabases", {}, function (newSession) {
      newSession.getObject(function (success) {
        var result = JSON.parse(success);
        phantasus.fgseaTool.init = true;

        phantasus.fgseaTool.dbs = result;
        $el.dialog('destroy').remove();
        new phantasus.fgseaTool(options.heatMap);
      })
    });

    req.fail(function () {
      $el.dialog('destroy').remove();
      throw new Error("Couldn't load FGSEA meta information. Please try again in a moment. Error:" + req.responseText);
    });
  } else {
    new phantasus.fgseaTool(options.heatMap);
  }
};

phantasus.fgseaTool = function (heatMap) {
  var self = this;

  var project = heatMap.getProject();
  var fullDataset = project.getFullDataset();
  var numberFields = phantasus.MetadataUtil.getMetadataSignedNumericFields(fullDataset
    .getRowMetadata());

  if (numberFields.length === 0) {
    throw new Error('No fields in row annotation appropriate for ranking.');
  }

  var rankRows = numberFields.map(function (field) {
    return field.getName();
  });

  var rows = phantasus.MetadataUtil.getMetadataNames(fullDataset
    .getRowMetadata(), true);

  this.$dialog = $('<div style="background:white;" title="' + phantasus.fgseaTool.prototype.toString() + '"></div>');

  this.formBuilder = new phantasus.FormBuilder({
    formStyle: 'vertical'
  });
  this.formBuilder.appendContent('<h4>Please select rows.</h4>');

  [{
    name: 'pathway_database',
    options: phantasus.fgseaTool.dbs,
    value: _.first(phantasus.fgseaTool.dbs),
    type: 'select'
  },{
    name: 'rank_by',
    options: rankRows,
    value: _.first(rankRows),
    type: 'select'
  }, {
    name: 'column_with_gene_ID',
    options: rows,
    value: _.first(rows),
    type: 'select'
  }].forEach(function (a) {
    self.formBuilder.append(a);
  });

  var $notifyRow = this.$dialog.find('h4');
  this.formBuilder.$form.appendTo(this.$dialog);
  this.$dialog.dialog({
    open: function (event, ui) {
    },
    close: function (event, ui) {
      self.$dialog.dialog('destroy').remove();
      event.stopPropagation();
    },
    buttons: {
      "Submit": function () {
        var promise = self.execute(heatMap);
        self.$dialog.dialog('close');
        phantasus.Util.customToolWaiter(promise, phantasus.fgseaTool.prototype.toString(), heatMap);
      },
      "Cancel": function () {
        self.$dialog.dialog('close');
      }
    },

    resizable: true,
    height: 400,
    width: 600
  });
};

phantasus.fgseaTool.prototype = {
  init: false,
  dbs: [],
  toString: function () {
    return "Perform FGSEA"
  },
  execute: function (heatMap) {
    var self = this;
    var promise = $.Deferred();
    this.parentHeatmap = heatMap;

    var dataset = heatMap.getProject().getSelectedDataset();
    var rankBy = this.formBuilder.getValue('rank_by');
    var geneIDColumn = this.formBuilder.getValue('column_with_gene_ID');

    var rankRequest = {
      genes: phantasus.VectorUtil.toArray(dataset.getRowMetadata().getByName(geneIDColumn)),
      ranks: phantasus.VectorUtil.toArray(dataset.getRowMetadata().getByName(rankBy))
    };

    var request = {
      dbName: this.formBuilder.getValue('pathway_database'),
      ranks: rankRequest
    };
    this.dbName = request.dbName;

    var req = ocpu.call('performFGSEA', request, function (session) {
      self.session = session;
      session.getObject(function (result) {
        self.fgsea = JSON.parse(result);
        if (_.size(self.fgsea) === 0) {
          promise.reject();
          throw new Error("FGSEA returned 0 rows. Nothing to show");
        }


        promise.resolve();
        self.openTab();
      });
    }, false, "::es")
      .fail(function () {
        promise.reject();
        throw new Error("Failed to perform FGSEA. Error:" + req.responseText);
      });

    return promise;
  },
  openTab: function () {
    var self = this;
    var template = [
      '<div class="container-fluid">',
        '<div class="row">',
          '<div class="col-sm-12">',
            '<label class="control-label">Actions:</label>',
            '<div><button class="btn btn-default">Save as TSV</button></div>',
          '</div>',
        '</div>',
        '<div class="row">',
          '<div class="col-sm-9">',
            '<label class="control-label">FGSEA:</label>',
            '<div>' + this.generateTableHTML() + '</div>',
          '</div>',
          '<div class="col-sm-3">',
            '<label class="control-label">Pathway detail:</label>',
            '<div id="pathway-detail" style="word-break: break-all">Hint: Click on pathway name to get list of genes in it</div>',
          '</div>',
        '</div>',
      '</div>'
    ].join('');

    this.$el = $(template);
    this.$saveButton = this.$el.find('button');
    this.$saveButton.on('click', function () {
      var blob = new Blob([self.generateTSV()], {type: "text/plain;charset=utf-8"});
      saveAs(blob, self.parentHeatmap.getName() + "_FGSEA.txt");
    });

    this.$pathwayDetail = this.$el.find('#pathway-detail');

    this.$table = this.$el.find('table');
    this.$table.on('click', 'tbody tr', function (e) {
      var pathway = $(e.currentTarget).children().first().text();
      var request = {
        dbName: self.dbName,
        pathwayName: pathway
      };

      self.$pathwayDetail.empty();
      phantasus.Util.createLoadingEl().appendTo(self.$pathwayDetail);

      var req = ocpu.call('queryPathway', request, function (session) {
        session.getObject(function (success) {
          var pathwayGenes = JSON.parse(success);
          self.$pathwayDetail.empty();

          var pathwayDetail = $([
            '<div>',
              '<strong>Pathway name:</strong>' + pathway + '<br>',
              '<strong>Pathway genes:</strong>' + pathwayGenes.join(','),
            '</div>'
          ].join(''));

          pathwayDetail.appendTo(self.$pathwayDetail);
        });
      });

      req.fail(function () {

      });
    });

    this.tab = this.parentHeatmap.tabManager.add({
      $el: this.$el,
      closeable: true,
      rename: false,
      title: this.parentHeatmap.getName() + "_FGSEA",
      object: this,
      focus: true
    });
    this.tabId = this.id;
    this.$tabPanel = this.$panel;
  },
  generateTSV: function () {
    var headerNames = Object.keys(_.first(this.fgsea));
    var result = headerNames.join(',') + '\n';

    result += this.fgsea.map(function (pathway) {
      return Object.values(pathway).map(function (value) {
        return (_.isArray(value)) ? value.join(',') : value.toString();
      }).join('\t');
    }).join('\n');

    return result;
  },
  generateTableHTML: function () {
    var tableHeaderNames = Object.keys(_.first(this.fgsea));

    var thead = tableHeaderNames
      .map(function (name) { return '<th>' + name + '</th>'; })
      .join('');

    var tbody = this.fgsea
      .map(function (pathway) {
        var values = Object.values(pathway);
        var tableRow = values.map(function (value) {
          var result = '<td>';
          result += (_.isArray(value)) ? value.join(', ') : value.toString();
          result += '</td>';

          return result;
        }).join('');

        return '<tr class="c-pointer">' + tableRow + '</tr>';
      })
      .join('');

    var table = [
      '<table id="fgsea-table" class="table table-hover table-striped table-condensed">',
      '<thead>' + thead + '</thead>',
      '<tbody>' + tbody + '</tbody>',
      '</table>'
    ].join('');


    return table;
  }
};
