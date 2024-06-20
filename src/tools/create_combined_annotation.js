phantasus.CreateCombinedAnnotation = function(project) {};
phantasus.CreateCombinedAnnotation.prototype = {
  toString: function() {
    return "Create Combined Annotation";
  },
  gui: function() {
    return [
      {
        name: "annotate",
        options: ["Columns", "Rows"],
        value: "Rows",
        type: "radio"
      },
      {
        name: "annotation1",
        type: "select"
      },
      {
        name: "annotation2",
        type: "select"
      },
      {
        name: "separator",
        type: "text",
        value: "_"
      },
      {
        name: "annotation_name",
        value: "",
        type: "text",
        help:
          "Optional annotation name. If not specified, the operation name will be used.",
        autocomplete: "off"
      },
      {
        name: "use_selected_rows_and_columns_only",
        type: "checkbox"
      }
    ];
  },
  init: function(project, form) {
    var setValue = function(val) {
      var isRows = val === "Rows";
      var names = phantasus.MetadataUtil.getMetadataNames(
        isRows
          ? project.getFullDataset().getRowMetadata()
          : project.getFullDataset().getColumnMetadata()
      );

      form.setOptions("annotation1", names);
      form.setValue("annotation1", names[0]);
      form.setOptions("annotation2", names);
      form.setValue("annotation2", names[0]);
    };

    form.$form.find("[name=annotate]").on("change", function(e) {
      setValue($(this).val());
    });

    setValue("Rows");
  },
  execute: function(options) {
    var project = options.project;
    var selectedOnly = options.input.use_selected_rows_and_columns_only;
    var isColumns = options.input.annotate === "Columns";
    var annotation1 = options.input.annotation1;
    var annotation2 = options.input.annotation2;
    var separator = options.input.separator;
    var annotationName =
      options.input.annotation_name || annotation1 + separator + annotation2;
    var dataset = selectedOnly
      ? project.getSelectedDataset({
          selectedRows: true,
          selectedColumns: true
        })
      : project.getFullDataset();

    if (isColumns) {
      dataset = phantasus.DatasetUtil.transposedView(dataset);
    }

    var rowView = new phantasus.DatasetRowView(dataset);
    var vector = dataset.getRowMetadata().add(annotationName);

    var idx = 0;

    var annotation1Vector = dataset.getRowMetadata().getByName(annotation1);
    var annotation2Vector = dataset.getRowMetadata().getByName(annotation2);
    for (var size = dataset.getRowCount(); idx < size; idx++) {
      rowView.setIndex(idx);
      var val =
        annotation1Vector.getValue(idx) +
        separator +
        annotation2Vector.getValue(idx);
      vector.setValue(idx, val);
    }

    project.trigger("trackChanged", {
      vectors: [vector],
      display: isColumns ? ["color"] : ["text"],
      columns: isColumns
    });
  }
};
