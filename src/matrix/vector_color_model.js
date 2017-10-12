phantasus.VectorColorModel = function () {
  this.vectorNameToColorMap = new phantasus.Map();
  this.vectorNameToColorScheme = new phantasus.Map();
  this.colors = phantasus.VectorColorModel.TWENTY_COLORS;
};

phantasus.VectorColorModel.YES_COLOR = '#d8b365';
phantasus.VectorColorModel.FEMALE = '#ff99ff';
phantasus.VectorColorModel.MALE = '#66ccff';

// tableau 20-same as d3 category20
phantasus.VectorColorModel.TWENTY_COLORS = ['#1f77b4', '#aec7e8', '#ff7f0e',
  '#ffbb78', '#2ca02c', '#98df8a', '#d62728', '#ff9896', '#9467bd',
  '#c5b0d5', '#8c564b', '#c49c94', '#e377c2', '#f7b6d2', '#7f7f7f',
  '#c7c7c7', '#bcbd22', '#dbdb8d', '#17becf', '#9edae5'];
phantasus.VectorColorModel.CATEGORY_20A = phantasus.VectorColorModel.TWENTY_COLORS;
phantasus.VectorColorModel.CATEGORY_20B = ['#393b79', '#5254a3', '#6b6ecf',
  '#9c9ede', '#637939', '#8ca252', '#b5cf6b', '#cedb9c', '#8c6d31',
  '#bd9e39', '#e7ba52', '#e7cb94', '#843c39', '#ad494a', '#d6616b',
  '#e7969c', '#7b4173', '#a55194', '#ce6dbd', '#de9ed6'];
phantasus.VectorColorModel.CATEGORY_20C = ['#3182bd', '#6baed6', '#9ecae1',
  '#c6dbef', '#e6550d', '#fd8d3c', '#fdae6b', '#fdd0a2', '#31a354',
  '#74c476', '#a1d99b', '#c7e9c0', '#756bb1', '#9e9ac8', '#bcbddc',
  '#dadaeb', '#636363', '#969696', '#bdbdbd', '#d9d9d9'];

phantasus.VectorColorModel.CATEGORY_ALL = [].concat(
  phantasus.VectorColorModel.CATEGORY_20A,
  phantasus.VectorColorModel.CATEGORY_20B,
  phantasus.VectorColorModel.CATEGORY_20C);

phantasus.VectorColorModel.TABLEAU10 = ['#1f77b4', '#ff7f0e', '#2ca02c',
  '#d62728', '#9467bd', '#8c564b', '#e377c2', '#7f7f7f', '#bcbd22',
  '#17becf'];
phantasus.VectorColorModel.STANDARD_COLORS = {
  'na': '#c0c0c0',
  'nan': '#c0c0c0',
  '': '#ffffff',
  'wt': '#ffffff',
  'n': '#ffffff',
  '0': '#ffffff',
  'y': phantasus.VectorColorModel.YES_COLOR,
  '1': phantasus.VectorColorModel.YES_COLOR,
  'male': phantasus.VectorColorModel.MALE,
  'm': phantasus.VectorColorModel.MALE,
  'female': phantasus.VectorColorModel.FEMALE,
  'f': phantasus.VectorColorModel.FEMALE,
  'kd': '#C675A8',
  'oe': '#56b4e9',
  'cp': '#FF9933',
  'pcl': '#003B4A',
  'trt_sh.cgs': '#C675A8',
  'trt_oe': '#56b4e9',
  'trt_cp': '#FF9933',
  'a375': '#1490C1',
  'a549': '#AAC8E9',
  'hcc515': '#1C9C2A',
  'hepg2': '#94DC89',
  'ht29': '#946DBE',
  'mcf7': '#C5B2D5',
  'pc3': '#38C697',
  'asc': '#FF8000',
  'cd34': '#FFBB75',
  'ha1e': '#FB4124',
  'neu': '#FF9A94',
  'npc': '#E57AC6',
  'cancer': '#1490C1',
  'immortalized normal': '#FF8000'
};
phantasus.VectorColorModel.getStandardColor = function (value) {
  if (value == null) {
    return '#ffffff';
  }
  var stringValue = value.toString().toLowerCase();
  return phantasus.VectorColorModel.STANDARD_COLORS[stringValue];

};
phantasus.VectorColorModel.getColorMapForNumber = function (length) {
  var colors;
  if (length < 3) {
    colors = colorbrewer.Set1[3];
  } else {
    colors = colorbrewer.Paired[length];
  }
  return colors ? colors : phantasus.VectorColorModel.TWENTY_COLORS;
};
phantasus.VectorColorModel.prototype = {
  toJSON: function (tracks) {
    var _this = this;
    var json = {};
    tracks.forEach(function (track) {
      if (track.settings.discrete) {
        var colorMap = _this.vectorNameToColorMap.get(track.getName());
        if (colorMap != null) {
          json[track.getName()] = colorMap;
        }
      } else {
        // colorScheme is instanceof phantasus.HeatMapColorScheme
        var colorScheme = _this.vectorNameToColorScheme.get(track.getName());
        if (colorScheme != null) {
          var colorSchemeJSON = phantasus.AbstractColorSupplier.toJSON(colorScheme.getCurrentColorSupplier());
          json[track.getName()] = colorSchemeJSON;
        }
      }
    });
    return json;
  },
  fromJSON: function (json) {
    for (var name in json) {
      var obj = json[name];
      if (obj.colors) {
        obj.scalingMode = 'fixed';
        this.vectorNameToColorScheme.set(name, phantasus.AbstractColorSupplier.fromJSON(obj));
      } else {
        this.vectorNameToColorMap.set(name, phantasus.Map.fromJSON(obj));
      }
    }
  },
  clear: function (vector) {
    this.vectorNameToColorMap.remove(vector.getName());
    this.vectorNameToColorScheme.remove(vector.getName());
  },
  copy: function () {
    var c = new phantasus.VectorColorModel();
    c.colors = this.colors.slice(0);
    this.vectorNameToColorMap.forEach(function (colorMap, name) {
      var newColorMap = new phantasus.Map();
      newColorMap.setAll(colorMap); // copy existing values
      c.vectorNameToColorMap.set(name, newColorMap);
    });
    this.vectorNameToColorScheme.forEach(function (colorScheme, name) {
      c.vectorNameToColorScheme.set(name, colorScheme
        .copy(new phantasus.Project(new phantasus.Dataset({
          name: '',
          rows: 1,
          columns: 1
        }))));
    });
    return c;
  },
  clearAll: function () {
    this.vectorNameToColorMap = new phantasus.Map();
    this.vectorNameToColorScheme = new phantasus.Map();
  },
  containsDiscreteColor: function (vector, value) {
    var metadataValueToColorMap = this.vectorNameToColorMap.get(vector
      .getName());
    if (metadataValueToColorMap === undefined) {
      return false;
    }
    var c = metadataValueToColorMap.get(value);
    return c != null;
  },
  setDiscreteColorMap: function (colors) {
    this.colors = colors;
  },
  getContinuousColorScheme: function (vector) {
    return this.vectorNameToColorScheme.get(vector.getName());
  },
  isContinuous: function (vector) {
    return this.vectorNameToColorScheme.has(vector.getName());
  },
  getDiscreteColorScheme: function (vector) {
    return this.vectorNameToColorMap.get(vector.getName());
  },
  createContinuousColorMap: function (vector) {
    var minMax = phantasus.VectorUtil.getMinMax(vector);
    var min = minMax.min;
    var max = minMax.max;
    var cs = new phantasus.HeatMapColorScheme(new phantasus.Project(
      new phantasus.Dataset({
        name: '',
        rows: 1,
        columns: 1
      })), {
      type: 'fixed',
      map: [{
        value: min,
        color: colorbrewer.Greens[3][0]
      }, {
        value: max,
        color: colorbrewer.Greens[3][2]
      }]
    });
    this.vectorNameToColorScheme.set(vector.getName(), cs);
    return cs;

  },
  _getColorForValue: function (value) {
    var color = phantasus.VectorColorModel.getStandardColor(value);
    if (color == null) { // try to reuse existing color map
      var existingMetadataValueToColorMap = this.vectorNameToColorMap
        .values();
      for (var i = 0, length = existingMetadataValueToColorMap.length; i < length; i++) {
        color = existingMetadataValueToColorMap[i].get(value);
        if (color !== undefined) {
          return color;
        }
      }
    }
    return color;
  },
  getContinuousMappedValue: function (vector, value) {
    var cs = this.vectorNameToColorScheme.get(vector.getName());
    if (cs === undefined) {
      cs = this.createContinuousColorMap(vector);
    }
    return cs.getColor(0, 0, value);
  },
  getMappedValue: function (vector, value) {
    //// console.log("getMappedValue", vector, value);
    var metadataValueToColorMap = this.vectorNameToColorMap.get(vector
      .getName());
    if (metadataValueToColorMap === undefined) {
      metadataValueToColorMap = new phantasus.Map();
      this.vectorNameToColorMap.set(vector.getName(),
        metadataValueToColorMap);
      // set all possible colors
      var values = phantasus.VectorUtil.getValues(vector);
      var ncolors = 0;
      var colors = null;
      if (values.length < 3) {
        colors = colorbrewer.Dark2[3];
      } else {
        colors = colorbrewer.Paired[values.length];
      }
      //// console.log("getMappedValue", colors);

      if (!colors) {
        if (values.length <= 20) {
          colors = d3.scale.category20().range();
        } else {
          colors = phantasus.VectorColorModel.CATEGORY_ALL;
        }
      }
      //// console.log("getMappedValue", colors);

      if (colors) {
        var ncolors = colors.length;
        for (var i = 0, nvalues = values.length; i < nvalues; i++) {
          var color = this._getColorForValue(values[i]);
          //// console.log(i, color, values[i], colors[i % ncolors]);
          if (color == null) {
            color = colors[i % ncolors];
          }
          metadataValueToColorMap.set(values[i], color);
        }
      } else {
        var _this = this;
        _.each(values, function (val) {
          _this.getMappedValue(vector, val);
        });
      }
      //// console.log(metadataValueToColorMap);
    }
    var color = metadataValueToColorMap.get(value);
    if (color == null) {
      color = this._getColorForValue(value);
      if (color == null) {
        var index = metadataValueToColorMap.size();
        color = this.colors[index % this.colors.length];
      }
      metadataValueToColorMap.set(value, color);
    }
    return color;
  },
  setMappedValue: function (vector, value, color) {
    var metadataValueToColorMap = this.vectorNameToColorMap.get(vector
      .getName());
    if (metadataValueToColorMap === undefined) {
      metadataValueToColorMap = new phantasus.Map();
      this.vectorNameToColorMap.set(vector.getName(),
        metadataValueToColorMap);
    }
    metadataValueToColorMap.set(value, color);
  }
};
