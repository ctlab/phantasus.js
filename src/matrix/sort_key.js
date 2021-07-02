phantasus.AbstractSortKey = function (name, columns) {
  this.name = name;
  this.columns = columns;
};

phantasus.AbstractSortKey.prototype = {
  lockOrder: 0,
  columns: true,
  preservesDendrogram: false,
  unlockable: true,
  /**
   * Indicates whether this key is sorting rows or columns.
   * @return {Boolean}
   */
  isColumns: function () {
    return this.columns;
  },
  /**
   * Sets whether this key is columns (true) or rows (false).
   * @param columns {Boolean}
   */
  setColumns: function (columns) {
    this.columns = columns;
  },
  isPreservesDendrogram: function () {
    return this.preservesDendrogram;
  },
  setPreservesDendrogram: function (preservesDendrogram) {
    this.preservesDendrogram = preservesDendrogram;
  },
  getLockOrder: function () {
    return this.lockOrder;
  },
  /**
   * When lock order is set, indicates whether lock order can be unlocked. For example, bring matches to top sort key can not be unlocked.
   */
  isUnlockable: function () {
    return this.unlockable;
  },
  setUnlockable: function (unlockable) {
    this.unlockable = unlockable;
  },
  /**
   * Sets the sort key lock order. One is locked to beginning of sort keys, two is locked to end of sort keys. Zero clears lock order.
   * Dendrogram sort key is locked to end. Selection on top sort key is locked to beginning.
   * @param lockOrder {Number}
   */
  setLockOrder: function (lockOrder) {
    this.lockOrder = lockOrder;
  },
  setSortOrder: function (sortOrder) {
    this.sortOrder = sortOrder;
  },
  getSortOrder: function () {
    return this.sortOrder;
  },
  init: function () {

  }
};
phantasus.MatchesOnTopSortKey = function (project, modelIndices, name, columns) {
  phantasus.AbstractSortKey.call(this, name, columns);
  var highlightedModelIndices = {};
  var p = project;
  var viewIndices = [];
  for (var i = 0, j = modelIndices.length, length = modelIndices.length; i < length; i++, j--) {
    highlightedModelIndices[modelIndices[i]] = -1; // tie
    viewIndices.push(i);
  }
  this.comparator = function (i1, i2) {
    var a = highlightedModelIndices[i1];
    if (a === undefined) {
      a = 0;
    }
    var b = highlightedModelIndices[i2];
    if (b === undefined) {
      b = 0;
    }
    return (a === b ? 0 : (a < b ? -1 : 1));
  };
  this.indices = viewIndices;
};
phantasus.MatchesOnTopSortKey.prototype = {
  toString: function () {
    return this.name;
  },
  getSortOrder: function () {
    return 2;
  },
  getComparator: function () {
    return this.comparator;
  },
  getValue: function (i) {
    return i;
  }
};
phantasus.Util.extend(phantasus.MatchesOnTopSortKey, phantasus.AbstractSortKey);

phantasus.SortKey = function (field, sortOrder, columns) {
  phantasus.AbstractSortKey.call(this, field, columns);
  if (typeof sortOrder === 'string') {
    sortOrder = phantasus.SortKey.SortOrder[sortOrder.toUpperCase()];
    if (sortOrder === undefined) {
      sortOrder = 0;
    }
  }
  this.v = null;
  this.c = null;
  this.setSortOrder(sortOrder);
};

phantasus.SortKey.prototype = {
  toString: function () {
    return this.name;
  },
  init: function (dataset, visibleModelIndices) {
    this.v = dataset.getRowMetadata().getByName(this.name);
    if (!this.v) {
      this.v = {};
      this.v.getValue = function () {
        return 0;
      };
      this.c = this.sortOrder === phantasus.SortKey.SortOrder.ASCENDING ? phantasus.SortKey.ASCENDING_COMPARATOR
        : phantasus.SortKey.DESCENDING_COMPARATOR;
    } else {
      if (this.v.isFactorized()) {
        var levels = this.v.getFactorLevels();
        if (this.sortOrder === phantasus.SortKey.SortOrder.ASCENDING) {
          this.c = function (a,b) { return _.indexOf(levels, a) - _.indexOf(levels, b); }
        } else {
          this.c = function (a,b) { return _.indexOf(levels, b) - _.indexOf(levels, a); }
        }
      } else {
        var dataType = phantasus.VectorUtil.getDataType(this.v);
        if (dataType === 'number' || dataType === 'integer' || dataType === 'real') {
          this.c = this.sortOrder === phantasus.SortKey.SortOrder.ASCENDING ? phantasus.SortKey.NUMBER_ASCENDING_COMPARATOR
            : phantasus.SortKey.NUMBER_DESCENDING_COMPARATOR;
        } else if (dataType === '[number]') {
          var summary = this.v.getProperties().get(
            phantasus.VectorKeys.ARRAY_SUMMARY_FUNCTION)
            || phantasus.SortKey.ARRAY_MAX_SUMMARY_FUNCTION;
          this.c = this.sortOrder === phantasus.SortKey.SortOrder.ASCENDING ? phantasus.SortKey
              .ARRAY_ASCENDING_COMPARATOR(summary)
            : phantasus.SortKey.ARRAY_DESCENDING_COMPARATOR(summary);
        } else {
          this.c = this.sortOrder === phantasus.SortKey.SortOrder.ASCENDING ? phantasus.SortKey.ASCENDING_COMPARATOR
            : phantasus.SortKey.DESCENDING_COMPARATOR;
        }
        if (this.customComparator != null) {
          var oldC = this.c;
          var customComparator = this.customComparator;
          if (this.sortOrder === phantasus.SortKey.SortOrder.ASCENDING) {
            this.c = function (a, b) {
              var val = customComparator(a, b);
              return val === 0 ? oldC(a, b) : val;
            };
          } else {
            this.c = function (a, b) {
              var val = customComparator(b, a);
              return val === 0 ? oldC(a, b) : val;
            };
          }
        }
      }
    }

    if (this.sortOrder === phantasus.SortKey.SortOrder.TOP_N) {
      var pairs = [];
      var missingIndices = [];
      for (var i = 0, nrows = visibleModelIndices.length; i < nrows; i++) {
        var index = visibleModelIndices[i];
        var value = this.v.getValue(index);
        if (!isNaN(value)) {
          pairs.push({
            index: index,
            value: value
          });
        } else {
          missingIndices.push(index);
        }
      }
      // sort values in descending order
      var c = this.c;
      this.c = phantasus.SortKey.NUMBER_ASCENDING_COMPARATOR;
      pairs
        .sort(function (pair1, pair2) {
          return c(pair1.value, pair2.value);
        });

      var modelIndexToValue = [];
      var nInGroup = Math.min(pairs.length, 10);
      var counter = 0;
      var topIndex = 0;

      var half = Math.floor(pairs.length / 2);
      var topPairs = pairs.slice(0, half);
      var bottomPairs = pairs.slice(half);
      var bottomIndex = bottomPairs.length - 1;
      var ntop = topPairs.length;
      var npairs = pairs.length;
      while (counter < npairs) {
        for (var i = 0; i < nInGroup && topIndex < ntop; i++, topIndex++, counter++) {
          modelIndexToValue[topPairs[topIndex].index] = counter;
        }
        var indexCounterPairs = [];
        for (var i = 0; i < nInGroup && bottomIndex >= 0; i++, bottomIndex--, counter++) {
          indexCounterPairs.push([
            bottomPairs[bottomIndex].index,
            counter]);
        }
        for (var i = indexCounterPairs.length - 1, j = 0; i >= 0; i--, j++) {
          var item_i = indexCounterPairs[i];
          var item_j = indexCounterPairs[j];
          modelIndexToValue[item_i[0]] = item_j[1];
        }

      }

      // add on missing
      for (var i = 0, length = missingIndices.length; i < length; i++, counter++) {
        modelIndexToValue[missingIndices[i]] = counter;
      }
      this.modelIndexToValue = modelIndexToValue;

    }
    else {
      delete this.modelIndexToValue;
    }
  },
  getComparator: function () {
    return this.c;
  },
  getValue: function (i) {
    return this.modelIndexToValue ? this.modelIndexToValue[i] : this.v.getValue(i);
  }
};
phantasus.Util.extend(phantasus.SortKey, phantasus.AbstractSortKey);
/**
 * @param modelIndices
 *            Selected rows or columns
 * @param isColumnSort -
 *            sort columns by selected rows.
 */
phantasus.SortByValuesKey = function (modelIndices, sortOrder, isColumnSort) {
  phantasus.AbstractSortKey.call(this, 'values', isColumnSort);
  this.bothCount = 10;
  this.modelIndices = modelIndices;
  this.sortOrder = sortOrder;
  this.setSortOrder(sortOrder);

};
phantasus.SortByValuesKey.prototype = {
  toString: function () {
    return this.name;
  },
  init: function (dataset, visibleModelIndices) {
    // isColumnSort-sort columns by selected rows
    // dataset is transposed if !isColumnSort
    this.dataset = phantasus.DatasetUtil.slicedView(dataset, null,
      this.modelIndices);
    this.rowView = new phantasus.DatasetRowView(this.dataset);
    this.summaryFunction = this.modelIndices.length > 1 ? phantasus.Median
      : function (row) {
      return row.getValue(0);
    };
    if (this.sortOrder === phantasus.SortKey.SortOrder.TOP_N) {
      var pairs = [];
      var missingIndices = [];
      for (var i = 0, nrows = visibleModelIndices.length; i < nrows; i++) {
        var index = visibleModelIndices[i];
        var value = this.summaryFunction(this.rowView.setIndex(index));
        if (!isNaN(value)) {
          pairs.push({
            index: index,
            value: value
          });
        } else {
          missingIndices.push(index);
        }
      }
      // sort values in descending order
      pairs
        .sort(function (a, b) {
          return (a.value < b.value ? 1
            : (a.value === b.value ? 0 : -1));
        });

      var modelIndexToValue = [];
      var nInGroup = Math.min(pairs.length, this.bothCount);
      var counter = 0;
      var topIndex = 0;

      var half = Math.floor(pairs.length / 2);
      var topPairs = pairs.slice(0, half);
      var bottomPairs = pairs.slice(half);
      var bottomIndex = bottomPairs.length - 1;
      var ntop = topPairs.length;
      var npairs = pairs.length;
      while (counter < npairs) {
        for (var i = 0; i < nInGroup && topIndex < ntop; i++, topIndex++, counter++) {
          modelIndexToValue[topPairs[topIndex].index] = counter;
        }
        var indexCounterPairs = [];
        for (var i = 0; i < nInGroup && bottomIndex >= 0; i++, bottomIndex--, counter++) {
          indexCounterPairs.push([
            bottomPairs[bottomIndex].index,
            counter]);
        }
        for (var i = indexCounterPairs.length - 1, j = 0; i >= 0; i--, j++) {
          var item_i = indexCounterPairs[i];
          var item_j = indexCounterPairs[j];
          modelIndexToValue[item_i[0]] = item_j[1];
        }

      }

      // add on missing
      for (var i = 0, length = missingIndices.length; i < length; i++, counter++) {
        modelIndexToValue[missingIndices[i]] = counter;
      }
      this.modelIndexToValue = modelIndexToValue;

    } else {
      delete this.modelIndexToValue;
    }
  },
  getComparator: function () {
    return this.c;
  },
  getValue: function (i) {
    return this.modelIndexToValue ? this.modelIndexToValue[i] : this
      .summaryFunction(this.rowView.setIndex(i));
  },
  setSortOrder: function (sortOrder) {
    if (typeof sortOrder === 'string') {
      sortOrder = phantasus.SortKey.SortOrder[sortOrder.toUpperCase()];
    }
    this.sortOrder = sortOrder;
    if (this.sortOrder === phantasus.SortKey.SortOrder.ASCENDING) {
      this.c = phantasus.SortKey.ELEMENT_ASCENDING_COMPARATOR;
    } else if (this.sortOrder === phantasus.SortKey.SortOrder.DESCENDING) {
      this.c = phantasus.SortKey.ELEMENT_DESCENDING_COMPARATOR;
    } else {
      this.c = phantasus.SortKey.NUMBER_ASCENDING_COMPARATOR;
    }

  }
};
phantasus.Util.extend(phantasus.SortByValuesKey, phantasus.AbstractSortKey);

/**
 * @param modelIndices
 *            Array of model indices
 * @param nvisible
 *            The number of visible indices at the time this sort key was
 *            created. Used by dendrogram to determine if dendrogram should be
 *            shown.
 * @param name
 *            This sort key name
 * @param columns Whether column sort
 */
phantasus.SpecifiedModelSortOrder = function (modelIndices, nvisible, name, columns) {
  phantasus.AbstractSortKey.call(this, name, columns);
  this.nvisible = nvisible;
  var modelIndexToValue = [];
  for (var i = 0, length = modelIndices.length; i < length; i++) {
    modelIndexToValue[modelIndices[i]] = i;
  }
  this.modelIndices = modelIndices;
  this.modelIndexToValue = modelIndexToValue;
  this.c = phantasus.SortKey.NUMBER_ASCENDING_COMPARATOR;
};
phantasus.SpecifiedModelSortOrder.prototype = {
  toString: function () {
    return this.name;
  },
  getComparator: function (a, b) {
    return this.c;
  },
  getValue: function (i) {
    return this.modelIndexToValue[i];
  },
  setSortOrder: function (sortOrder) {
    this.sortOrder = sortOrder;
    this.c = this.sortOrder === phantasus.SortKey.SortOrder.ASCENDING ? phantasus.SortKey.NUMBER_ASCENDING_COMPARATOR
      : phantasus.SortKey.NUMBER_DESCENDING_COMPARATOR;
  }
};
phantasus.Util.extend(phantasus.SpecifiedModelSortOrder, phantasus.AbstractSortKey);

/**
 * Group by key
 *
 * @param values
 */
phantasus.SpecifiedGroupByKey = function (clusterIds, columns) {
  phantasus.AbstractSortKey.call(this, 'Dendrogram Cut', columns);
  this.clusterIds = clusterIds;
  this.c = function (a, b) {
    return (a === b ? 0 : // Values are equal
      (a < b ? -1 : // (-0.0, 0.0) or (!NaN, NaN)
        1));
  };
};
phantasus.SpecifiedGroupByKey.prototype = {
  toString: function () {
    return this.name;
  },
  getComparator: function (a, b) {
    return this.c;
  },
  getValue: function (i) {
    return this.clusterIds[i];
  }
};
phantasus.Util.extend(phantasus.SpecifiedGroupByKey, phantasus.AbstractSortKey);

phantasus.SortKey.SortOrder = {
  ASCENDING: 0,
  DESCENDING: 1,
  UNSORTED: 2,
  CUSTOM: 3,
  TOP_N: 4
};
/**
 * Comparator to sort ascending using lowercase string comparison
 */
phantasus.SortKey.ASCENDING_COMPARATOR = function (a, b) {
  // we want NaNs to end up at the bottom
  var aNaN = (a == null);
  var bNaN = (b == null);
  if (aNaN && bNaN) {
    return 0;
  }
  if (aNaN) {
    return 1;
  }
  if (bNaN) {
    return -1;
  }
  a = ('' + a).toLowerCase();
  b = ('' + b).toLowerCase();
  return (a === b ? 0 : (a < b ? -1 : 1));
};
/**
 * Comparator to sort descending using lowercase string comparison
 */
phantasus.SortKey.DESCENDING_COMPARATOR = function (a, b) {
  var aNaN = (a == null);
  var bNaN = (b == null);
  if (aNaN && bNaN) {
    return 0;
  }
  if (aNaN) {
    return 1;
  }
  if (bNaN) {
    return -1;
  }
  a = ('' + a).toLowerCase();
  b = ('' + b).toLowerCase();
  return (a === b ? 0 : (a < b ? 1 : -1));
};

phantasus.SortKey.NUMBER_ASCENDING_COMPARATOR = function (a, b) {
  // we want NaNs to end up at the bottom
  var aNaN = (a == null || isNaN(a));
  var bNaN = (b == null || isNaN(b));
  if (aNaN && bNaN) {
    return 0;
  }
  if (aNaN) {
    return 1;
  }
  if (bNaN) {
    return -1;
  }
  return (a === b ? 0 : (a < b ? -1 : 1));
};

phantasus.SortKey.NUMBER_DESCENDING_COMPARATOR = function (a, b) {
  var aNaN = (a == null || isNaN(a));
  var bNaN = (b == null || isNaN(b));
  if (aNaN && bNaN) {
    return 0;
  }
  //noinspection JSConstructorReturnsPrimitive
  if (aNaN) {
    return 1;
  }
  if (bNaN) {
    return -1;
  }
  return (a === b ? 0 : (a < b ? 1 : -1));
};

phantasus.SortKey.STRING_ASCENDING_COMPARATOR = function (a, b) {
  a = (a == null || a.toLowerCase === undefined) ? null : a.toLowerCase();
  b = (b == null || b.toLowerCase === undefined) ? null : b.toLowerCase();
  return (a === b ? 0 : (a < b ? -1 : 1));
};
phantasus.SortKey.STRING_DESCENDING_COMPARATOR = function (a, b) {
  a = (a == null || a.toLowerCase === undefined) ? null : a.toLowerCase();
  b = (b == null || b.toLowerCase === undefined) ? null : b.toLowerCase();
  return (a === b ? 0 : (a < b ? 1 : -1));
};

phantasus.SortKey.ELEMENT_ASCENDING_COMPARATOR = function (obj1, obj2) {
  var a = +obj1;
  var b = +obj2;
  var aNaN = isNaN(a);
  var bNaN = isNaN(b);
  if (aNaN && bNaN) {
    return 0;
  }
  if (aNaN) {
    return 1;
  }
  if (bNaN) {
    return -1;
  }

  if (a === b) {
    if (obj1 != null && obj1.toObject && obj2 != null && obj2.toObject) {
      var a1 = obj1.toObject();
      var b1 = obj2.toObject();
      for (var name in a1) {
        a = a1[name];
        b = b1[name];

        var c = (a === b ? 0 : (a < b ? -1 : 1));
        if (c !== 0) {
          return c;
        }
      }
    }
  }
  return (a === b ? 0 : (a < b ? -1 : 1));
};

phantasus.SortKey.ELEMENT_DESCENDING_COMPARATOR = function (obj1, obj2) {
  // we want NaNs to end up at the bottom
  var a = +obj1;
  var b = +obj2;
  var aNaN = isNaN(a);
  var bNaN = isNaN(b);
  if (aNaN && bNaN) {
    return 0;
  }
  if (aNaN) {
    return 1;
  }
  if (bNaN) {
    return -1;
  }
  if (a === b) {
    if (obj1 != null && obj1.toObject && obj2 != null && obj2.toObject) {
      var a1 = obj1.toObject();
      var b1 = obj2.toObject();
      for (var name in a1) {
        a = a1[name];
        b = b1[name];
        var c = (a === b ? 0 : (a < b ? 1 : -1));
        if (c !== 0) {
          return c;
        }
      }
    }
  }
  return (a === b ? 0 : (a < b ? 1 : -1));
};
phantasus.SortKey.BOX_PLOT_SUMMARY_FUNCTION = function (array) {
  var box = array.box;
  if (box == null) {
    var v = phantasus.VectorUtil.arrayAsVector(array);
    box = phantasus
      .BoxPlotItem(this.indices != null ? new phantasus.SlicedVector(
        v, this.indices) : v);
    array.box = box;
  }

  return box.q3;
};

phantasus.SortKey.ARRAY_MAX_SUMMARY_FUNCTION = function (array) {
  var a = 0;
  if (array != null) {
    var aPosMax = -Number.MAX_VALUE;
    var aNegMax = Number.MAX_VALUE;
    for (var i = 0, length = array.length; i < length; i++) {
      var value = array[i];
      if (!isNaN(value)) {
        if (value >= 0) {
          aPosMax = value > aPosMax ? value : aPosMax;
        } else {
          aNegMax = value < aNegMax ? value : aNegMax;
        }
      }
    }

    if (aPosMax !== -Number.MAX_VALUE) {
      a = aPosMax;
    }
    if (aNegMax !== Number.MAX_VALUE) {
      a = Math.abs(aNegMax) > a ? aNegMax : a;
    }
  }
  return a;
};
phantasus.SortKey.ARRAY_ASCENDING_COMPARATOR = function (summary) {
  return function (a, b) {
    var aNaN = a == null;
    var bNaN = b == null;
    if (aNaN && bNaN) {
      return 0;
    }
    if (aNaN) {
      return 1;
    }
    if (bNaN) {
      return -1;
    }
    a = summary(a);
    b = summary(b);
    aNaN = isNaN(a);
    bNaN = isNaN(b);
    if (aNaN && bNaN) {
      return 0;
    }
    if (aNaN) {
      return 1;
    }
    if (bNaN) {
      return -1;
    }
    return (a === b ? 0 : (a < b ? -1 : 1));
  };
};

phantasus.SortKey.ARRAY_DESCENDING_COMPARATOR = function (summary) {
  return function (a, b) {
    var aNaN = a == null;
    var bNaN = b == null;
    if (aNaN && bNaN) {
      return 0;
    }
    if (aNaN) {
      return 1;
    }
    if (bNaN) {
      return -1;
    }
    a = summary(a);
    b = summary(b);
    aNaN = isNaN(a);
    bNaN = isNaN(b);
    if (aNaN && bNaN) {
      return 0;
    }
    if (aNaN) {
      return 1;
    }
    if (bNaN) {
      return -1;
    }
    return (a === b ? 0 : (a < b ? 1 : -1));
  };
};

phantasus.SortKey.reverseComparator = function (c) {
  return function (a, b) {
    return c(b, a);
  };
};
phantasus.SortKey.keepExistingSortKeys = function (newSortKeys, existingSortKeys) {
  for (var i = 0, length = existingSortKeys.length; i < length; i++) {
    var key = existingSortKeys[i];
    if (key.getLockOrder() > 0) {
      // 1 is beginning, 2 is end
      // don' add it 2x
      var existingIndex = -1;
      for (var j = 0; j < newSortKeys.length; j++) {
        if (newSortKeys[j] === key) {
          existingIndex = j;
          break;
        }
      }
      if (existingIndex !== -1) { // remove
        newSortKeys.splice(existingIndex, 1);
      }
      newSortKeys.splice(key.getLockOrder() === 1 ? 0 : newSortKeys.length, 0, key);
    }
  }
  return newSortKeys;
};

phantasus.SortKey.fromJSON = function (project, json) {
  var sortKeys = [];
  json.forEach(function (key) {
    var sortKey = null;
    if (key.type === 'annotation') {
      sortKey = new phantasus.SortKey(key.field, key.order, key.isColumns);
      if (key.customSortOrder != null) {

        var customSortOrderMap = new phantasus.Map();
        for (var i = 0, size = key.customSortOrder.length; i < size; i++) {
          customSortOrderMap.set(key.customSortOrder[i], i);
        }
        var comparator = function (a, b) {
          var v1 = customSortOrderMap.get(a);
          var v2 = customSortOrderMap.get(b);
          if (v1 === undefined && v2 === undefined) {
            return 0;
          }
          if (v1 === undefined) {
            v1 = Infinity;
          }
          if (v2 === undefined) {
            v2 = Infinity;
          }
          return (v1 < v2 ? -1 : 1);
        };
        sortKey.customComparator = comparator;
        if (key.preservesDendrogram) {
          sortKey.nvisible = key.customSortOrder.length;
        }
      }

    } else if (key.type === 'byValues') {
      sortKey = new phantasus.SortByValuesKey(key.modelIndices, key.order, key.isColumns);
    } else if (key.type === 'specified') {
      sortKey = new phantasus.SpecifiedModelSortOrder(key.modelIndices, key.nvisible, key.name, key.isColumns);
    } else if (key.type === 'matchesOnTop') {
      sortKey = new phantasus.MatchesOnTopSortKey(project, key.modelIndices, key.name, key.isColumns);
    } else {
      if (key.field != null) {
        sortKey = new phantasus.SortKey(key.field, key.order);
      } else {
        console.log('Unknown key: ' + key);
      }
    }
    if (sortKey != null) {
      if (key.preservesDendrogram != null) {
        sortKey.setPreservesDendrogram(key.preservesDendrogram);
      }
      if (key.lockOrder != null && key.lockOrder !== 0) {
        sortKey.setLockOrder(key.lockOrder);
        sortKey.setUnlockable(key.unlockable);
      }
      sortKeys.push(sortKey);
    }
    if (sortKey != null) {
      if (key.preservesDendrogram != null) {
        sortKey.setPreservesDendrogram(key.preservesDendrogram);
      }
      if (key.lockOrder != null && key.lockOrder !== 0) {
        sortKey.setLockOrder(key.lockOrder);
        sortKey.setUnlockable(key.unlockable);
      }
      sortKeys.push(sortKey);
    }
  });
  return sortKeys;
};

phantasus.SortKey.toJSON = function (sortKeys) {
  var json = [];
  sortKeys.forEach(function (key) {
    var sortKey = null;
    if (key instanceof phantasus.SortKey) {
      sortKey = {
        isColumns: key.isColumns(),
        order: key.getSortOrder(),
        type: 'annotation',
        field: '' + key
      };
    } else if (key instanceof phantasus.SortByValuesKey) {
      sortKey = {
        isColumns: key.isColumns(),
        order: key.getSortOrder(),
        type: 'byValues',
        modelIndices: key.modelIndices
      };
    } else if (key instanceof phantasus.SpecifiedModelSortOrder) {
      sortKey = {
        isColumns: key.isColumns(),
        order: key.getSortOrder(),
        type: 'specified',
        modelIndices: key.modelIndices,
        name: key.name,
        nvisible: key.nvisible
      };
    } else if (key instanceof phantasus.MatchesOnTopSortKey) {
      sortKey = {
        isColumns: key.isColumns(),
        order: key.getSortOrder(),
        type: 'matchesOnTop',
        modelIndices: key.modelIndices,
        name: key.name
      };
    }
    if (sortKey != null) {
      sortKey.preservesDendrogram = key.isPreservesDendrogram();
      if (key.getLockOrder && key.getLockOrder() !== 0) {
        sortKey.lockOrder = key.getLockOrder();
        sortKey.unlockable = key.isUnlockable ? key.isUnlockable() : false;
      }
      json.push(sortKey);
    } else {
      console.log('Unknown sort key type');
    }
  });
  return json;
};
