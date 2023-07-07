phantasus.LimmaTool = function () {
};
phantasus.LimmaTool.prototype = {
  toString: function () {
    return "Limma";
  },
  init: function (project, form) {
    var _this = this;
    var dataset = project.getFullDataset();
    var columnMeta = dataset.getColumnMetadata();
    let fields = phantasus.MetadataUtil.getMetadataNames(columnMeta);
    var updateAB = function (fieldNames) {
      var ids = [];
      if (fieldNames != null) {
        var vectors = phantasus.MetadataUtil.getVectors(columnMeta, fieldNames);
        var idToIndices = phantasus.VectorUtil
          .createValuesToIndicesMap(vectors);
        idToIndices.forEach(function (indices, id) {
          ids.push(id);
        });
      }
      ids.sort();
      form.setOptions("class_a", ids);
      form.setOptions("class_b", ids);
    };
    var $field = form.$form.find("[name=field]");
    var $class_a = form.$form.find("[name=class_a]");
    var $class_b = form.$form.find("[name=class_b]");
    var $add_data = form.$form.find("[name=add_data]");
    var $byArea = form.$form.find("[name=byArea]");
    var $designMatrix = form.$form.find('[name=designMatrix]');
    var $showDesign = form.$form.find("[name=showDesign]");
    var $contrastField = form.$form.find("[name=contrast_field]");
    var $contrastA = form.$form.find("[name=contrast_a]");
    var $contrastB = form.$form.find("[name=contrast_b]");
    $field.on("change", function (e) {
      updateAB($(this).val());
    });
    if ($field[0].options.length > 0) {
      $field.val($field[0].options[0].value);
    };
    updateAB($field.val());

    $add_data.on('click',  function (e) {
      let $this = $(this);
      $byArea.append(_this.getSelectorHtml(null, fields));
      _this.reEvaluateAvailableOptions($byArea);
      checkParams();
      e.preventDefault();
    });
    let data = [];
    let columns = [];
    var grid = new Slick.Grid($designMatrix[0] , data, columns, {
      enableCellNavigation: true,
      headerRowHeight: 0,
      showHeaderRow: false,
      multiColumnSort: false,
      multiSelect: false,
      enableColumnReorder: false,
      enableTextSelectionOnCells: true,
      forceFitColumns: false,
      topPanelHeight: 20
    });
    form.$form.on('change', '[name=by]', function(e){
      _this.reEvaluateAvailableOptions($byArea);
      _this.updateContrastFieldOptions($contrastField, $byArea, $contrastB, columnMeta);
      checkParams();

    });
    form.$form.on('click', '[data-name=delete]', function (e) {
      var $this = $(this);
      var $row = $this.closest('.phantasus-entry');
      $row.remove();
      _this.reEvaluateAvailableOptions($byArea);
      checkParams();
      _this.updateContrastFieldOptions($contrastField, $byArea, $contrastB, columnMeta);

      e.preventDefault();
    });
    form.$form.on('click', '[name=showDesign]', function (e) {
      var $this = $(this);
      if ($designMatrix[0].hidden) {
        $designMatrix.show();
        $designMatrix[0].hidden = false;
        $this.text("Hide design matrix");
      } else {
        $designMatrix.hide();
        $designMatrix[0].hidden = true;
        $this.text("Show design matrix");
      };
      e.preventDefault();
    });

    const isDesignValid = ($container) =>{
      if (!$container[0].hasAttribute("disabled")){
        let selectElements = $container.find("[name=by]");
        if (selectElements.length >= fields.length){
          $add_data.setAttribute("disabled", true);
          $add_data.parent().find("[data-name=add_data_help]")[0].textContent = "Nothing to add.";
        } else {
          $add_data[0].disabled = false;
          $add_data.parent().find("[data-name=add_data_help]")[0].textContent  = "";
        };
        if (selectElements.length < 1){
          $designMatrix.closest(".form-group")[0].classList.add('has-error');
          return false;
        } else {
          $designMatrix.closest(".form-group")[0].classList.remove('has-error');
          return true;
        }
     }
     return true;
   }
   const isContrastValid = ($field, $a, $b) => {
    if ( $contrastField[0].hasAttribute("disabled") ){
      return true;
    }
    if ($a.val() && $b.val() && $a.val() === $b.val()){
        $a.closest(".form-group")[0].classList.add('has-error');
        $b.closest(".form-group")[0].classList.add('has-error');
        return false;
    }
    $a.closest(".form-group")[0].classList.remove('has-error');
    $b.closest(".form-group")[0].classList.remove('has-error');
    if ($contrastField.val()){
      return true;
    } else {
      return false;
    }
   }
   const checkParams = () =>{
    if (isDesignValid($byArea) && isContrastValid($contrastField, $contrastA, $contrastB)) {
      document.getElementsByName("ok")[0].disabled = false;
    } else{
      document.getElementsByName("ok")[0].disabled = "disabled";
    }
   };
    const debounce = (fn, delay = 500) => {
      let timeoutId;
      return (...args) => {
        // cancel the previous timer
        if (timeoutId) {
            clearTimeout(timeoutId);
        }
        // setup a new timer
        timeoutId = setTimeout(() => {
            fn.apply(null, args)
        }, delay);
      };
    };
    $contrastB.on("change", function(e){
      let hidden = $designMatrix[0].hidden;
      let curRef = {};
      curRef[$contrastField.val()] =  this.value;
      if (hidden){
        $designMatrix.show();
      }
      _this.updateDesignGrid(grid, $byArea, columnMeta, curRef);
      if (hidden){
        $designMatrix.hide();
      }
    });
    form.$form.on('input', debounce(function (e) {
      checkParams();
    }));
    $contrastField.on("change", function(e){
      let selected_val = this.value;
      _this.resetContrastAB($contrastA, $contrastB, selected_val, columnMeta );
    });
    var hide_element = function($el){
      $el.closest(".form-group").hide();
      $el.each(function(){
        this.setAttribute("disabled", true);
      });
    };
    var show_element = function($el) {
      $el.closest(".form-group").show();
      $el.each(function(){
        this.removeAttribute("disabled");
      });
    };

    var hide_advanced = function(){
      show_element($field);
      show_element($class_a);
      show_element($class_b)
      hide_element($add_data);
      hide_element($designMatrix);
      hide_element($showDesign);
      hide_element($byArea);
      hide_element($contrastField);
      hide_element($contrastA);
      hide_element($contrastB);
    };
    var hide_basic = function() {
      hide_element($field);
      hide_element($class_a);
      hide_element($class_b)
      show_element($add_data);
      show_element($designMatrix);
      show_element($showDesign);
      show_element($byArea);
      show_element($contrastA);
      show_element($contrastB);
      show_element($contrastField);
    };
    
    var $versionChooser = form.$form.find("[name=versionTabs]");
    var $versionTabs = $versionChooser.find('li');
    $versionTabs.on('click', function (e) {
      $versionTabs.toggleClass('active', false);
      var target = $(e.currentTarget);
      var mode = target.text();
      target.toggleClass('active', true);
      if (mode === 'Advanced design') {
        hide_basic();
        checkParams();
      } else {
        hide_advanced();
        checkParams();
      }
      e.preventDefault();
    });
    hide_advanced();
    this.updateDesignGrid(grid, $byArea, columnMeta, undefined);
    $designMatrix[0].parentElement.classList.remove('col-xs-offset-4');
    $designMatrix[0].parentElement.classList.add('col-xs-offset-1');
    $designMatrix[0].parentElement.classList.remove('col-xs-8');
    $designMatrix[0].parentElement.classList.add('col-xs-10');
    $designMatrix[0].setAttribute("style","height:320px");
    $($designMatrix[0]).data('SlickGrid', grid);
    $designMatrix.hide();
    $designMatrix[0].hidden = true; 
    $versionChooser[0].parentElement.classList.remove('col-xs-offset-4');
    $versionChooser[0].parentElement.classList.remove('col-xs-8');
    $versionChooser[0].parentElement.classList.add('col-xs-12');
  },
  gui: function (project) {
    var dataset = project.getFullDataset();

    if (_.size(project.getRowFilter().enabledFilters) > 0 || _.size(project.getColumnFilter().enabledFilters) > 0) {
      phantasus.FormBuilder.showInModal({
        title: 'Warning',
        html: 'Your dataset is filtered.<br/>' + this.toString() + ' will apply to unfiltered dataset. Consider using New Heat Map tool.',
        z: 10000
      });
    }
    var fields = phantasus.MetadataUtil.getMetadataNames(dataset.getColumnMetadata());
    return [
      { name:"versionTabs",
        type: "nav-tabs",
        options: ["One-factor design", "Advanced design"],
        value: "One-factor design",
        showLabel: false,
      },
      {
      name: "field",
      options: fields,
      type: "select",
      multiple: true
    }, {
      name: "class_a",
      title: "Class A",
      options: [],
      value: "",
      type: "checkbox-list",
      multiple: true
    }, {
      name: "class_b",
      title: "Class B",
      options: [],
      value: "",
      type: "checkbox-list",
      multiple: true
    },
    {
      name: "byArea",
      type: "select-list",
      showLabel: false
    },{
      name: "add_data",
      title: "add",
      type: "button",
      help: ""
    },
    { name: "showDesign",
      title: "show design matrix",
      type: "custom",
      showLabel: false,
      value: '<a name="showDesign" href="#">Show design matrix</a>'
    },
    {
      name: "designMatrix",
      type: "slick-table",
      showLabel: false,
      style: "width:100%;height:300px;"
    },
    {
      name: "contrast_field",
      title: "Factor of interest",
      type: "select",
      options: [],
      multiple: false
    },
    {
      name: "contrast_a",
      title: "Target level",
      type: "select",
      options: [],
      multiple: false
    },
    {
      name: "contrast_b",
      title: "Reference level",
      type: "select",
      options: [],
      multiple: false
    }];
  },
  getSelectorHtml: function (selValue, fields) {
    var html = [];
    html.push('<div class="phantasus-entry">');
    html.push('<label>Factor:</label>');
    // field
    html.push('<select style="max-width:150px;overflow-x:hidden; display: inline-block; margin: 5px; padding: 5px; line-height: normal; height: auto;" name="by" class="form-control input-sm">');
    html.push('<option disabled selected value style="display: none">--select field--</option>');
    _.each(fields, function (field) {
      html.push('<option value="' + field + '"');
      if (field === selValue) {
        html.push(' selected');
      }
      html.push('>');
      html.push(field);
      html.push('</option>');
    });
    html.push('</select>');
    html.push('&nbsp<button type="button" class="close" aria-label="Close" data-name="delete" style="float:none;"><span aria-hidden="true">×</span></button> ');
    
    html.push('</div>'); // phantasus-entry
    return html.join('');
  },
  reEvaluateAvailableOptions: function($container){
    let selectElements = $container.find("[name=by]")
    let selectedValues = [];
    selectElements.each(function() {
      let value = $(this).val();
      value != null && selectedValues.push(value);
    });
    selectElements.each(function() {
      let currentValue = $(this).val();
      $(this).children('option')
        .removeAttr("disabled")
        .each(function() {
          let value = this.value;
          if (selectedValues.indexOf(value) >= 0 && currentValue != value) {
            $(this).attr('disabled', "disabled");
          }
        });
    });

  },
  updateContrastFieldOptions: function($contrast_field, $byContainer, $contrast_b, columnMeta){
    let selectElements = $byContainer.find("[name=by]")
    let selected_names = [];
    let cur_contrast = $contrast_field.val();
    selectElements.each(function() {
      let value = $(this).val();
      value != null && value != '' && selected_names.push(value);
    });  
    let existing_options = $contrast_field[0].options;
    let remove_list = [];
    for (let i = 0; i < existing_options.length; i++) {
      const element = existing_options[i];
      const fact_ind = selected_names.indexOf(element.value) 
      if (fact_ind < 0 ){
        remove_list.push(i);  
      };
      delete selected_names[fact_ind];
    };
    remove_list.forEach(function(x){
      $contrast_field[0].remove(x);
    });
    selected_names.forEach(function(sel_name){
      let factor_map =  phantasus.VectorUtil.createValuesToIndicesMap([columnMeta.getByName(sel_name)]);
      if (sel_name && factor_map.n >= 2){
        $contrast_field[0].add(new Option(sel_name, sel_name), undefined);
      }
    });
    if (cur_contrast !== $contrast_field.val()){
      $contrast_field.trigger("change");
    } else {
      $contrast_b.trigger("change");
    }
   
  },
  resetContrastAB: function($contrast_a, $contrast_b, field_value, columnMeta){
    $contrast_a.empty();
    $contrast_b.empty();
    if (field_value){
      let factor_map =  phantasus.VectorUtil.createValuesToIndicesMap([columnMeta.getByName(field_value)]);
      factor_map.keys().forEach(function(key_value, ind){
        $contrast_a[0].add(new Option(key_value, key_value), undefined);
        $contrast_b[0].add(new Option(key_value, key_value), undefined);
      });
      $($contrast_b).children('option')[0].selected = "selected";
      $($contrast_a).children('option')[1].selected = "selected";
    }
    $contrast_b.trigger("change");
   

  },
  updateDesignGrid: function( grid, $selectListCont, columnMeta, curRef){
    let selectElements = $selectListCont.find("[name=by]")
    let selectedValues = [];
    let factorNames = [];
    let factorIndices = [];
    selectElements.each(function() {
      let value = $(this).val();
      value != null && value != '' && selectedValues.push(value);
    });
    selectedValues.forEach(function(value,index) {
      let factor_map =  phantasus.VectorUtil.createValuesToIndicesMap([columnMeta.getByName(value)]);
      if (index !== 0){
        factor_map.remove(factor_map.keys()[0]);
      };
      factor_map.forEach(function(ind_list, key){
        factorNames.push(value + "" + key);
        factorIndices.push(ind_list);
      });
    });
    
    let id_column = undefined;
    let id_values = [];
    if (phantasus.MetadataUtil.indexOf(columnMeta, "geo_accession") !== -1 ){
      id_values = columnMeta.getByName( "geo_accession").getArray();
    };
    if (id_values.length == 0){
      for (let i = 1; i <= dataset.columns; i++) {
        id_values.push(i);
      };
    };
    id_column = "sample";
    var columns = [ {
      id: "id",
      name: id_column,
      field: "id",
      width: 120,
      cssClass: "design-grid"
    }];
    var data = [];
    factorNames.forEach(function(fact_name){
      columns.push({
        id: fact_name,
        name: fact_name,
        field: fact_name,
        width: 80,
        cssClass: "design-grid factor"
      });
    });
    for (let i = 0; i < columnMeta.itemCount; i++) {
      data[i] = { 
        id: id_values[i]
        };
      factorNames.forEach(function(fact_name){ data[i][fact_name] = 0}); 
    };
    factorNames.forEach(function(value,index){
      factorIndices[index].forEach(function(sample){
        data[sample][value]=1;
      })
    });
    

    grid.setData(data);
    grid.setColumns(columns);
    grid.invalidate();
    grid.resizeCanvas();
  },
  execute: function (options) {
      var project = options.project;
    var version = options.input.versionTabs;

    if (version === "One-factor design"){
      var field = options.input.field;
      var classA = options.input.class_a;
      var classB = options.input.class_b;
      var contrast = ["Comparison", "A", "B"];
      var designData = null;
      var designFields = null;
    } else {
      var field = [options.input.contrast_field];
      var classA = [{array: [options.input.contrast_a]}];
      var classB = [{array: [options.input.contrast_b]}];
      var contrast = [field, options.input.contrast_a, options.input.contrast_b]
      var designData = options.input.designMatrix.getData();
      var designFields = options.input.byArea;
    }
    

    var dataset = project.getFullDataset();
    var promise = $.Deferred();

    if (classA.length == 0 || classB.length == 0) {
      throw new Error("You must choose at least one option in each class");
    }

    // console.log(dataset);
    var v = dataset.getColumnMetadata().getByName("Comparison");
    if (v == null) {
      v = dataset.getColumnMetadata().add("Comparison");
    }
    var vs = [];
    field.forEach(function (name) {
      vs.push(dataset.getColumnMetadata().getByName(name));
    });

    var checkCortege = function (vectors, curClass, curColumn) {
      var columnInClass = false;
      var isEqual = true;
      for (j = 0; j < curClass.length; j += 1) {
        isEqual = true;
        for (var k = 0; k < vectors.length; k += 1) {
          isEqual &= vectors[k].getValue(curColumn) == curClass[j].array[k];
        }
        columnInClass |= isEqual;
      }
      return columnInClass;
    };
    for (var i = 0; i < dataset.getColumnCount(); i++) {
      var columnInA = checkCortege(vs, classA, i);
      var columnInB = checkCortege(vs, classB, i);
      if (columnInA && columnInB) {
        var warning = "Chosen classes have intersection in column " + i;
        promise.reject();
        throw new Error(warning);
      }
      v.setValue(i, columnInA ? "A" : (columnInB ? "B" : ""));
    }

    var vecArr = phantasus.VectorUtil.toArray(v);
    var count = _.countBy(vecArr);
    if (count['A'] === 1 || count['B'] === 1) {
      promise.reject();
      throw new Error('Chosen classes have only single sample');
    }

    var values = Array.apply(null, Array(project.getFullDataset().getColumnCount()))
      .map(String.prototype.valueOf, "");

    for (var j = 0; j < dataset.getColumnCount(); j++) {
      values[j] = v.getValue(j);
    }

    dataset.getESSession().then(function (essession) {
        var args = {
          es: essession,
          fieldValues: values,
          version: version,
          contrast: contrast,
          designFields: designFields,
          designData: designData
        };

      var req = ocpu.call("limmaAnalysis/print", args, function (session) {
        var r = new FileReader();
        var filePath = phantasus.Util.getFilePath(session, JSON.parse(session.txt)[0]);

        r.onload = function (e) {
          var contents = e.target.result;
          protobuf.load("./message.proto", function (error, root) {
            if (error) {
              alert(error);
            }
            var REXP = root.lookupType("REXP");
            var rclass = REXP.RClass;
            var res = REXP.decode(new Uint8Array(contents));
            var data = phantasus.Util.getRexpData(res, rclass);
            var names = phantasus.Util.getFieldNames(res, rclass);
            var vs = [];

            names.forEach(function (name) {
              if (name !== "symbol") {
                var v = dataset.getRowMetadata().add(name);
                for (var i = 0; i < dataset.getRowCount(); i++) {
                  v.setValue(i, data[name].values[i]);
                }
                vs.push(v);
              }

            });

            dataset.setESSession(Promise.resolve(session));
            project.trigger("trackChanged", [{
              vectors: vs,
              display: []
            }, {
              vectors: [v],
              display: ["color"],
              columns: true
            }]);
            promise.resolve();
          })
        };
        phantasus.BlobFromPath.getFileObject(filePath, function (file) {
          r.readAsArrayBuffer(file);
        });
      }, false, "::es");
      req.fail(function () {
        promise.reject();
        throw new Error("Limma call failed" + req.responseText);
      });
    });

    return promise;
  }
};
