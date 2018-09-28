phantasus.SampleDatasets = function (options) {
  if (!options.openText) {
    options.openText = 'Open';
  }
  var _this = this;
  var $el = options.$el;
  this.callback = options.callback;
  $el.on('click', '[name=ccle]', function (e) { // button click
    var $this = $(this);
    var obj = {};
    $this.parents('tr').find('input:checked').each(function (i, c) {
      obj[$(c).data('type')] = true;
    });

    _this.openCCLE(obj);
    e.preventDefault();
  });

  $el.on('click', '[name=tcgaLink]', function (e) {
    e.preventDefault();
    var $this = $(this);
    var type = $this.data('disease-type');
    var obj = {};
    $this.parents('tr').find('input:checked').each(function (i, c) {
      obj[$(c).data('type')] = true;
    });
    var disease;
    for (var i = 0; i < _this.diseases.length; i++) {
      if (_this.diseases[i].type === type) {
        disease = _this.diseases[i];
        break;
      }
    }
    obj.type = type;
    obj.name = disease.name;
    _this.openTcga(obj);
  });

  $el.on(
    'click',
    '[data-toggle=dataTypeToggle]',
    function (e) {
      var $this = $(this);
      var $button = $this.parents('tr').find('button');
      var isDisabled = $this.parents('tr').find(
          'input:checked').length === 0;
      $button.prop('disabled', isDisabled);
    });

    fetch('https://genome.ifmo.ru/files/software/phantasus/tcga/tcga_index.txt')
      .then(function (response) {
        if (response.ok) {
          return response.text();
        }
      })
      .then(function (text) {
        var exampleHtml = [];
        /*exampleHtml.push('<table class="table table-condensed table-bordered">');
        exampleHtml.push('<thead><tr><th>Name</th><th>Gene' +
          ' Expression</th><th>Copy Number By Gene</th><th>Mutations</th><th>Gene' +
          ' Essentiality</th><th></th></tr></thead>');
        exampleHtml.push('<tbody>');
        exampleHtml.push('<tr>');
        exampleHtml
          .push('<td>Cancer Cell Line Encyclopedia (CCLE), Project Achilles</td>');
        exampleHtml
          .push('<td><input type="checkbox" style="margin-left:4px;" data-toggle="dataTypeToggle" data-type="mrna"> </td>');

        exampleHtml
          .push('<td><input type="checkbox" style="margin-left:4px;" data-toggle="dataTypeToggle" data-type="cn"> </td>');

        exampleHtml
          .push('<td><input type="checkbox" style="margin-left:4px;" data-toggle="dataTypeToggle" data-type="sig_genes"> </td>');

        exampleHtml
          .push('<td><input type="checkbox" style="margin-left:4px;" data-toggle="dataTypeToggle" data-type="ach"> </td>');

        exampleHtml
          .push('<td><button disabled type="button" class="btn btn-link" name="ccle">'
            + options.openText + '</button></td>');
        exampleHtml.push('</tr></tbody></table>');*/

      exampleHtml.push(
        '<div>TCGA data <a target="_blank" href="https://confluence.broadinstitute.org/display/GDAC/Dashboard-Stddata">(Broad GDAC 1/28/2016)</a></div><span>Please adhere to the' +
        ' <a target="_blank"' +
        ' href="http://cancergenome.nih.gov/abouttcga/policies/publicationguidelines">TCGA' +
        ' publication guidelines</a></u> when using TCGA data in your publications.</span>');

      exampleHtml.push('<div data-name="tcga"></div>');
        $(exampleHtml.join('')).appendTo($el);
        if (options.show) {
          $el.show();
        }
        var lines = text.split('\n');
        var diseases = [];
        for (var i = 0; i < lines.length; i++) {
          var line = lines[i];
          if (line === '') {
            continue;
          }
          var tokens = line.split('\t');
          var type = tokens[0];
          var dataTypes = tokens[1].split(',');
          var name = phantasus.TcgaUtil.DISEASE_STUDIES[type];
          var disease = {
            mrna: dataTypes
              .indexOf('mRNAseq_RSEM_normalized_log2.txt') !== -1,
            sig_genes: dataTypes.indexOf('sig_genes.txt') !== -1,
            gistic: dataTypes
              .indexOf('all_lesions.conf_99.txt') !== -1,
            sample_info: dataTypes.indexOf('All_CDEs.txt') !== -1,
            mutation: dataTypes
              .indexOf('mutations_merged.maf.txt') !== -1,
            rppa: dataTypes.indexOf('rppa.txt') !== -1,
            methylation: dataTypes
              .indexOf('meth.by_mean.data.txt') !== -1,
            name: name,
            type: type,
            dataTypes: dataTypes
          };
          if (disease.mrna || disease.gistic
            || disease.sig_genes || disease.rppa
            || disease.methylation) {
            diseases.push(disease);
          }
        }
        diseases.sort(function (a, b) {
          a = a.name.toLowerCase();
          b = b.name.toLowerCase();
          return (a === b ? 0 : (a < b ? -1 : 1));

        });
        var tcga = [];
        _this.diseases = diseases;

        tcga.push('<table class="table table-condensed table-bordered">');
        tcga.push('<thead><tr>');
        tcga.push('<th>Disease</th>');
        tcga.push('<th>Gene Expression</th>');
        tcga.push('<th>GISTIC Copy Number</th>');
        tcga.push('<th>Copy Number By Gene</th>');
        tcga.push('<th>Mutations</th>');
        tcga.push('<th>Proteomics</th>');
        tcga.push('<th>Methylation</th>');
        tcga.push('<th></th>');
        tcga.push('</tr></thead>');
        tcga.push('<tbody>');
        for (var i = 0; i < diseases.length; i++) {
          var disease = diseases[i];
          tcga.push('<tr>');

          tcga.push('<td>' + disease.name + '</td>');
          tcga.push('<td>');
          if (disease.mrna) {
            tcga
              .push('<input type="checkbox" style="margin-left:4px;" data-toggle="dataTypeToggle" data-type="mrna"> ');
          }
          tcga.push('</td>');

          tcga.push('<td>');
          if (disease.gistic) {
            tcga
              .push('<input type="checkbox" style="margin-left:4px;" data-toggle="dataTypeToggle" data-type="gistic"> ');
          }
          tcga.push('</td>');

          tcga.push('<td>');
          if (disease.gistic) {
            tcga
              .push('<input type="checkbox" style="margin-left:4px;" data-toggle="dataTypeToggle" data-type="gisticGene"> ');
          }
          tcga.push('</td>');

          tcga.push('<td>');
          if (disease.sig_genes) {
            tcga
              .push('<input type="checkbox" style="margin-left:4px;" data-toggle="dataTypeToggle" data-type="sig_genes"> ');
          }
          tcga.push('</td>');

          tcga.push('<td>');
          if (disease.rppa) {
            tcga
              .push('<input type="checkbox" style="margin-left:4px;" data-toggle="dataTypeToggle" data-type="rppa"> ');
          }
          tcga.push('</td>');
          tcga.push('<td>');
          if (disease.methylation) {
            tcga
              .push('<input type="checkbox" style="margin-left:4px;" data-toggle="dataTypeToggle" data-type="methylation"> ');
          }
          tcga.push('</td>');

          tcga
            .push('<td><button disabled type="button" class="btn btn-link" name="tcgaLink" data-disease-type="'
              + disease.type
              + '">'
              + options.openText
              + '</button></td>');
          tcga.push('</tr>');
        }
        tcga.push('</tbody>');
        tcga.push('</table>');
        $(tcga.join('')).appendTo($el.find('[data-name=tcga]'));
      }).catch(function (error) {
        console.log(error);
    });
};

phantasus.SampleDatasets.getTcgaDataset = function (options) {
  var baseUrl = 'https://genome.ifmo.ru/files/software/phantasus/tcga/'
    + options.type + '/';
  var datasetOptions = {};
  if (options.mrna) {
    datasetOptions.mrna = baseUrl + 'mRNAseq_RSEM_normalized_log2.txt';
  }

  if (options.methylation) {
    datasetOptions.methylation = baseUrl + 'meth.by_mean.data.txt';
  }
  if (options.sig_genes) {
    datasetOptions.mutation = baseUrl + 'mutations_merged.maf.txt';
    datasetOptions.sigGenes = baseUrl + 'sig_genes.txt';
  }
  // datasetOptions.seg = baseUrl + 'snp.seg.txt';
  if (options.rppa) {
    datasetOptions.rppa = baseUrl + 'rppa.txt';
  }
  if (options.gistic) {
    datasetOptions.gistic = baseUrl + 'all_lesions.conf_99.txt';
  }
  if (options.gisticGene) {
    datasetOptions.gisticGene = baseUrl + 'all_data_by_genes.txt';
  }

  datasetOptions.mrnaClust = baseUrl + 'bestclus.txt';
  datasetOptions.columnAnnotations = [
    {
      file: baseUrl + 'All_CDEs.txt',
      datasetField: 'participant_id',
      fileField: 'patient_id', // e.g. tcga-5l-aat0
      transposed: false
    }];
  return phantasus.TcgaUtil.getDataset(datasetOptions);

};
phantasus.SampleDatasets.getCCLEDataset = function (options) {
  var datasets = [];
  if (options.sig_genes) {
    datasets.push(
      'https://software.broadinstitute.org/morpheus/preloaded-datasets/ccle2maf_081117.maf.txt');
  }
  if (options.cn) {
    datasets.push('https://software.broadinstitute.org/morpheus/preloaded-datasets/CCLE_copynumber_byGene_2013-12-03.gct');
  }

  if (options.mrna) {
    datasets.push('https://software.broadinstitute.org/morpheus/preloaded-datasets/CCLE_expression_081117.rpkm.gct');
  }
  if (options.ach) {
    datasets.push('https://software.broadinstitute.org/morpheus/preloaded-datasets/Achilles_v2.20.2_GeneSolutions.gct');
  }

  var d = $.Deferred();
  var datasetPromise = phantasus.DatasetUtil.readDatasetArray(datasets);
  datasetPromise.done(function (dataset) {
    var idVector = dataset.getColumnMetadata().get(0);
    var siteVector = dataset.getColumnMetadata().add('site');
    for (var j = 0, ncols = siteVector.size(); j < ncols; j++) {
      var id = idVector.getValue(j);
      var index = id.indexOf('_');
      if (index !== -1) {
        idVector.setValue(j, id.substring(0, index));
        siteVector.setValue(j, id.substring(index + 1));
      }
    }
    d.resolve(dataset);
  }).fail(function (err) {
    d.reject(err);
  });
  return d;
};
phantasus.SampleDatasets.prototype = {

  openTcga: function (options) {
    console.log("openTcga", options);
    this.callback({
      name: options.name,
      renderReady: function (heatMap) {
        var whitelist = [
          'age_at_initial_pathologic_diagnosis',
          'breast_carcinoma_estrogen_receptor_status',
          'breast_carcinoma_progesterone_receptor_status',
          'lab_proc_her2_neu_immunohistochemistry_receptor_status',
          'days_to_death', 'ethnicity', 'gender',
          'histological_type', 'pathologic_stage'];

        var columnMetadata = heatMap.getProject().getFullDataset().getColumnMetadata();
        for (var i = 0; i < whitelist.length; i++) {
          if (columnMetadata.getByName(whitelist[i])) {
            heatMap.addTrack(whitelist[i], true, 'color');
          }
        }
        // view in space of mutation sample ids only
        if (options.sig_genes) {
          if (heatMap.getTrackIndex('q_value', false) === -1) {
            heatMap.addTrack('q_value', false, 'text');
          }
        }
      },
      columns: [
        {
          field: 'participant_id',
          display: 'text'
        }, {
          field: 'sample_type',
          display: 'color'
        }, {
          field: 'mutation_summary',
          display: 'stacked_bar'
        }, {
          field: 'mutation_summary_selection',
          display: 'stacked_bar'
        }, {
          field: 'mRNAseq_cluster',
          display: 'color, highlight'
        }],
      dataset: phantasus.SampleDatasets.getTcgaDataset(options)
    });
  },
  openCCLE: function (options) {
    var name = [];
    if (options.sig_genes) {
      name.push('Mut');
    }
    if (options.cn) {
      name.push('CN');
    }
    if (options.mrna) {
      name.push('Exp');
    }
    if (options.ach) {
      name.push('Ach');
    }
    this.callback({
      rows: [
        {
          field: 'id',
          display: 'text'
        }, {
          field: 'Description',
          display: 'text, tooltip'
        }, {
          field: 'mutation_summary',
          display: 'stacked_bar'
        }, {
          field: 'Source',
          display: 'color'
        }],
      columns: [
        {
          field: 'id',
          display: 'text,tooltip'
        }, {
          field: 'mutation_summary',
          display: 'stacked_bar'
        }, {
          field: 'site',
          display: 'color, highlight'
        }],
      dataset: phantasus.SampleDatasets.getCCLEDataset(options),
      name: 'CCLE - ' + name.join(', ')
    });
  }
};

phantasus.SampleDatasets.TCGA_DISEASE_TYPES_INFO = [
  {
    id: 'mrna',
    name: 'GENE EXPRESSION',
    type: 'mrna'
  }, {
    id: 'gistic',
    name: 'GISTIC COPY NUMBER',
    type: 'gistic'
  }, {
    id: 'gistic',
    name: 'COPY NUMBER BY GENE',
    type: 'gisticGene'
  }, {
    id: 'sig_genes',
    name: 'MUTATION',
    type: 'sig_genes'
  }, {
    id: 'rppa',
    name: 'PROTEOMICS',
    type: 'rppa'
  }, {
    id: 'methylation',
    name: 'METHYLATION',
    type: 'methylation'
  }];
