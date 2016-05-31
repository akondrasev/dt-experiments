define([
	"jquery",
	"plugins/datatables/dtHelperConstants",
	"includes/util",
	"datatables"
], function ($, constants) {

	var timeStart;
	var timeEnd;

	function FakeRows(settings) {
		var self = this;
		var dt = settings.oInstance;

		self.s = {
			loadTime: {
				fakeRows: "not measured"
			}
		};


		self.draw = function () {
			timeStart = Date.now();
			_draw(settings);
			dt.updateFixedColumns();
			timeEnd = Date.now();

			var timeTotal = timeEnd - timeStart;
			self.s.loadTime = dt.getFormattedTime({fakeRows: timeTotal});
		};

		settings.aoDrawCallback.push({
			fn: self.draw,
			sName: "fakeRows"
		});

		self.draw();

		settings._FakeRows = self;
	}

	function _draw(settings) {
		var dt = settings.oInstance;
		var displayedRecords = settings._iRecordsDisplay - settings._iDisplayStart;

		if (!displayedRecords) {
			displayedRecords = settings.aoData.length;
		}

		var rowsDisplayed = displayedRecords > 0 ? displayedRecords : 1;//first for empty table msg exists
		var recordsPerPageCount = dt.properties.recordsPerPage;

		if (recordsPerPageCount > rowsDisplayed) {
			for (var i = rowsDisplayed; i < recordsPerPageCount; i++) {
				var isRowEven = _isEven(i + 1);
				var parityClass = isRowEven ? constants.EVEN : constants.ODD;
				rowsDisplayed++;
				dt.appendFakeRow().addClass(parityClass);
			}
		}
	}

	function _isEven(n) {
		return n % 2 === 0;
	}

	$.fn.dataTable.Api.register('fakeRows()', function () {
		return this;
	});


	$.fn.dataTable.Api.register('fakeRows().getLoadTime()', function () {
		var result;
		this.iterator('table', function (ctx) {
			if (ctx._FakeRows) {
				result = ctx._FakeRows.s.loadTime;
			}
		});

		return result;
	});

	$.fn.dataTable.Api.register('fakeRows().draw()', function () {
		return this.iterator('table', function (ctx) {
			if (ctx._FakeRows) {
				ctx._FakeRows.draw();
			}
		});
	});

	$.fn.dataTable.FakeRows = FakeRows;
	$.fn.DataTable.FakeRows = FakeRows;
});