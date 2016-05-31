define([
	"jquery",
	"plugins/datatables/dtHelperConstants",
	"plugins/3rdParty/jquery-ui-1.10.4.custom.min",//for resizeable plugin
	"datatables"
], function ($, constants) {

	var timeStart;
	var timeEnd;

	function Collapsible(settings) {
		var self = this;
		var dt = settings.oInstance;

		self.s = {
			loadTime: {
				collapsible: "not measured"
			}
		};

		//todo
		timeStart = Date.now();
		_setUpCollapsableTable.apply(self, [settings]);
		timeEnd = Date.now();

		var timeTotal = timeEnd - timeStart;
		self.s.loadTime = dt.getFormattedTime({collapsible: timeTotal});
		settings._Collapsible = self;
	}




	function _setUpCollapsableTable(settings) {
		var dt = settings.oInstance;
		var $wrapper = $(settings.nTableWrapper);
		var recordsPerPage = dt.properties.recordsPerPage;
		var rowHeight = dt.find("tr").last().outerHeight();
		var thHeight = $(settings.nScrollHead).outerHeight();
		var maxHeight = $wrapper.height() + constants.COLLAPSER_HEIGHT;
		var scrollNeeded = dt.width() > $wrapper.width();
		dt.thHeight = thHeight;

		if (scrollNeeded) {
			maxHeight += settings.oScroll.iBarWidth;
			dt.scrollNeeded = true;
		}

		$wrapper.resizable({
			handles: "s",
			maxHeight: maxHeight,
			minHeight: constants.COLLAPSER_HEIGHT,
			create: function (e, ui) {
				var nativeSlider = $(".ui-resizable-handle.ui-resizable-s", $wrapper);
				$(this).css({overflow: "hidden"});

				$(constants.COLLAPSER_HTML).appendTo(nativeSlider);

				// dt.on("draw.dt column-sizing.dt", function (e) {//triggered when filters opened/closed, resizing window
				// 	var newHeadHeight = $(settings.nScrollHead).outerHeight();//update state because filters can appear
				// 	var headHeightDiff = newHeadHeight - dt.thHeight;
				//
				// 	var currentHeight = $wrapper.outerHeight();
				// 	var isHorizontalScrollNeeded = dt.width() > $wrapper.width();
				// 	var maxHeight = recordsPerPage * rowHeight + newHeadHeight + COLLAPSER_HEIGHT + (isHorizontalScrollNeeded ? settings.oScroll.iBarWidth : 0);
				//
				// 	if (dt.thHeight !== newHeadHeight) {
				// 		currentHeight += headHeightDiff;
				// 		dt.thHeight = newHeadHeight;
				// 	}
				//
				// 	if (dt.scrollNeeded !== isHorizontalScrollNeeded){
				// 		dt.scrollNeeded = isHorizontalScrollNeeded;
				// 		currentHeight += isHorizontalScrollNeeded ? settings.oScroll.iBarWidth : -settings.oScroll.iBarWidth;
				// 	}
				//
				// 	$wrapper.height(currentHeight);
				// 	$wrapper.resizable("option", "maxHeight", maxHeight);
				//
				// 	settings.oScroll.sY = currentHeight - dt.thHeight - COLLAPSER_HEIGHT + 1;//1 = vertical scroll appearing fix when all rows are shown
				//
				// 	var drawCallbacksArray = settings.aoDrawCallback;
				// 	for (var i = drawCallbacksArray.length - 1; i >= 0; i--) {
				// 		if(drawCallbacksArray[i].sName === "scrolling"){
				// 			drawCallbacksArray[i].fn.apply(dt, [settings]);
				// 		}
				// 	}
				// });
			},
			stop: function (e, ui) {
				console.log($(settings.nScrollBody).height());
			},
			resize: function (e, ui) {
				var settings = dt.api().settings()[0];
				var height = ui.size.height;
				var headHeight = $(settings.nScrollHead).outerHeight();
				var bodySize = height - headHeight - $(".table-footer", $wrapper).outerHeight() - constants.COLLAPSER_HEIGHT;

				var oScroll = settings.oScroll;
				oScroll.sY = bodySize;
				settings.oScroll = oScroll;

				$(settings.nScrollBody).height(oScroll.sY);
			}
		});

		$wrapper.height($wrapper.height() + constants.COLLAPSER_HEIGHT);
	}



	$.fn.dataTable.Api.register('collapsible()', function () {
		return this;
	});

	$.fn.dataTable.Api.register('collapsible().getLoadTime()', function () {
		var result;
		this.iterator('table', function (ctx) {
			if (ctx._Collapsible) {
				result = ctx._Collapsible.s.loadTime;
			}
		});

		return result;
	});

	$.fn.dataTable.Api.register('collapsible().collapse()', function () {
		return this.iterator('table', function (ctx) {
			if (ctx._Collapsible) {
				console.log("not implemented");
			}
		});
	});

	$.fn.dataTable.Collapsible = Collapsible;
	$.fn.DataTable.Collapsible = Collapsible;
});