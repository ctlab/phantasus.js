phantasus.FormBuilder = function (options) {
  var _this = this;
  this.prefix = _.uniqueId('form');
  this.$form = $('<form></form>');
  this.$form.attr('role', 'form').attr('id', this.prefix);
  this.formStyle = options == null || options.formStyle == null ? 'horizontal' : options.formStyle;
  this.$form.addClass('phantasus');
  if (this.formStyle === 'horizontal') {
    this.titleClass = 'col-xs-12 control-label';
    this.labelClass = 'col-xs-4 control-label';
    this.$form.addClass('form-horizontal');
  } else if (this.formStyle === 'vertical') {
    this.labelClass = 'control-label';
    this.titleClass = 'control-label';
  } else if (this.formStyle === 'inline') {
    this.titleClass = '';
    this.labelClass = '';
    this.$form.addClass('form-inline');
  }
  this.$form.on('submit', function (e) {
    e.preventDefault();
  });
  this.$form.on(
    'dragover',
    function (e) {
      var node = $(e.originalEvent.srcElement).parent().parent()
        .prev();
      if (node.is('select') && node.hasClass('file-input')) {
        $(e.originalEvent.srcElement).parent().css('border',
          '1px solid black');
        e.preventDefault();
        e.stopPropagation();
      }
    }).on(
    'dragenter',
    function (e) {
      var node = $(e.originalEvent.srcElement).parent().parent()
        .prev();
      if (node.is('select') && node.hasClass('file-input')) {
        $(e.originalEvent.srcElement).parent().css('border',
          '1px solid black');
        e.preventDefault();
        e.stopPropagation();
      }
    }).on('dragleave', function (e) {
    var node = $(e.originalEvent.srcElement).parent().parent().prev();
    if (node.is('select') && node.hasClass('file-input')) {
      $(e.originalEvent.srcElement).parent().css('border', '');
      e.preventDefault();
      e.stopPropagation();
    }
  }).on('drop', function (e) {
    var node = $(e.originalEvent.srcElement).parent().parent().prev();
    if (node.is('select') && node.hasClass('file-input')) {
      var isMultiple = node.data('multiple'); // multiple files?
      $(e.originalEvent.srcElement).parent().css('border', '');
      var name = node.attr('name');
      name = name.substring(0, name.length - '_picker'.length);
      if (e.originalEvent.dataTransfer) {
        if (e.originalEvent.dataTransfer.files.length) {
          e.preventDefault();
          e.stopPropagation();
          var files = e.originalEvent.dataTransfer.files;
          _this.setValue(name, isMultiple ? files : files[0]);
          _this.trigger('change', {
            name: name,
            value: files[0]
          });
        } else {
          var url = e.originalEvent.dataTransfer.getData('URL');
          e.preventDefault();
          e.stopPropagation();
          _this.setValue(name, isMultiple ? [url] : url);
          _this.trigger('change', {
            name: name,
            value: url
          });
        }
      }
    }
  });
  // this.labelColumnDef = '4';
  // this.fieldColumnDef = '8';
};

phantasus.FormBuilder.showProgressBar = function (options) {
  var content = [];
  content.push('<div class="container-fluid">');
  content.push('<div class="row">');
  content.push('<div class="col-xs-8">');
  content
    .push(
      '<div class="progress progress-striped active"><div class="progress-bar" role="progressbar" aria-valuenow="100" aria-valuemin="0" aria-valuemax="100" style="width: 100%"></div></div>');
  content.push('</div>'); // col
  content.push('<div class="col-xs-2">');
  content
    .push('<input class="btn btn-default" type="button" name="stop" value="Cancel">');
  content.push('</div>'); // col
  content.push('</div>'); // row
  if (options.subtitle) {
    content.push('<div class="row"><div class="col-xs-8">');
    content.push('<p class="text-muted">');
    content.push(options.subtitle);
    content.push('</p>');
    content.push('</div></div>');
  }
  content.push('</div>');
  var $content = $(content.join(''));
  $content.find('[name=stop]').on('click', function (e) {
    options.stop();
    e.preventDefault();
  });
  return phantasus.FormBuilder.showInDraggableDiv({
    title: options.title,
    $content: $content
  });
};
phantasus.FormBuilder.showInDraggableDiv = function (options) {
  var width = options.width || '300px';
  var html = [];
  html
    .push('<div style="z-index: 1050; top: 100px; position:absolute; padding-left:10px; padding-right:10px; width:'
      + width
      + ' ; background:white; box-shadow: 0 5px 15px rgba(0,0,0,0.5); border: 1px solid rgba(0,0,0,0.2); border-radius: 6px;">');

  if (options.title != null) {
    html
      .push('<h4 style="cursor:move; border-bottom: 1px solid #e5e5e5;" name="header">'
        + options.title + '</h4>');
  }
  html.push('<div name="content"></div>');
  html.push('</div>');

  var $div = $(html.join(''));
  var $content = $div.find('[name=content]');
  $div.find('[name=header]').on('dblclick', function () {
    if ($content.css('display') === 'none') {
      $content.css('display', '');
    } else {
      $content.css('display', 'none');
    }
  });

  options.$content.appendTo($content);
  $div.css('left', ($(window).width() / 2) - $content.outerWidth() / 2);
  $div.draggable({
    //handle: '[name=header]',
    containment: 'document'
  });
  // $div.resizable();
  $div.appendTo(options.appendTo != null ? options.appendTo : $(document.body));
  return $div;
};

phantasus.FormBuilder.showMessageModal = function (options) {
  var $div = phantasus.FormBuilder
    ._showInModal({
      modalClass: options.modalClass,
      title: options.title,
      html: options.html,
      footer: ('<button type="button" class="btn btn-default"' +
        ' data-dismiss="modal">OK</button>'),
      backdrop: options.backdrop,
      size: options.size,
      focus: options.focus,
      appendTo: options.appendTo
    });
  $div.find('button').focus();
  return $div;

  // if (options.draggable) {
  // $div.draggable({
  // handle : $div.find(".modal-header")
  // });
  // }
};

phantasus.FormBuilder._showInModal = function (options) {
  var html = [];
  options = $.extend({}, {
    size: '',
    close: true,
    modalClass: ''
  }, options);
  html.push('<div tabindex="-1" class="modal' + (options.modalClass ? (' ' + options.modalClass) : '') + '" role="dialog"' +
    ' aria-hidden="false"');
  if (options.z) {
    html.push(' style="z-index: ' + options.z + ' !important;"');
  }
  html.push('>');
  html.push('<div class="modal-dialog ' + options.size + '">');
  html.push('<div class="modal-content">');
  html.push(' <div class="modal-header">');
  if (options.close) {
    html
      .push('  <button type="button" class="close" data-dismiss="modal" aria-label="Close"><span aria-hidden="true">×</span></button>');
  }
  if (options.title != null) {
    html.push('<h4 class="modal-title">' + options.title + '</h4>');
  }
  html.push('</div>');
  html.push('<div class="modal-body">');
  html.push('</div>');
  if (options.footer) {
    html.push('<div class="modal-footer">');
    html.push(options.footer);
  }
  html.push('</div>');
  html.push('</div>');
  html.push('</div>');
  html.push('</div>');
  var $div = $(html.join(''));
  $div.on('mousewheel', function (e) {
    e.stopPropagation();
  });
  $div.find('.modal-body').html(options.html);
  $div.prependTo(options.appendTo != null ? options.appendTo : $(document.body));
  $div.modal({
    keyboard: true,
    backdrop: options.backdrop === true ? true : false
  }).on('hidden.bs.modal', function (e) {
    $div.remove();
    if (options.onClose) {
      options.onClose();
    }
    if (options.focus) {
      $(options.focus).focus();
    }
  });

  return $div;
};
/**
 *
 * @param options.z Modal z-index
 * @param options.title Modal title
 * @param options.html Model content
 * @param options.close Whether to show a close button in the footer
 * @param options.onClose {Function} Funtion to invoke when modal is hidden
 * @param options.backdrop Whether to show backdrop
 * @param.options Modal size
 * @param options.focus Element to return focus to when modal is hidden
 * @param options.modalClass
 */
phantasus.FormBuilder.showInModal = function (options) {
  return phantasus.FormBuilder
    ._showInModal({
      modalClass: options.modalClass,
      title: options.title,
      html: options.html,
      footer: options.close ? ('<button type="button" class="btn btn-default" data-dismiss="modal">'
        + options.close + '</button>')
        : null,
      onClose: options.onClose,
      appendTo: options.appendTo,
      backdrop: options.backdrop,
      size: options.size,
      focus: options.focus,
      z: options.z // was used before yet dissappeared
    });
  // if (options.draggable) {
  // $div.draggable({
  // handle : $div.find(".modal-header")
  // });
  // }
};

/**
 *
 * @param options.ok
 * @param options.cancel
 * @param options.apply
 * @param options.title
 * @param options.content
 * @param options.okCallback
 * @param options.cancelCallba
 * @param options.okFocus
 *
 */
phantasus.FormBuilder.showOkCancel = function (options) {
  options = $.extend({}, {
    ok: true,
    cancel: true
  }, options);
  var footer = [];
  if (options.ok) {
    footer
      .push('<button name="ok" type="button" class="btn btn-default">OK</button>');
  }
  if (options.apply) {
    footer
      .push('<button name="apply" type="button" class="btn btn-default">Apply</button>');
  }
  if (options.cancel) {
    footer
      .push('<button name="cancel" type="button" data-dismiss="modal" class="btn btn-default">Cancel</button>');
  }
  var $div = phantasus.FormBuilder._showInModal({
    title: options.title,
    html: options.content,
    footer: footer.join(''),
    size: options.size,
    close: options.close,
    onClose: options.onClose,
    focus: options.focus,
    appendTo: options.appendTo
  });
  // if (options.align === 'right') {
  // $div.css('left', $(window).width()
  // - $div.find('.modal-content').width() - 60);
  // }

  var $ok = $div.find('[name=ok]');
  $ok.on('click', function (e) {
    if (options.okCallback) {
      options.okCallback();
    }
    $div.modal('hide');
  });
  $div.find('[name=cancel]').on('click', function (e) {
    if (options.cancelCallback) {
      options.cancelCallback();
    }
    $div.modal('hide');
  });
  if (options.okFocus) {
    $ok.focus();
  }

  if (options.draggable) {
    $div.draggable({
      handle: '.modal-header',
      containment: 'document'
    });
  }
  return $div;
};

phantasus.FormBuilder.hasChanged = function (object, keyToUIElement) {
  var keys = _.keys(keyToUIElement);
  for (var i = 0; i < keys.length; i++) {
    var key = keys[i];
    var value = object[key];
    var $element = keyToUIElement[key];
    if (value !== phantasus.FormBuilder.getValue($element)) {
      return true;
    }
  }
  return false;
};
phantasus.FormBuilder.getValue = function ($element) {
  var list = $element.data('phantasus.checkbox-list');
  if (list != null) {
    return list.val();
  }
  if ($element.attr('type') === 'radio') {
    return $element.filter(':checked').val();
  }
  if ($element.data('type') === 'file') {
    return $element.data('files');
  }
  if ($element.data('type') === 'collapsed-checkboxes') {
    var result = [];
    $element.find('input').each(function (a, checkbox) {
      var $checkbox = $(checkbox);

      if ($checkbox.prop('checked')) {
        result.push($checkbox.prop('name'));
      }
    });

    return result;
  }
  return $element.attr('type') === 'checkbox' ? $element.prop('checked') : $element.val();
};

phantasus.FormBuilder.prototype = {
  appendContent: function ($content) {
    this.$form.append($content);
  },
  addSeparator: function () {
    var html = [];
    html.push('<div class="form-group">');
    if (this.formStyle === 'horizontal') {
      html.push('<div class="col-xs-12">');
    }
    html.push('<hr />');
    if (this.formStyle === 'horizontal') {
      html.push('</div>');
    }
    html.push('</div>');
    this.$form.append(html.join(''));
  },
  _append: function (html, field, isFieldStart) {
    var _this = this;
    var required = field.required;
    var name = field.name;
    var type = field.type;
    if (type == 'separator') {
      if (this.formStyle === 'horizontal') {
        html.push('<div class="col-xs-12">');
      } else {
        html.push('<div class="form-group">');
      }

      html.push('<hr />');
      html.push('</div>');
      return;
    }
    var title = field.title;
    var disabled = field.disabled;
    var help = field.help;
    var value = field.value;
    var showLabel = field.showLabel;
    var tooltipHelp = field.tooltipHelp;
    var selectedFormat = field.selectedFormat || 'count';
    var style = field.style || '';
    var col = '';
    var labelColumn = '';
    if (this.formStyle === 'horizontal') {
      col = field.col || 'col-xs-8';
    }

    if (showLabel === undefined) {
      showLabel = 'checkbox' !== type && 'button' !== type
        && 'radio' !== type;
      showLabel = showLabel || field.options !== undefined;
    }
    var id = _this.prefix + '_' + name;
    if (title === undefined) {
      title = name.replace(/_/g, ' ');
      title = title[0].toUpperCase() + title.substring(1);
    }
    var endingDiv = false;
    if (showLabel) {
      html.push('<label for="' + id + '" class="' + this.labelClass
        + '">');
      html.push(title);
      if (tooltipHelp) {
        html.push('<div style="padding-left: 5px;" class="fa fa-question-circle" data-toggle="tooltip" data-placement="top" title="' + tooltipHelp + '"></div>');

      }
      html.push('</label>');
      if (isFieldStart && this.formStyle !== 'inline') {
        html.push('<div class="' + col + '">');
        endingDiv = true;
      }
    } else if (isFieldStart && this.formStyle === 'horizontal') { // no label
      html.push('<div class="col-xs-offset-4 ' + col + '">');
      endingDiv = true;
    }
    if ('radio' === type) {
      if (field.options) {
        _.each(field.options,
          function (choice) {
            var isChoiceObject = _.isObject(choice)
              && choice.value !== undefined;
            var optionValue = isChoiceObject ? choice.value
              : choice;
            var optionText = isChoiceObject ? choice.name
              : choice;
            var selected = value === optionValue;
            html.push('<div class="radio"><label>');
            html.push('<input style="' + style + '" value="' + optionValue
              + '" name="' + field.name
              + '" type="radio"');
            if (selected) {
              html.push(' checked');
            }
            html.push('> ');
            if (choice.icon) {
              html.push('<span class="' + choice.icon
                + '"></span> ');
            }
            optionText = optionText[0].toUpperCase()
              + optionText.substring(1);
            html.push(optionText);
            html.push('</label></div>');
          });
      } else {
        html.push('<div class="radio"><label>');
        html.push('<input style="' + style + '" value="' + value + '" name="' + name
          + '" id="' + id + '" type="radio"');
        if (field.checked) {
          html.push(' checked');
        }
        html.push('> ');
        html.push(value[0].toUpperCase() + value.substring(1));
        html.push('</label></div>');
      }
    } else if ('collapsed-checkboxes' === type) {
      var checkboxes = field.checkboxes;
      html.push('<div id="' + id + '" data-name="' + name + '" data-type="collapsed-checkboxes">');
      html.push('<button style="' + style + '" type="button" class="btn btn-default btn-sm" data-toggle="collapse" data-target="#' + id + '_collapse">');
      if (field.icon) {
        html.push('<span class="' + field.icon + '"></span> ');
      }
      html.push(value ? value : title);
      html.push('</button>');

      html.push('<div class="collapse" id="' + id + '_collapse">' +
        '  <div class="well">');

      checkboxes.forEach(function (checkbox) {
        var name = checkbox.name;
        var checkboxId = id + name;
        var value = checkbox.value;
        var disabled = checkbox.disabled;
        var title = checkbox.title || name;

        html.push('<div class="checkbox"><label>');
        html.push('<input style="' + style + '" name="' + name + '" id="' + checkboxId
          + '" type="checkbox"');
        if (value) {
          html.push(' checked');
        }
        if (disabled) {
          html.push(' disabled');
        }
        html.push('> ');
        html.push(title);
        html.push('</label></div>');
      });

      html.push('</div></div>');
      html.push('</div>');
    } else if ('checkbox' === type) {
      html.push('<div class="checkbox"><label>');
      html.push('<input style="' + style + '" name="' + name + '" id="' + id
        + '" type="checkbox"');
      if (value) {
        html.push(' checked');
      }
      if (disabled) {
        html.push(' disabled');
      }
      html.push('> ');
      html.push(title);
      html.push('</label></div>');
    } else if ('checkbox-list' === type) {
      html.push('<div name="' + name + '" class="checkbox-list"><div>');
    } else if ('triple-select' === type) {
      html.push('<h5 style="margin-top: 5px; margin-bottom: 5px;">' + name + ':</h5>');
      html.push('<select style="' + field.comboboxStyle + '" name="' + field.firstName + '" id="' + id
        + '" class="form-control">');
      _.each(field.firstOptions, function (value, index) {
          html.push('<option value="');
          html.push(value);
          html.push('"');
          if (index === 0) {
            html.push(' selected');
          }
          html.push('>');
          html.push(value);
          html.push('</option>');
      });
      html.push('</select>');

      if (field.firstDivider) {
        html.push('<span id="' + name +'-first-divider">' + field.firstDivider + '</span>');
      }

      html.push('<select style="' + field.comboboxStyle + '" name="' + field.secondName + '" id="' + id
        + '" class="form-control">');
      _.each(field.secondOptions, function (value, index) {
        html.push('<option value="');
        html.push(value);
        html.push('"');
        if (index === 0) {
          html.push(' selected');
        }
        html.push('>');
        html.push(value);
        html.push('</option>');
      });
      html.push('</select>');

      if (field.secondDivider) {
        html.push('<span id="' + name +'-second-divider">' + field.secondDivider + '</span>');
      }

      html.push('<select style="' + field.comboboxStyle + '" name="' + field.thirdName + '" id="' + id
        + '" class="form-control">');
      _.each(field.thirdOptions, function (value, index) {
        html.push('<option value="');
        html.push(value);
        html.push('"');
        if (index === 0) {
          html.push(' selected');
        }
        html.push('>');
        html.push(value);
        html.push('</option>');
      });
      html.push('</select>');
    } else if ('select' == type || type == 'bootstrap-select') {
      // if (field.multiple) {
      // field.type = 'bootstrap-select';
      // type = 'bootstrap-select';
      // }
      if (type == 'bootstrap-select') {
        html.push('<select style="' + style + '" data-size="5" data-live-search="' + (field.search ? true : false) + '" data-selected-text-format="' + selectedFormat + '" name="'
          + name + '" id="' + id
          + '" data-actions-box="' + (field.selectAll ? true : false) + '" class="selectpicker' + (this.formStyle !== 'inline' ? ' form-control' : '') + '"');
      } else {
        html.push('<select style="' + style + '" name="' + name + '" id="' + id
          + '" class="form-control"');
      }
      if (disabled) {
        html.push(' disabled');
      }
      if (field.multiple) {
        html.push(' multiple');
      }
      html.push('>');
      _.each(field.options, function (choice) {
        if (choice && choice.divider) {
          html.push('<option data-divider="true"></option>');
        } else {
          html.push('<option value="');
          var isChoiceObject = _.isObject(choice)
            && choice.value !== undefined;
          var optionValue = isChoiceObject ? choice.value : choice;
          var optionText = isChoiceObject ? choice.name : choice;
          html.push(optionValue);
          html.push('"');
          var selected = false;
          if (_.isObject(value)) {
            selected = value[optionValue];
          } else if (_.isArray(value)) {
            selected = value.indexOf(optionValue) !== -1;
          } else {
            selected = value == optionValue;
          }
          if (selected) {
            html.push(' selected');
          }
          html.push('>');
          html.push(optionText);
          html.push('</option>');
        }
      });
      html.push('</select>');
      if (field.type == 'bootstrap-select' && field.toggle) {
        html.push('<p class="help-block"><a data-name="' + name
          + '_all" href="#">All</a>&nbsp;|&nbsp;<a data-name="' + name
          + '_none" href="#">None</a></p>');
        _this.$form.on('click', '[data-name=' + name + '_all]',
          function (evt) {
            evt.preventDefault();
            var $select = _this.$form
              .find('[name=' + name + ']');
            $select.selectpicker('val', $.map($select
              .find('option'), function (o) {
              return $(o).val();
            }));
            $select.trigger('change');
          });
        _this.$form.on('click', '[data-name=' + name + '_none]',
          function (evt) {
            evt.preventDefault();
            var $select = _this.$form
              .find('[name=' + name + ']');
            $select.selectpicker('val', []);
            $select.trigger('change');
          });
      }
    } else if ('textarea' == type) {
      html.push('<textarea style="' + style + '" id="' + id + '" class="form-control" name="'
        + name + '"');
      if (required) {
        html.push(' required');
      }
      if (field.placeholder) {
        html.push(' placeholder="' + field.placeholder + '"');
      }
      if (disabled) {
        html.push(' disabled');
      }
      html.push('>');
      if (value != null) {
        html.push(value);
      }
      html.push('</textarea>');
    } else if ('button' == type) {
      html.push('<button style="' + style + '" id="' + id + '" name="' + name
        + '" type="button" class="btn btn-default btn-sm">');
      if (field.icon) {
        html.push('<span class="' + field.icon + '"></span> ');
      }
      html.push(value ? value : title);
      html.push('</button>');
    } else if ('custom' === type) {
      html.push(value);
    } else if ('file' === type) {
      var isMultiple = field.multiple == null ? false : field.multiple;
      html
        .push('<select data-multiple="'
          + isMultiple
          + '" data-type="file" title="'
          + (field.placeholder || (isMultiple ? 'Choose one or more files...'
            : 'Choose a file...'))
          + '" name="'
          + name
          + '_picker" data-width="35%" class="file-input selectpicker form-control">');
      var options = [];

      if (field.options) {
        options = options.concat(field.options);

      }

      var allowedInputs = field.allowedInputs || {all: true};


      // data types are file, dropbox, url, GEO, preloaded and predefined
      if (allowedInputs.all || allowedInputs.computer) options.push('My Computer');
      if (allowedInputs.all || allowedInputs.url) options.push('URL');
      if (allowedInputs.all || allowedInputs.geo) options.push('GEO Datasets');
      if (allowedInputs.all || allowedInputs.saved) options.push('Saved on server datasets');
      if (field.text != null) {
        options.push(field.text);
      }
      _.each(options, function (choice, index) {
        var isChoiceObject = _.isObject(choice)
          && choice.value !== undefined;
        var optionValue = isChoiceObject ? choice.value : choice;
        var optionText = isChoiceObject ? choice.name : choice;
        html.push('<option value="');
        html.push(optionValue);
        html.push('"');
        if (isChoiceObject && choice.disabled) {
          html.push(' disabled');
        }
        if (optionValue === 'My Computer') {
          html.push(' data-icon="fa fa-desktop"');
        } else if (optionValue === 'URL') {
          html.push(' data-icon="fa fa-external-link"');
        } else if (optionValue === 'GEO Datasets') {
          html.push(' data-icon="fa fa-external-link"');
        } else if (optionValue === 'Saved on server datasets') {
          html.push(' data-icon="fa fa-desktop"');
        }
        html.push('>');
        html.push(optionText);
        html.push('</option>');
      });
      html.push('</select>');

      html.push('<div>');

      html.push('<div id="'+name+'_url"style="display: none">');
      html
        .push('<input placeholder="'
          + (isMultiple ? 'Enter one or more URLs'
            : 'Enter a URL')
          + '" class="form-control" style="width:50%; display:inline-block;" type="text" name="'
          + name + '_url">');
      html.push('<input type="submit" style="margin-left: 10px;" class="btn button-default" value="Load">');
      html.push('</div>');

/*      if (field.preloadedExists) {
        html
          .push('<input placeholder="'
            + 'Enter a name of preloaded dataset this server provides them'
            + '" class="form-control" style="width:50%; display:none;" type="text" name="'
            + name + '_pre">');
      }*/

      if (field.gse !== false) {
        html.push('<div id="'+name+'_geo" style="display: none">');
        html
          .push('<input placeholder="'
            + "Enter a GSE or GDS identifier (e.g. GSE53986)"
            + '" class="form-control" style="width:50%; display:inline-block;" type="text" name="'
            + name + '_geo">');
        html.push('<input type="submit" style="margin-left: 10px;" class="btn button-default" value="Load">');
        html.push('</div>');
      }
      if (field.text) {
        html
          .push('<input class="form-control" style="width:50%; display:none;" type="text" name="'
            + name + '_text">');
      }

      html.push('<div id="'+name+'_pre" style="display: none">');
      html
        .push('<input placeholder="'
          + 'Enter a dataset name here'
          + '" class="form-control" style="width:50%; display:inline-block;" type="text" name="'
          + name + '_pre">');
      html.push('<input type="submit" style="margin-left: 10px;" class="btn button-default" value="Load">');
      html.push('</div>');

      html.push('</div>');

      html.push('<input style="display:none;" type="file" name="' + name
        + '_file"' + (isMultiple ? ' multiple' : '') + '>');
      // browse button clicked
      // select change
      _this.$form
        .on(
          'change',
          '[name=' + name + '_picker]',
          function (evt) {
            var $this = $(this);
            var val = $this.val();
            var showUrlInput = val === 'URL';
            var showGSEInput = val === 'GEO Datasets';
            var showTextInput = val === field.text;
            var showPreInput = val === 'Saved on server datasets';

            if ('My Computer' === val) {
              _this.$form.find('[name=' + name + '_file]')
              .click();
              _this.$form.find('[name=' + name + '_picker]').selectpicker('val', '');
            }

            _this.$form.find('#' + name + '_url')
                .css('display', showUrlInput ? 'block' : 'none');

            _this.$form.find('[name=' + name + '_text]')
                .css('display', showTextInput ? 'block' : 'none');

            _this.$form.find('#' + name + '_geo')
                .css('display', showGSEInput ? 'block' : 'none');

            _this.$form.find('#' + name + '_pre')
                .css('display', showPreInput ? 'block' : 'none');
        });

      // URL
      var URL_dispatcher = function (form) {
        var $div = form.find('#' + name + '_url');
        var $input = form.find('[name=' + name + '_url]');

        var text = $.trim($input.val());
        if (isMultiple) {
          text = text.split(',').filter(function (t) {
            t = $.trim(t);
            return t !== '';
          });
        }
        _this.trigger('change', {
          name: name,
          value: text
        });

        $input.val('');
        $div.css('display', 'none');
      };

      //??
      _this.$form.on('keyup', '[name=' + name + '_text]', function (evt) {
        var text = $.trim($(this).val());
        _this.setValue(name, text);
        if (evt.which === 13) {
          _this.trigger('change', {
            name: name,
            value: text
          });
        }
      });
      // GEO
      var geo_dispatcher = function (form) {
        var $div = form.find('#' + name + '_geo');
        var $input = form.find('[name=' + name + '_geo]');

        var text = $.trim($input.val());
          // console.log('environment', evt);
          // console.log('object to trigger with result', _this, 'name', name, 'text', text);
        _this.trigger('change', {
          name: name,
          value: {
            name: text.toUpperCase(),
            isGEO: true
          }
        });

        $input.val('');
        $div.css('display', 'none');
      };

      // Preloaded
      var PRE_dispatcher = function (form) {
        var $div = form.find('#' + name + '_pre');
        var $input = form.find('[name=' + name + '_pre]');

        var text = $.trim($input.val());
        // console.log('environment', evt);
        //console.log('object to trigger with result', _this, 'name', name, 'text', text);
        _this.trigger('change', {
          name: name,
          value: {
            name: text,
            preloaded: true
          }
        });

        $input.val('');
        $div.css('display', 'none');
      };
      // browse file selected
      _this.$form.on('change', '[name=' + name + '_file]', function (evt) {

        var files = evt.target.files; // FileList object
        _this.setValue(name, isMultiple ? files : files[0]);
        _this.trigger('change', {
          name: name,
          value: isMultiple ? files : files[0]
        });
      });

      //SUBMIT
      _this.$form.on('submit', function () {
        var typePicker = $(this).find('[name=' + name + '_picker]');

        var val = typePicker.val(); //many
        var showUrlInput = val === 'URL';
        var showGSEInput = val === 'GEO Datasets';
        var showPreInput = val === 'Saved on server datasets';
        if (showGSEInput) geo_dispatcher($(this));
        if (showUrlInput) URL_dispatcher($(this));
        if (showPreInput) PRE_dispatcher($(this));
      });
    } else {
      type = type == null ? 'text' : type;
      if (type === 'div') {
        html.push('<div name="' + name + '" id="' + id + '"');
      } else {
        html.push('<input style="' + style + '" type="' + type
          + '" class="form-control" name="' + name + '" id="'
          + id + '"');
      }
      if (value != null) {
        html.push(' value="' + value + '"');
      }
      if (field.placeholder) {
        html.push(' placeholder="' + field.placeholder + '"');
      }
      if (field.min != null) {
        html.push(' min="' + field.min + '"');
      }
      if (field.max != null) {
        html.push(' max="' + field.max + '"');
      }
      if (field.step) {
        html.push(' step="' + field.step + '"');
      }
      if (required) {
        html.push(' required');
      }
      if (disabled) {
        html.push(' disabled');
      }
      if (field.autocomplete != null) {
        html.push(' autocomplete="' + field.autocomplete + '"');
      }

      html.push('>');
      if (type === 'div') {
        html.push('</div>');
      }
    }
    if (help !== undefined) {
      html.push('<span data-name="' + name + '_help" class="help-block">');
      html.push(help);
      html.push('</span>');
    }
    return endingDiv;
  },
  append: function (fields) {
    var html = [];
    var _this = this;
    var isArray = phantasus.Util.isArray(fields);
    if (!isArray) {
      fields = [fields];
    }
    html.push('<div class="form-group">');
    var endingDiv = false;
    _.each(fields, function (field, index) {
      endingDiv || _this._append(html, field, index === 0);
    });

    html.push('</div>');
    if (endingDiv) {
      html.push('</div>');
    }
    var $div = $(html.join(''));
    this.$form.append($div);
    var checkBoxLists = $div.find('.checkbox-list');
    if (checkBoxLists.length > 0) {
      var checkBoxIndex = 0;
      _.each(fields, function (field) {
        // needs to already be in dom
        if (field.type === 'checkbox-list') {
          var list = new phantasus.CheckBoxList({
            responsive: false,
            $el: $(checkBoxLists[checkBoxIndex]),
            items: field.options
          });

          $(checkBoxLists[checkBoxIndex]).data(
            'phantasus.checkbox-list', list);
          checkBoxIndex++;
        }
      });
    }
    $div.find('.selectpicker').selectpicker({
      iconBase: 'fa',
      tickIcon: 'fa-check',
      style: 'btn-default btn-sm'
    });
  },
  clear: function () {
    this.$form.empty();
  },
  getValue: function (name) {
    var $v = this.$form.find('[name=' + name + ']');
    if ($v.length === 0) {
      $v = this.$form.find('[name=' + name + '_picker]');
    }
    if ($v.length === 0) {
      $v = this.$form.find('[data-name=' + name + ']');
    }
    return phantasus.FormBuilder.getValue($v);
  },
  setOptions: function (name, options, selectFirst) {
    var $select = this.$form.find('[name=' + name + ']');
    var checkBoxList = $select.data('phantasus.checkbox-list');
    if (checkBoxList) {
      checkBoxList.setItems(options);
    } else {
      var html = [];
      var selection = $select.val();
      _.each(options, function (choice) {
        var isChoiceObject = _.isObject(choice)
          && choice.value !== undefined;
        if (choice && choice.divider) {
          html.push('<option data-divider="true"></option>');
        } else {
          html.push('<option value="');
          var optionValue = isChoiceObject ? choice.value : choice;
          var optionText = isChoiceObject ? choice.name : choice;
          html.push(optionValue);
          html.push('"');
          html.push('>');
          html.push(optionText);
          html.push('</option>');
        }
      });
      $select.html(html.join(''));
      $select.val(selection);
      if (selectFirst && $select.val() == null) {
        if ($select[0].options.length > 0) {
          $select.val($select[0].options[0].value);
        }
      }
      if ($select.hasClass('selectpicker')) {
        $select.selectpicker('refresh');
        $select.selectpicker('render');
      }
    }
  },
  find: function (name) {
    return this.$form.find('[name=' + name + ']');
  },
  setHelpText: function (name, value) {
    var v = this.$form.find('[data-name=' + name + '_help]');
    v.html(value);
  },
  setValue: function (name, value) {
    var v = this.$form.find('[name=' + name + ']');
    if (v.length === 0) {
      v = this.$form.find('[name=' + name + '_picker]');
      if (v.data('type') === 'file') {
        v.val(value);
        v.selectpicker('render');
        v.data('files', value);
        return;
      }
    }
    var type = v.attr('type');
    var list = v.data('phantasus.checkbox-list');
    if (list) {
      list.setValue(value);
    } else {
      if (type === 'radio') {
        v.filter('[value=' + value + ']').prop('checked', true);
      } else if (type === 'checkbox') {
        v.prop('checked', value);
      } else {
        v.val(value);
      }
      if (v.hasClass('selectpicker')) {
        v.selectpicker('render');
      }
    }

  },
  setVisible: function (name, visible) {
    var $div = this.$form.find('[name=' + name + ']')
      .parents('.form-group');
    if (visible) {
      $div.show();
    } else {
      $div.hide();
    }
  },
  remove: function (name) {
    var $div = this.$form.find('[name=' + name + ']')
      .parents('.form-group');
    $div.remove();
  },
  setEnabled: function (name, enabled) {
    var $div = this.$form.find('[name=' + name + ']');
    $div.attr('disabled', !enabled);
    if (!enabled) {
      $div.parents('.form-group').find('label').addClass('text-muted');
    } else {
      $div.parents('.form-group').find('label').removeClass('text-muted');
    }
  }
};
phantasus.Util.extend(phantasus.FormBuilder, phantasus.Events);
