$.fn.dataTableExt.aoFeatures.push({
	fnInit  : function (oSettings) {
		var startTime = new Date().getTime();
		var row = $("<tr>");

		//console.log(oSettings.aoColumns);
		for (var i = 0; i < oSettings.aoColumns.length; i++){
			row.append("<td><input type='text'/></td>");
		}

		var endTime = new Date().getTime();

		console.log((endTime - startTime));
		return null;
	},
	cFeature: "C",
	sFeature: "fff"
});
console.log($.fn.dataTableExt.aoFeatures);
$("table").dataTable({
	data          : staticData,
	columns       : [
		{"data": "partyName", title: "Name", width: 200, type: "text"},
		{"data": "partyAddress", title: "Address", width: 200, type: "text"},
		{"data": "partyDate", title: "Date", width: 100, type: "text"},
		{"data": "partyId", title: "Delete", width: 100, type: "text"}
	],
	dom           : 'ZC<"table-container"rtlp>',
	colResize     : {
		tableWidthFixed: false
		//exclude        : [0]
	},
	fixedColumns  : false,
	colReorder    : true,
	autoWidth     : true,
	scrollX       : "250px",
	scrollY       : "200px",
	scrollCollapse: true,
	select        : {
		blurable : true,
		className: "selected",
		info     : false,
		//items    : "rows",
		//selector : "td, th",
		style    : "os"
	},
	initComplete: function () {
	}
});
