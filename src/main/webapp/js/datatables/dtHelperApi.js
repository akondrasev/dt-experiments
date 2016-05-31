define([
	"jquery",
	"plugins/datatables/dtHelperConstants",
	"datatables"
], function ($, constants) {
	var pluginName = "_dtHelperApi";
	var timer = false;

	var uniqueValuesPerColumn = {};

	function DtHelperApi (settings) {
		var self = this;
		var dt = settings.oInstance;

		_setUpDtHelperApi(dt);

		settings[pluginName] = self;
	}

	function _addCustomHeader(dt, columnMap) {
		var settings = dt.api().settings()[0];
		var columns = settings.aoColumns;

		columns.forEach(function (oColumn) {
			
		});
	}

	function _getExcludeArray(dt) {
		var leftColumns;
		if (dt.properties.tableSettings) {
			leftColumns = dt.properties.tableSettings.currentTableSettings.freezeColumns + (dt.checkboxesUsed ? 1 : 0);
		} else {
			leftColumns = (dt.checkboxesUsed ? 1 : 0);
		}
		var result = [];
		var i;

		for (i = 0; i < leftColumns; i++) {
			result.push(i);
		}

		//do not resize if column has class 'fixed-size' or there is a given attribute 'resize': false
		for (i = 0; i < dt.datatable.aoColumns.length; i++) {
			var column = dt.datatable.aoColumns[i];
			var name;
			if ((column.resize === false || (column.sClass && column.sClass.indexOf(constants.FIXED_SIZE) > -1))
				&& result.indexOf(i) === -1) {

				name = column.name;
				var columnIndex = dt.api().column(name + ":name").index();
				result.push(columnIndex);
			}
		}

		return result;
	}

	function _getRowData(dt, row) {
		var aData;

		if (!(row instanceof jQuery)) {
			row = $(row);
		}

		if (row.hasClass(constants.CHILD_ROW)) {
			aData = $.parseJSON(row.attr("aData"));
			return aData;
		}

		var currentIndex = row.index();
		var tableRow = $("tbody tr", dt).eq(currentIndex);
		aData = dt.api().row(tableRow[0]).data();

		return aData;
	}

	function _generateRow(settings, aData, parentData) {
		var properties = settings.oInstance.properties;
		var row = $("<tr></tr>");
		var tds;

		if (settings.aoData.length === 0
			|| (parentData && properties.aoExpandSettings.bOneColumn)) {

			var numberOfVisibleColumns = $.grep(settings.aoColumns, function (e, i) {
				return e.bVisible;
			}).length;

			//if (childIndex === 0) {TODO wonder why if bOneColumn used we need this style for first child row -akondrasev
			//    tdCell.attr('style', 'padding:5px !important; border-top: 1px dotted #999 !important; border-bottom: 1px dotted #999 !important;')
			//} else {
			//    tdCell.attr('style', 'padding:5px !important; border-bottom: 1px dotted #999 !important;');
			//}

			var cellValue = parentData
				? aData[dt.properties.aoExpandSettings.sDataProp] : constants.SPACE;
			tds = "<td colspan='" + (numberOfVisibleColumns) + "'>" + cellValue + "</td>";
		} else {
			tds = _generateTds(settings, aData, parentData);
		}

		row.append(tds);

		return row;
	}

	/**
	 *
	 * @param settings - dt settings object
	 * @param aData - [data=null] renders empty tds
	 * @param parentData - if row is child it does not automatically calls inner row callbacks, so classes should be added automatically
	 * @returns {string}
	 */
	function _generateTds(settings, aData, parentData) {
		var properties = settings.oInstance.properties;
		var result = "";
		var columns = settings.aoColumns;
		var column;

		for (var i = 0; i < columns.length; i++) {
			column = columns[i];
			column.index = i;
			result += _generateTd(settings, aData, column, parentData);
		}

		return result;
	}


	function _generateTd(settings, aData, columnOptions, parentData) {
		var dt = settings.oInstance;
		var properties = dt.properties;
		var columnName = columnOptions.mDataProp;
		var parentColName = columnOptions.mParentProp;
		var expandColName = columnOptions.mExpandProp;
		var value;
		var sClass;
		var result = "";

		if (columnOptions.index === 0) {
			sClass = columnOptions.sClass;
			result = "<td class='" + sClass + "'></td>";//selection col, class 'selection_col' will be added inside datatable plugin automatically
		} else {
			sClass = columnOptions.sClass ? columnOptions.sClass : "";

			if (parentData) {
				if (!aData) {
					value = null;
				}

				if (parentColName !== undefined) {
					value = parentData[parentColName];
				} else if (expandColName !== undefined) {
					value = expandColName === "" ? constants.SPACE : aData[expandColName];
				} else {
					value = aData[columnName];
				}
			} else {
				value = aData ? aData[columnName] : null; //for fake rows no data passed
			}


			if (value) {
				if (columnOptions.displayUnique) {
					var uniqueValue = uniqueValuesPerColumn[columnName];
					if (!uniqueValue) {
						uniqueValuesPerColumn[columnName] = parentData[columnName];
						uniqueValue = uniqueValuesPerColumn[columnName];
					}

					if (value === uniqueValue) {
						value = "";
					} else {
						uniqueValuesPerColumn[columnName] = value;
					}
				}
				var renderedValue = ($.isFunction(columnOptions.render) ? columnOptions.render(value, "generated", aData) : value);
				result = "<td class='" + sClass + "'>" + (renderedValue ? renderedValue : constants.SPACE) + "</td>";
			} else {
				result = "<td class='" + sClass + "'>" + "" + "</td>";
			}
		}

		return result;
	}

	function _generateFakeData(settings) {
		var columns = settings.aoColumns;
		var data = {};
		columns.forEach(function (column, i) {
			if (!column.name) {
				return false;
			}

			data[column.mDataProp] = "";
		});

		return data;
	}

	function _callDrawCallbacks(settings){
		var drawCallbacksArray = settings.aoDrawCallback;
		$.each(drawCallbacksArray, function(index, callback) {
			if (callback.sName === 'fakeRows') {
				return true; // CONTINUE
			}

			callback.fn.apply(settings.oInstance, [settings]);
		});
	}

	function _getFormattedTime(object) {
		var result = {};
		var unit;
		var value;

		for (var key in object) {
			if (object.hasOwnProperty(key)) {
				value = object[key] > 1000 ? Math.ceil(object[key] / 100) / 10 : object[key];
				unit = object[key] > 1000 ? "s" : "ms";
				result[key] = value + unit;
			}
		}

		return result;
	}

	function _updateFixedColumns(dt) {
		var timeStart = Date.now();
		dt.api().fixedColumns().update();
		var timeEnd = Date.now();

		var fcTime = {
			fixedColumns: timeEnd - timeStart
		};

		fcTime = dt.getFormattedTime(fcTime);
		console.log("fc updated time: ", fcTime);
	}

	function _setUpDtHelperApi(dt){
		dt.getFormattedTime = _getFormattedTime;

		/**
		 * most sub-plugins for dt using fc update feature to redraw fc for its own perpuses.
		 * but we do not need to do this staff each time this are required but run code only last call to the timer.
		 * optimizes init performance.
		 */
		dt.updateFixedColumns = function (now) {
			if (now) {
				_updateFixedColumns(dt);
				return;
			}

			if (timer) {
				clearTimeout(timer);
			}

			timer = setTimeout(function () {
				_updateFixedColumns(dt);
			}, 0);
		};


		dt.getSelectionKeysForRow = function (nRow) {
			var $row = $(nRow);
			var result;
			if ($row.hasClass(constants.CHILD_ROW)) {
				result = dt.api().dtHelperSelect().expandableKeys();
			} else {
				result = dt.properties[constants.ARRAY_NAME_SELECTION_KEYS];
			}

			return result;
		};


		dt.getParentsOfSelectedChildren = function() {
			var selected = dt[constants.ARRAY_NAME_SELECTED];
			var result = [];

			selected.forEach(function (aData) {
				var keys = dt.properties[constants.ARRAY_NAME_SELECTION_KEYS];
				var isChild = $.isPlainObject(aData.parentData);

				if (!isChild) {
					return;
				}

				var isAlreadyAddedToResult = dt.api().dtHelperSelect().isSelected(aData.parentData, keys, result);
				if (!isAlreadyAddedToResult) {
					result.push(aData.parentData);
				}
			});

			return result;
		};
		dt.fnClearSelection = function () {
			dt.api().dtHelperSelect().clearAll();
		};

		dt.getRowData = function (row) {
			return _getRowData(dt, row);
		};

		dt.fnHighlightSearch = function (text) {
			if (text === undefined || text === null || text === "") {
				dt.properties.highlight = null;
			} else {
				dt.properties.highlight = text;
			}
		};

		dt.fnToggleFilters = function () {
			dt.api().columnFilters().toggle();
		};

		dt.fnShowFilters = function () {
			dt.api().columnFilters().show();
		};

		dt.fnClearFilters = function () {
			dt.api().columnFilters().clear();
		};

		/**
		 * Initially this method was born because most places used window resize event as a fix for some dt glitches, and this event triggering caused all tables in the DOM to be adjusted,
		 * however if there is invisible tables affected with adjusting function - all columns are collapsed with width '0'. So we decided to fix this as client draw feature whenever tabs
		 * are switched. Now this trouble has gone and all places where window.resize is triggered should be fired out instead of causing all tables to be re-adjusted.
		 *
		 * Initial trouble was fixed in dtHelper.js as $(window).unbind('resize.DT-' + ...); see 'initComplete' in dtHelper.js
		 * @deprecated - useless
		 */
		dt.fnDrawClient = function () {
			console.warn("Table '" + dt.selector + "' is using fnDrawClient() function, which is deprecated. See comments.");
			// var settings = dt.api().settings()[0];
			// _callDrawCallbacks(settings);
			// dt.updateFixedColumns();
		};

		dt.getExcludeResizeArray = function () {
			return _getExcludeArray(dt);
		};

		dt.appendFakeRow = function () {
			var settings = dt.api().settings()[0];
			var firstRow = dt.find("tbody tr").first();
			var $row = firstRow.clone().removeClass();

			if (!settings.aoData.length) {
				$row.find("td").removeClass("dataTables_empty");
			} else {
				var $tds = $row.find("td");
				$row.find("td").removeClass();
				var oData = {};
				oData.anCells = [];
				settings.aoData[0].anCells.forEach(function (td) {
					var newTd = $(td).clone().removeClass();
					newTd.html(constants.SPACE).removeAttr("title");
					oData.anCells.push(newTd[0]);
				});

				oData._aData = _generateFakeData(settings);
				oData.nTr = $row[0];
				settings.aoData.push(oData);
			}
			$row.find("td").html(constants.SPACE);

			$row.addClass(constants.FAKE_ROW)
				.addClass(constants.NO_CB);

			dt.find("tbody").append($row);
			return $row;
		};

		dt.createTr = function (aData, parentRow) {
			var parentData;
			if (parentRow) {
				parentData = dt.api().row(parentRow).data();
			}

			uniqueValuesPerColumn = {};
			return _generateRow(dt.api().settings()[0], aData, parentData);
		};

		dt.callRowCallbacks = function (nRow, aData, rowIdx) {
			var settings = dt.api().settings()[0];
			var rowCreatedCallbacks = settings.aoRowCreatedCallback;
			for (var i = 0; i < rowCreatedCallbacks.length; i++) {
				if (rowCreatedCallbacks[i].sName === "user") {
					rowCreatedCallbacks[i].fn.apply(dt, [nRow, aData, rowIdx]);
				}
			}
		};

		dt.addRowWithoutRedraw = function (aData, parentRow) {//todo test
			var settings = dt.api().settings()[0];
			var $row = dt.createTr(aData, parentRow);
			var nTr = $row[0];

			var oData = {};
			oData._aData = aData;
			oData.anCells = [];
			oData.nTr = nTr;
			settings.aoData.push(oData);
			settings.aiDisplay.push(settings.aiDisplay.length);
			settings.aiDisplayMaster.push(settings.aiDisplay.length);
			nTr._DT_RowIndex = settings.aoData.length - 1;

			$row.find("td").each(function (i, td) {
				td._DT_CellIndex = {
					row: nTr._DT_RowIndex,//counts as last
					column: i
				};
				oData.anCells.push(td);

				var oColumn = settings.aoColumns[i];
				if (oColumn.visible === false || oColumn.bVisible === false) {
					$(td).detach();
				}
			});

			var nTable = $(settings.nTable);
			var parityClass = nTable.find("tr").last().hasClass(constants.EVEN) ? constants.ODD : constants.EVEN;

			$row.addClass(parityClass);
			nTable.append($row);
			dt.callRowCallbacks($row[0], aData, $row.index());

			return $row;
		};
	}


	$.fn.dataTable.Api.register('dtHelper()', function () {
		return this;
	});

	$.fn.dataTable.Api.register('dtHelper().getFormattedTime()', function (object) {
		return _getFormattedTime(object);
	});

	$.fn.dataTable.DtHelperApi = DtHelperApi;
	$.fn.DataTable.DtHelperApi = DtHelperApi;
});