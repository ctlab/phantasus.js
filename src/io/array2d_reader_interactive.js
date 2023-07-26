phantasus.Array2dReaderInteractive = function () {

};

phantasus.Array2dReaderInteractive.prototype = {
  read: function (fileOrUrl, callback) {
    var _this = this;
    var name = phantasus.Util.getBaseFileName(phantasus.Util.getFileName(fileOrUrl));
    var html = [];
    html.push('<div>');
    html.push('<label>Click the table cell containing the first data row and column.</label>');
    html.push('<div class="checkbox"> <label> <input name="transpose" type="checkbox">' +
      ' Tranpose </label>' +
      ' </div>');

    html.push('<div' +
      ' style="display:inline-block;width:10px;height:10px;background-color:#b3cde3;"></div><span> Data Matrix</span>');
    html.push('<br /><div' +
      ' style="display:inline-block;width:10px;height:10px;background-color:#fbb4ae;"></div><span> Column' +
      ' Annotations</span>');
    html.push('<br /><div' +
      ' style="display:inline-block;' +
      ' width:10px;height:10px;background-color:#ccebc5;"></div><span> Row' +
      ' Annotations</span>');

    html.push('<div class="slick-bordered-table" style="width:550px;height:300px;"></div>');
    html.push('</div>');
    var $el = $(html.join(''));

    phantasus.Util.readLines(fileOrUrl, true).done(function (lines) {

      var separator = /\t/;
      var testLine = lines[1];
      var separators = ['\t', ',', ' '];
      for (var i = 0; i < separators.length; i++) {
        var sep = separators[i];
        var tokens = testLine.split(new RegExp(sep));
        if (tokens.length > 1) {
          separator = sep;
          break;
        }
      }

      // show in table
      for (var i = 0, nrows = lines.length; i < nrows; i++) {
        lines[i] = lines[i].split(separator);
      }
      var grid;
      var columns = [];
      for (var j = 0, ncols = lines[0].length; j < ncols; j++) {
        columns.push({
          id: j,
          field: j
        });
      }

      var dataRowStart = 1;
      var dataColumnStart = 1;
      var _lines = lines;
      var grid = new Slick.Grid($el.find('.slick-bordered-table')[0], lines, columns, {
        enableCellNavigation: true,
        headerRowHeight: 0,
        showHeaderRow: false,
        multiColumnSort: false,
        multiSelect: false,
        topPanelHeight: 0,
        enableColumnReorder: false,
        enableTextSelectionOnCells: true,
        forceFitColumns: false,
        defaultFormatter: function (row, cell, value, columnDef, dataContext) {
          var color = 'white';
          if (cell >= dataColumnStart && row >= dataRowStart) {
            color = '#b3cde3'; // data
          } else if (row <= (dataRowStart - 1) && cell >= dataColumnStart) {
            color = '#fbb4ae'; // column
          } else if (cell < dataColumnStart && row >= dataRowStart) {
            color = '#ccebc5'; // row
          }
          var html = ['<div style="width:100%;height:100%;background-color:' + color + '">'];
          if (_.isNumber(value)) {
            html.push(phantasus.Util.nf(value));
          } else if (phantasus.Util.isArray(value)) {
            var s = [];
            for (var i = 0, length = value.length; i < length; i++) {
              if (i > 0) {
                s.push(', ');
              }
              var val = value[i];
              s.push(value[i]);
            }
            html.push(s.join(''));
          } else {
            html.push(value);
          }
          html.push('</div>');
          return html.join('');
        }
      });
      var transposedLines;
      var transposedColumns;
      $el.find('[name=transpose]').on('click', function (e) {
        if ($(this).prop('checked')) {
          if (transposedLines == null) {
            transposedLines = [];
            for (var j = 0, ncols = lines[0].length; j < ncols; j++) {
              var row = [];
              transposedLines.push(row);
              for (var i = 0, nrows = lines.length; i < nrows; i++) {
                row.push(lines[i][j]);
              }
            }

            transposedColumns = [];
            for (var j = 0, ncols = transposedLines[0].length; j < ncols; j++) {
              transposedColumns.push({
                id: j,
                field: j
              });
            }

          }
          lines = transposedLines;
          grid.setData(transposedLines);
          grid.setColumns(transposedColumns);
          grid.resizeCanvas();
          grid.invalidate();
        } else {
          grid.setData(_lines);
          grid.setColumns(columns);
          grid.resizeCanvas();
          grid.invalidate();
          lines = _lines;
        }
      });
      grid.onClick.subscribe(function (e, args) {
        dataRowStart = args.row;
        dataColumnStart = args.cell;
        grid.invalidate();
      });

      $el.find('.slick-header').remove();
      var footer = [];
      footer
        .push('<button name="ok" type="button" class="btn btn-default">OK</button>');
      footer
        .push('<button name="cancel" type="button" data-dismiss="modal" class="btn btn-default">Cancel</button>');
      var $footer = $(footer.join(''));

      phantasus.FormBuilder.showOkCancel({
        title: 'Open',
        content: $el,
        close: false,
        focus: document.activeElement,
        cancelCallback: function () {
          callback(null);
        },
        okCallback: function () {
          _this._read(name, lines, dataColumnStart, dataRowStart, callback);
        }
      });
      grid.resizeCanvas();

    }).fail(function (err) {
      callback(err);
    });

  },
  _read: function (datasetName, lines, dataColumnStart, dataRowStart, cb) {
    var columnCount = lines[0].length;
    var columns = columnCount - dataColumnStart;
    var rows = lines.length - dataRowStart;
    var dataset = new phantasus.Dataset({
      name: datasetName,
      rows: rows,
      columns: columns,
      dataType: 'Float32'
    });

    // column metadata names are in 1st
    // column
    if (dataColumnStart > 0) {
      for (var i = 0; i < dataRowStart; i++) {
        var name = lines[i][0];
        if (name == null || name === '' || name === 'na') {
          name = 'id';
        }
        var unique = 1;
        while (dataset.getColumnMetadata().getByName(name) != null) {
          name = name + '-' + unique;
          unique++;
        }
        var v = dataset.getColumnMetadata().add(name);
        var nonEmpty = false;
        for (var j = 0; j < columns; j++) {
          var s = lines[i][j + dataColumnStart];
          if (s != null && s !== '') {
            nonEmpty = true;
            v.setValue(j, s);
          }
        }
        if (!nonEmpty) {
          dataset.getColumnMetadata().remove(phantasus.MetadataUtil.indexOf(dataset.getColumnMetadata(), v.getName()));
        }

      }
    }
    if (dataRowStart > 0) {
      // row metadata names are in first row
      for (var j = 0; j < dataColumnStart; j++) {
        var name = lines[0][j];
        if (name == null || name === '') {
          name = 'id';
        }
        var unique = 1;
        while (dataset.getRowMetadata().get(name) != null) {
          name = name + '-' + unique;
          unique++;
        }
        dataset.getRowMetadata().add(name);

      }
    }

    for (var i = 0; i < rows; i++) {
      for (var j = 0, k = 0; k < dataset.getRowMetadata().getMetadataCount(); j++, k++) {
        var metaDataValue = lines[i + dataRowStart][j];
        dataset.getRowMetadata().get(j).setValue(i, metaDataValue);
      }
    }

    for (var i = 0; i < rows; i++) {
      for (var j = 0; j < columns; j++) {
        var s = lines[i + dataRowStart][j + dataColumnStart];
        dataset.setValue(i, j, parseFloat(s));
      }
    }

    phantasus.MetadataUtil.maybeConvertStrings(dataset.getRowMetadata(), 1);
    phantasus.MetadataUtil.maybeConvertStrings(dataset.getColumnMetadata(),
      1);
    cb(null, dataset);
  }
};
