
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
        self.execute(heatMap);
        self.$dialog.dialog('close');
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
          throw new Error("FGSEA returned 0 rows. Nothing to show");
        }

        self.openTab();
      });
    }, false, "::es")
      .fail(function () {
        throw new Error("Failed to perform FGSEA. Error:" + req.responseText);
      });
  },
  openTab: function () {
    var self = this;
    var template = [
      '<div><button class="button">Save as TSV</button></div>',
      '<div>' + this.generateTableHTML() + '</div>'
    ].join('');

    this.$el = $(template);
    this.$saveButton = this.$el.find('button');
    this.$saveButton.on('click', function () {
      var blob = new Blob([self.generateTSV()], {type: "text/plain;charset=utf-8"});
      saveAs(blob, self.parentHeatmap.getName() + "_FGSEA.txt");
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

        return '<tr>' + tableRow + '</tr>';
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
