phantasus.factorizeColumn = function (vector) {
  var self = this;

  this.v = vector;
  if (vector.isFactorized()) {
    this.values = vector.getFactorLevels();
  } else {
    this.values = phantasus.VectorUtil.getSet(vector).values();
  }

  var tooltipHelp = [
    'Drag elements',
    'Use Ctrl+Click or Shift+Click to select multiple items'
  ].join('<br/>');

  var valuesHTML = this.values.map(function (value) {
    return '<li >' + value + '</li>'
  }).join('');

  this.$dialog = $('<div style="background:white;" title="' + phantasus.factorizeColumn.prototype.toString() + '"></div>');
  this.$el = $([
    '<div class="container-fluid" style="height: 100%">',
    ' <div class="row" style="height: 100%">',
    '   <div class="col-xs-12" data-name="selector" style="height: 100%">',
    '     <div class="form-group">',
    '        <label>Values<div style="padding-left: 5px;" class="fa fa-question-circle" data-toggle="tooltip" title="' + tooltipHelp + '"></div></label>',
    '        <ul class="sortable-list">' + valuesHTML + '</ul>',
    '     </div>',
    '   </div>',
    ' </div>',
    '</div>',
    '</div>'].join('')
  );

  this.selector = this.$el.find('.sortable-list');
  this.selector.multisortable({
    delay: 150
  });
  this.$el.appendTo(this.$dialog);
  this.$el.find('[data-toggle="tooltip"]').tooltip({});

  this.$dialog.dialog({
    open: function (event, ui) {
      $(this).css('overflow', 'visible');
    },
    close: function (event, ui) {
      self.$dialog.dialog('destroy').remove();
      event.stopPropagation();
    },
    buttons: {
      'Apply': function () {
        var newValues = self.selector.find('li').map(function(){
                          return $(this).text();
                        }).get();

        vector.factorize(newValues);
        self.$dialog.dialog('destroy').remove();
      },
      'Reset': function () {
        vector.defactorize();
        self.$dialog.dialog('destroy').remove();
      },
      'Cancel': function () {
        self.$dialog.dialog('destroy').remove();
      }
    },

    resizable: false,
    height: 400,
    width: 600
  });
};

phantasus.factorizeColumn.prototype = {
  toString: function () {
    return "Change sort order";
  }
};
