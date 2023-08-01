phantasus.MarkerSelection = function () {

};

/**
 * @private
 */
phantasus.MarkerSelection.Functions = [
  phantasus.FisherExact,
  phantasus.FoldChange, phantasus.MeanDifference, phantasus.SignalToNoise,
  phantasus.createSignalToNoiseAdjust(), phantasus.TTest];

phantasus.MarkerSelection.Functions.fromString = function (s) {
  for (var i = 0; i < phantasus.MarkerSelection.Functions.length; i++) {
    if (phantasus.MarkerSelection.Functions[i].toString() === s) {
      return phantasus.MarkerSelection.Functions[i];
    }
  }
  throw s + ' not found';
};
phantasus.MarkerSelection.execute = function (dataset, input) {
  var aIndices = [];
  var bIndices = [];
  for (var i = 0; i < input.numClassA; i++) {
    aIndices[i] = i;
  }
  for (var i = input.numClassA; i < dataset.getColumnCount(); i++) {
    bIndices[i] = i;
  }

  var f = phantasus.MarkerSelection.Functions.fromString(input.metric);
  var permutations = new phantasus.PermutationPValues(dataset, aIndices,
    bIndices, input.npermutations, f);
  return {
    rowSpecificPValues: permutations.rowSpecificPValues,
    k: permutations.k,
    fdr: permutations.fdr,
    scores: permutations.scores
  };
};
phantasus.MarkerSelection.prototype = {
  toString: function () {
    return 'Marker Selection';
  },
  init: function (project, form) {
    var _this = this;
    var updateAB = function (fieldNames) {
      var ids = [];
      if (fieldNames != null) {
        var vectors = phantasus.MetadataUtil.getVectors(project
          .getFullDataset().getColumnMetadata(), fieldNames);
        var idToIndices = phantasus.VectorUtil
          .createValuesToIndicesMap(vectors);
        idToIndices.forEach(function (indices, id) {
          ids.push(id);
        });
      }
      ids.sort();
      form.setOptions('class_a', ids);
      form.setOptions('class_b', ids);

    };
    var $field = form.$form.find('[name=field]');
    $field.on('change', function (e) {
      updateAB($(this).val());
    });

    if ($field[0].options.length > 0) {
      $field.val($field[0].options[0].value);
    }
    updateAB($field.val());
    var $metric = form.$form.find('[name=metric]');
    $metric.on('change', function (e) {
      var isFishy = $(this).val() === 'Fisher Exact Test';
      form.setVisible('grouping_value', isFishy);
      form.setVisible('permutations', !isFishy);
      form.setVisible('number_of_markers', !isFishy);

    });
    form.setVisible('grouping_value', false);

  },
  gui: function (project) {
    var dataset = project.getSortedFilteredDataset();
    var fields = phantasus.MetadataUtil.getMetadataNames(dataset
      .getColumnMetadata());
    return [
      {
        name: 'metric',
        options: phantasus.MarkerSelection.Functions,
        value: phantasus.SignalToNoise.toString(),
        type: 'select',
        help: ''
      },
      {
        name: 'grouping_value',
        value: '1',
        help: 'Class values are categorized into two groups based on whether dataset values are greater than or equal to this value'
      },
      {
        name: 'field',
        options: fields,
        type: 'select',
        multiple: true
      },
      {
        name: 'class_a',
        title: 'Target level',
        options: [],
        value: '',
        type: 'checkbox-list',
        multiple: true
      },
      {
        name: 'class_b',
        title: 'Reference level',
        options: [],
        value: '',
        type: 'checkbox-list',
        multiple: true
      },
      {
        name: 'number_of_markers',
        value: '100',
        type: 'text',
        help: 'The initial number of markers to show in each direction.'
      }, {
        name: 'permutations',
        value: '0',
        type: 'text'
      }];
  },
  execute: function (options) {

    var project = options.project;
    // classA and classB are arrays of Identifiers if run via user
    // interface. If run via JSON, will be string arrays
    var classA = options.input.class_a;
    var classB = options.input.class_b;
    if (classA.length === 0 && classB.length === 0) {
      throw 'No samples were selected as reference and target levels';
    }

    if (classA.length === 0) {
      throw 'No samples in target level';
    }
    if (classB.length === 0) {
      throw 'No samples reference level';
    }
    for (var i = 0; i < classA.length; i++) {
      var val = classA[i];
      if (!(val instanceof phantasus.Identifier)) {
        classA[i] = new phantasus.Identifier(
          phantasus.Util.isArray(val) ? val : [val]);
      }
    }

    for (var i = 0; i < classB.length; i++) {
      var val = classB[i];
      if (!(val instanceof phantasus.Identifier)) {
        classB[i] = new phantasus.Identifier(
          phantasus.Util.isArray(val) ? val : [val]);
      }
    }
    var npermutations = parseInt(options.input.permutations);
    var dataset = project.getSortedFilteredDataset();

    var fieldNames = options.input.field;
    if (!phantasus.Util.isArray(fieldNames)) {
      fieldNames = [fieldNames];
    }

    var vectors = phantasus.MetadataUtil.getVectors(dataset
      .getColumnMetadata(), fieldNames);
    var idToIndices = phantasus.VectorUtil.createValuesToIndicesMap(vectors);
    var aIndices = [];
    var bIndices = [];
    classA.forEach(function (id) {
      var indices = idToIndices.get(id);
      if (indices === undefined) {
        throw new Error(id + ' not found in ' + idToIndices.keys());
      }
      aIndices = aIndices.concat(indices);
    });
    classB.forEach(function (id) {
      var indices = idToIndices.get(id);
      if (indices === undefined) {
        throw new Error(id + ' not found in ' + idToIndices.keys());
      }
      bIndices = bIndices.concat(indices);
    });

    var f = phantasus.MarkerSelection.Functions
      .fromString(options.input.metric);

    var classASet = {};
    for (var i = 0; i < aIndices.length; i++) {
      classASet[aIndices[i]] = true;
    }
    for (var i = 0; i < bIndices.length; i++) {
      if (classASet[bIndices[i]]) {
        throw 'The sample was found in the reference level group and the target level group.';
      }
    }
    var isFishy = f.toString() === phantasus.FisherExact.toString();
    if ((aIndices.length === 1 || bIndices.length === 1)
      && !isFishy && f.toString() !== phantasus.MeanDifference.toString()) {
      f = phantasus.FoldChange;
    }
    var list1 = new phantasus.DatasetRowView(new phantasus.SlicedDatasetView(
      dataset, null, aIndices));
    var list2 = new phantasus.DatasetRowView(new phantasus.SlicedDatasetView(
      dataset, null, bIndices));
    // remove
    // other
    // marker
    // selection
    // fields
    var markerSelectionFields = phantasus.MarkerSelection.Functions.map(
      function (f) {
        return f.toString();
      }).concat(['odds_ratio', 'FDR(BH)', 'p_value']);
    markerSelectionFields.forEach(function (name) {
      var index = phantasus.MetadataUtil.indexOf(dataset.getRowMetadata(),
        name);
      if (index !== -1) {
        dataset.getRowMetadata().remove(index);
        options.heatMap.removeTrack(name, false);
      }
    });
    var v = dataset.getRowMetadata().add(f.toString());
    var vectors = [v];
    var comparisonVector = dataset.getColumnMetadata().add('Comparison');

    for (var i = 0; i < aIndices.length; i++) {
      comparisonVector.setValue(aIndices[i], 'Target');
    }
    for (var i = 0; i < bIndices.length; i++) {
      comparisonVector.setValue(bIndices[i], 'Reference');
    }

    function done(result) {
      if (result) {
        var pvalueVector = dataset.getRowMetadata().add('p_value');
        var fdrVector = dataset.getRowMetadata().add('FDR(BH)');
        var kVector = dataset.getRowMetadata().add('k');
        for (var i = 0, size = pvalueVector.size(); i < size; i++) {
          pvalueVector.setValue(i, result.rowSpecificPValues[i]);
          fdrVector.setValue(i, result.fdr[i]);
          kVector.setValue(i, result.k[i]);
          v.setValue(i, result.scores[i]);
        }
        kVector.getProperties().set(phantasus.VectorKeys.FORMATTER, {pattern: 'i'});
        vectors.push(pvalueVector);
        vectors.push(fdrVector);
        vectors.push(kVector);
      }
      if (project.getRowFilter().getFilters().length > 0) {
        project.getRowFilter().setAnd(true, true);
      }
      var rowFilters = project.getRowFilter().getFilters();
      // remove existing top n filters
      for (var i = 0; i < rowFilters.length; i++) {
        if (rowFilters[i] instanceof phantasus.TopNFilter) {
          project.getRowFilter().remove(i, true);
          i--;
        }
      }
      if (!isFishy) {
        project.getRowFilter().add(
          new phantasus.TopNFilter(
            parseInt(options.input.number_of_markers),
            phantasus.TopNFilter.TOP_BOTTOM, vectors[0]
              .getName()), true);
      }

      project.setRowFilter(project.getRowFilter(), true);
      project.setRowSortKeys([
        new phantasus.SortKey(vectors[0].getName(),
          isFishy ? phantasus.SortKey.SortOrder.ASCENDING
            : phantasus.SortKey.SortOrder.DESCENDING)], true);
      // select samples used in comparison
      var selectedColumnIndices = new phantasus.Set();
      aIndices.forEach(function (index) {
        selectedColumnIndices.add(index);
      });
      bIndices.forEach(function (index) {
        selectedColumnIndices.add(index);
      });
      project.getColumnSelectionModel().setViewIndices(selectedColumnIndices, true);

      project.setColumnSortKeys([
        new phantasus.SortKey(comparisonVector
          .getName(), phantasus.SortKey.SortOrder.ASCENDING)], true);

      project.trigger('trackChanged', {
        vectors: vectors,
        display: vectors.map(function () {
          return 'text';
        }),
        columns: false
      });
      project.trigger('trackChanged', {
        vectors: [comparisonVector],
        display: ['color'],
        columns: true
      });
    }

    if (isFishy) {
      var groupingValue = parseFloat(options.input.grouping_value);
      var oddsRatioVector = dataset.getRowMetadata().add('odds_ratio');
      var fdrVector = dataset.getRowMetadata().add('FDR(BH)');
      var contingencyTableVector = dataset.getRowMetadata().add(
        'contingency_table');
      var pvalues = [];
      for (var i = 0, size = dataset.getRowCount(); i < size; i++) {
        var abcd = phantasus.createContingencyTable(list1.setIndex(i),
          list2.setIndex(i), groupingValue);
        contingencyTableVector.setValue(i, '[[' + abcd[0] + ', '
          + abcd[1] + '], [' + abcd[2] + ', ' + abcd[3] + ']]');
        var ratio = (abcd[0] * abcd[3]) / (abcd[1] * abcd[2]);
        if (isNaN(ratio) || ratio === Number.POSITIVE_INFINITY) {
          ratio = 0;
        }
        oddsRatioVector.setValue(i, ratio);
        v.setValue(i, phantasus.FisherExact.fisherTest(abcd[0], abcd[1],
          abcd[2], abcd[3]));
        pvalues.push(v.getValue(i));
      }
      var fdr = phantasus.FDR_BH(pvalues);
      for (var i = 0, size = dataset.getRowCount(); i < size; i++) {
        fdrVector.setValue(i, fdr[i]);
      }
      vectors.push(oddsRatioVector);
      vectors.push(fdrVector);
      vectors.push(contingencyTableVector);
      done();
    } else {
      if (npermutations > 0) {
        var subset = new phantasus.SlicedDatasetView(dataset, null,
          aIndices.concat(bIndices));

        options.input.background = options.input.background && typeof Worker !== 'undefined';
        options.input.numClassA = aIndices.length;
        options.input.npermutations = npermutations;
        if (options.input.background) {
          var blob = new Blob(
            [
              'self.onmessage = function(e) {'
              + 'importScripts(e.data.scripts);'
              + 'self.postMessage(phantasus.MarkerSelection.execute(phantasus.Dataset.fromJSON(e.data.dataset), e.data.input));'
              + '}']);

          var url = window.URL.createObjectURL(blob);
          var worker = new Worker(url);
          worker.postMessage({
            scripts: phantasus.Util.getScriptPath(),
            dataset: phantasus.Dataset.toJSON(subset, {
              columnFields: [],
              rowFields: [],
              seriesIndices: [0]
            }),
            input: options.input
          });

          worker.onmessage = function (e) {
            done(e.data);
            worker.terminate();
            window.URL.revokeObjectURL(url);
          };
          return worker;
        } else {
          done(phantasus.MarkerSelection.execute(subset, options.input));
        }
      } else {
        for (var i = 0, size = dataset.getRowCount(); i < size; i++) {
          v.setValue(i, f(list1.setIndex(i), list2.setIndex(i)));
        }
        // no permutations, compute asymptotic p-value if t-test
        if (f.toString() === phantasus.TTest.toString() && typeof jStat !== 'undefined') {
          var pvalueVector = dataset.getRowMetadata().add('p_value');
          var fdrVector = dataset.getRowMetadata().add('FDR(BH)');
          var rowSpecificPValues = new Float32Array(dataset.getRowCount());
          for (var i = 0, size = dataset.getRowCount(); i < size; i++) {
            list1.setIndex(i);
            list2.setIndex(i);
            var m1 = phantasus.Mean(list1);
            var m2 = phantasus.Mean(list2);
            var v1 = phantasus.Variance(list1, m1);
            var v2 = phantasus.Variance(list2, m2);
            var n1 = phantasus.CountNonNaN(list1);
            var n2 = phantasus.CountNonNaN(list2);
            var df = phantasus.DegreesOfFreedom(v1, v2, n1, n2);
            var t = v.getValue(i);
            var p = 2.0 * (1 - jStat.studentt.cdf(Math.abs(t), df));
            rowSpecificPValues[i] = p;
            pvalueVector.setValue(i, p);
          }
          vectors.push(pvalueVector);
          var fdr = phantasus.FDR_BH(rowSpecificPValues);
          for (var i = 0, size = dataset.getRowCount(); i < size; i++) {
            fdrVector.setValue(i, fdr[i]);
          }
          vectors.push(fdrVector);
        }

        done();
      }
    }

  }
};
