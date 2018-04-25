var ENRICHR_URL = 'https://amp.pharm.mssm.edu/Enrichr/addList';
var ENRICHR_SUBMIT_LIMIT = 10000;

phantasus.enrichrTool = function (project) {
  var self = this;

  var dataset = project.getSortedFilteredDataset();
  var rows = phantasus.MetadataUtil.getMetadataNames(dataset
    .getRowMetadata(), true);

  var $dialog = $('<div style="background:white;" title="Submit to Enrichr"></div>');
  var form = new phantasus.FormBuilder({
    formStyle: 'vertical'
  });
  form.appendContent('<h4>Please select rows.</h4>');

  [{
    name: 'column_with_gene_symbols',
    options: rows,
    value: _.first(rows),
    type: 'select'
  }, {
    name: 'ambiguous_genes_strategy',
    type: 'select',
    tooltipHelp: 'Sometimes gene symbol cell contains multiple values separated by \'///\'.',
    options: [{
      name: 'omit',
      value: 'omit'
    }, {
      name: 'split',
      value: 'split'
    }]
  }, {
    name: 'preview_data',
    type: 'select',
    style: 'height: auto; max-height: 600px; overflow-x: auto; overflow-y: hidden;',
    multiple: true,
    disabled: true, //READ-ONLY
  }].forEach(function (a) {
    form.append(a);
  });
  form.$form.appendTo($dialog);

  var columnSelect = form.$form.find("[name=column_with_gene_symbols]");
  var strategySelect = form.$form.find("[name=ambiguous_genes_strategy]");
  var previewData = form.$form.find('[name=preview_data]');

  var onSelect = function () {
    var data = phantasus.Dataset.toJSON(project.getSelectedDataset());
    var newOptions = [];

    if (data.rows < ENRICHR_SUBMIT_LIMIT) {
      var parsedData = parseData(data, $(columnSelect).val(), $(strategySelect).val());
      newOptions = _.size(parsedData) === 0 ? ['[No rows selected]'] : [parsedData.join(' ')];
    } else {
      newOptions = ['[Invalid amount of rows selected (0 < n < 10000)]'];
    }

    form.setOptions('preview_data', newOptions);
    //previewData[0].size = Math.max(newOptions.length, 5);
    previewData[0].size = 2;
  };

  columnSelect.on('change', onSelect);
  strategySelect.on('change', onSelect);

  onSelect();
  form.$form.find('[data-toggle="tooltip"]').tooltip();
  form.appendContent('Result will open in a new window automatically.');


  project.getRowSelectionModel().on("selectionChanged.chart", onSelect);
  $dialog.dialog({
    close: function (event, ui) {
      project.getRowSelectionModel().off("selectionChanged.chart", onSelect);
      $dialog.dialog('destroy').remove();
    },

    resizable: true,
    height: 450,
    width: 600,
    buttons: [
      {
        text: "Cancel",
        click: function () {
          $(this).dialog("close");
        }
      },
      {
        text: "Submit",
        click: function () {
          self.execute({
            project: project,
            form: form
          });
          $(this).dialog("close");
        }
      }
    ]
  });
  this.$dialog = $dialog;
};


function parseData(data, column_with_gene_symbols, strategy) {
  var targetData = (_.findWhere(data.rowMetadataModel.vectors, {name: column_with_gene_symbols}) || {array: []}).array;

  return _.reduce(targetData, function (acc, geneRow) {
    if (!_.isString(geneRow)) { // rows are not strings???
      acc.push(geneRow);
      return acc;
    }

    var isAmbiguousGene = geneRow.indexOf('///') !== -1;
    if (isAmbiguousGene && strategy === 'split') {
      acc = acc.concat(geneRow.split('///'));
    } else if (!isAmbiguousGene) {
      acc.push(geneRow);
    }

    return acc;
  }, []);
}


phantasus.enrichrTool.prototype = {
  toString: function () {
    return 'Submit to Enrichr';
  },
  execute: function (options) {
    var data = phantasus.Dataset.toJSON(options.project.getSelectedDataset());

    if (data.rows >= ENRICHR_SUBMIT_LIMIT) {
      throw new Error('Invalid amount of rows are selected (0 <= n <= 10000)');
    }

    var parsedData = parseData(data, options.form.getValue('column_with_gene_symbols'),
      options.form.getValue('ambiguous_genes_strategy'))
      .join('\n');

    if (_.size(parsedData) === 0 || _.size(parsedData) >= ENRICHR_SUBMIT_LIMIT) {
      throw new Error('Invalid amount of rows are selected (0 <= n <= 10000). Currently selected: ' + _.size(parsedData) + ' genes');
    }

    var promise = $.Deferred();

    var formData = new FormData();
    formData.append('list', parsedData);
    formData.append('description', options.project.getSelectedDataset().getName());

    $.ajax({
      type: "POST",
      url: ENRICHR_URL,
      data: formData,
      cache: false,
      contentType: false,
      processData: false,
      success: function (data) {
        data = JSON.parse(data);
        window.open('https://amp.pharm.mssm.edu/Enrichr/enrich?dataset=' + data.shortId, '_blank');
        promise.resolve();
      },
      error: function (_, __, error) {
        promise.reject();
        throw new Error(error);
      }
    });

    return promise;
  }
};
