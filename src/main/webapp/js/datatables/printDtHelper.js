require.config({
	paths: {
		"datatables"  : "plugins/datatables/3rdParty/datatables",
		"fixedColumns": "plugins/datatables/3rdParty/dataTables.fixedColumns",
		"colResize"   : "plugins/datatables/3rdParty/dataTables.colResize",
		"select"      : "plugins/datatables/3rdParty/dataTables.select",
		"colReorder"  : "plugins/datatables/3rdParty/dataTables.colReorder",

		//our plugins
		"tableSettingsDdMenu": "plugins/datatables/tableSettingsDdMenu",
		"columnFilters"      : "plugins/datatables/columnFilters",
		"dtHelperSelect"     : "plugins/datatables/dtHelperSelect",
		"dtHelperContextMenu": "plugins/datatables/dtHelperContextMenu",
		"expandable"         : "plugins/datatables/dtHelperExpandable",
		"fakeRows"           : "plugins/datatables/dtHelperFakeRows",
		"tableSettings"      : "plugins/datatables/dtHelperTableSettings",
		"collapsible"        : "plugins/datatables/dtHelperCollapsible",
		"editable"           : "plugins/datatables/dtHelperEditable",
		"dtHelperApi"        : "plugins/datatables/dtHelperApi"
	}
});

define([
	"jquery",
	"plugins/datatables/dtHelperConstants",

	"datatables",
	"fixedColumns",

	/*our plugins*/
	"dtHelperSelect",
	"expandable",
	"tableSettings",
	"dtHelperApi"
], function ($, constants) {
	var defaults = {
		bFilter     : false,
		bInfo       : false,
		bPaginate   : false,
		bSort       : false,
		bProcessing : false,
		bAutoWidth  : false,
		initComplete: function (settings, json) {
			var dt = settings.oInstance;

			new $.fn.dataTable.DtHelperApi(settings);

			if (dt.properties.customColumnOrder) {
				console.log(dt.properties.customColumnOrder);
				new $.fn.dataTable.TableSettings(settings);
			}

			if (dt.properties.bExpandable) {
				new $.fn.dataTable.Expandable(settings);
				dt.api().expandable().expandAll();
			}

			window.print();
		}
	};

	function PrintDtHelper(options) {
		var dt = this;
		var properties = $.extend({}, defaults, options);

		dt.properties = properties;
		dt = dt.dataTable(properties);
		return dt;
	}

	$.fn.printDtHelper = PrintDtHelper;

});