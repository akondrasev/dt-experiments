define([
	"jquery",
	"plugins/datatables/dtHelperConstants",
	"plugins/3rdParty/datepicker",
	"plugins/3rdParty/jquery-ui-1.10.4.custom.min",
	"datatables"
], function ($, constants) {

	var timeStart;
	var timeEnd;

	var CENTERED_COLUMN = "centered-column";
	var FILTERS_ROW = "filters-row";
	var FILTER_BTN = "filter-btn";
	var ARR_TYPE_FILTERS = "filters";

	var FILTER_DATE = "filter-date";
	var FILTER_RANGE = "filter-range";
	var FROM = "from";
	var TO = "to";
	var FILTER_TH = "filter-th";

	ColumnFilters.id = 0;
	function ColumnFilters(settings) {
		var self = this;
		self.id = ++ColumnFilters.id;
		self.open = true;
		var dt = settings.oInstance;
		var properties = dt.properties;

		var filtersRow = _generateFiltersRow(settings);
		var aoHeaderFilters = _generateAoHeader(settings, filtersRow);

		self.dom = {
			filtersRow     : filtersRow,
			filtersAoHeader: aoHeaderFilters
		};

		self.s = {
			loadTime: {
				columnFilters: "not measured"
			}
		};

		self.showFilters = function () {
			if (self.open) {
				return;
			}

			_reOrderFiltersCells.apply(self, [settings]);
			_refreshFilterSelects.apply(self, [settings]);
			// dt.updateFixedColumns();

			dt.api().fixedColumns().updateHeader();
			self.open = true;
		};

		self.hideFilters = function () {

			if (!self.open) {
				return;
			}

			self.dom.filtersRow.detach();
			settings.aoHeader.forEach(function (array, i) {
				if (array.type === ARR_TYPE_FILTERS) {
					settings.aoHeader.splice(i, 1);
				}
			});
			dt.api().fixedColumns().updateHeader();

			self.open = false;
		};

		self.draw = function (skipFcUpdate) {
			timeStart = Date.now();
            _findAndResizeAllSelects(settings);

            if (!self.open) {
                return;
            }

			_refreshFilterSelects.apply(self, [settings]);
			if (!skipFcUpdate) {
				_reOrderFiltersCells.apply(self, [settings]);
				dt.api().fixedColumns().updateHeader();
			}
			timeEnd = Date.now();
			var timeTotal = timeEnd - timeStart;

			self.s.loadTime = dt.getFormattedTime({columnFilters: timeTotal});
		};

		self.clearFilters = function () {
			self.dom.filtersRow.find("input, select").each(function (i, input) {
				var $input = $(input);
				var isSelect = $input.is("select");

				if (isSelect) {
					$input.selectedIndex = 0;
					$input.multiselect("uncheckAll");
				} else {
					$input.val("");
				}
			});
			dt.api().fixedColumns().updateHeader();

			dt.fnClearSelection();
			settings.oInstance.fnFilter("");
		};

		self.showErrors = function (errors) {
			if (!self.open){
				return;
			}

			self.dom.filtersRow.find("input").removeClass("error");

			if (!errors) {
				dt.api().fixedColumns().updateHeader();
				return;
			}

			$.each(errors, function (key) {
				$("input[id$='" + key + "']", self.dom.filtersRow).addClass("error");
			});
			
			dt.api().fixedColumns().updateHeader();
		};

		self.toggleFilters = function () {
			if (self.open) {
				self.hideFilters();
			} else {
				self.showFilters();
			}
		};

		self.areOpen = function () {
			return self.open;
		};

		self.refreshFixedColumns = function () {
			if (!settings._oFixedColumns){
				return;
			}
			var leftHead = settings._oFixedColumns.dom.clone.left.header;
			$(leftHead).find("." + FILTERS_ROW + " th").each(function (i, th) {
				var originalTh = filtersRow.find("th").eq(i);
				var newTh = originalTh.clone(true);

				newTh.find("input, select").on("keyup change", function (e) {
					var id = $(this).attr("id");
					originalTh.find("#" + id).val($(this).val());
				});
				$(th).replaceWith(newTh);

				var $button = newTh.find("button.ui-multiselect");
				if ($button.length) {
					_adjustSelectWidth($button);
				}
			});
		};

		self.updateFCHeader = function () {
			var aiColumns = [];
			for (var i = 0; i < settings._oFixedColumns.s.iLeftColumns; i++) {
				if (settings._oFixedColumns.s.dt.aoColumns[i].bVisible) {
					aiColumns.push(i);
				}
			}

			_fnCloneHeader.apply(settings._oFixedColumns, [settings._oFixedColumns.dom.clone.left, settings._oFixedColumns.dom.grid.left, aiColumns, true]);
			self.refreshFixedColumns();
		};

		$(settings.nTHead).append(self.dom.filtersRow);
		settings.aoHeader.push(self.dom.filtersAoHeader);

		settings._ColumnFilters = this;

		filtersRow.find("select").each(function (i, select) {
			var $select = $(select);
			var multiple = $select.attr("multiple") === "multiple";
			$select.multiselect({
				multiple    : multiple,
				selectedList: !multiple ? 1 : 0,
				header      : lStringsCommon.COMMON_DROPDOWN_HEADER
			});
			$select.inited = true;
		});

		$(settings.nTable).on("destroy.dt", function (e) {
			self.dom.filtersRow.remove();
		});

		$(settings.nTableWrapper).on("keyup", function (e) {
			var input = $(e.target);
			var $th = input.closest("th." + FILTER_TH);

			if (!$th.length) {
				return false;
			}

			if (e.keyCode === 13 && $(input).is(":focus")) {
				e.preventDefault();
				e.stopPropagation();
				_filterData.apply(self, [settings]);
			}
		});

		$(settings.nTableWrapper).on("click", "." + FILTER_BTN, function (e) {
			_filterData.apply(self, [settings]);
		});

		if (!settings.oInstance.properties.filtersOpen) {
			settings.oInstance.api().columnFilters().hide();
		}

		settings.aoDrawCallback.push({
			fn: self.draw,
			sName: "columnFilters"
		});

        $(dt).on('column-resize', function (e, settings, colIndex) {
            if (self.open) {
                _resizeMultiSelect(e, settings, colIndex);
            }

            _resizeAllMultiSelectsInColumn(e, settings, colIndex);
        });
	}

	function _reOrderFiltersCells(settings) {
		var self = this;
		//row child nodes should be the same as native header children count
		self.dom.filtersRow.find("th").detach();
		settings.aoColumns.forEach(function (oColumn, i) {
			if (oColumn.visible === false || oColumn.bVisible === false) {
				return;
			}

			var headerCellIndex = oColumn._ColReorder_iOrigCol ? oColumn._ColReorder_iOrigCol : i;

			self.dom.filtersRow.append(self.dom.filtersAoHeader[headerCellIndex].cell);
		});

		self.dom.filtersRow.appendTo(settings.nTHead);
		settings.aoHeader.push(self.dom.filtersAoHeader);
	}

	function _refreshFilterSelects(settings) {
		var self = this;

		self.dom.filtersRow.find("select").each(function (i, select) {
			var $select = $(select);
			var selectId = $select.attr("id");

			if ($select.inited) {
				$select.multiselect("resetWidth");
			} else {
				var multiple = $select.attr("multiple") === "multiple";
				$select.multiselect({
					multiple    : multiple,
					selectedList: !multiple ? 1 : 0,
					header      : lStringsCommon.COMMON_DROPDOWN_HEADER,
					click: function (e, ui) {
						var originalButton = $select.multiselect("getButton");
						var $clonedSelect = $(".DTFC_Cloned").find("#" + selectId);

						if ( !$clonedSelect.length ) {
							return;
						}

						var button = $clonedSelect.next("button.ui-multiselect");

						//jquery multiselect uses 10 ms timeout to fix their jq bugs, we using 11 to call this after their fix
						setTimeout(function () {
							button.html(originalButton.html());
						}, 20);
					},
					open: function (e, ui) {
						var $clonedSelect = $(".DTFC_Cloned").find("#" + selectId);

						if ( !$clonedSelect.length ) {
							return;
						}

						var button = $clonedSelect.next("button.ui-multiselect");
						var $widget = $select.multiselect("widget");
						$widget.css({
							left: button.offset().left
						});
					}
				});
				$select.inited = true;
				_findAndResizeSelect(select, settings);
			}
		});
	}

    function _findAndResizeSelect(select, settings) {
        var $select = $(select);
        var $th = $select.closest("th." + FILTER_TH);
        var idx = $("th." + FILTER_TH, settings.nTHead).index($th);
        _resizeMultiSelect(null, settings, {iCol: idx});
	    $select.multiselect("resetWidth");
    }

    function _findAndResizeAllSelects(settings) {
        var aoColumns = settings.aoColumns;

        $.each(aoColumns, function (index, oColumn) {
            if (oColumn.editable && oColumn.type === 'select') {
                _resizeAllMultiSelectsInColumn(null, settings, {iCol: index});
            }
        });
    }

    function _resizeMultiSelect(e, settings, colIndex) {
        var columnIndex = colIndex.iCol;
        var $th = $('.' + FILTER_TH + ':eq(' + columnIndex +')', settings.nTHead);
        var $select = $th.find("select");

        if (!$select.length) {
            return;
        }
        _adjustSelectWidth($select);
    }

    function _resizeAllMultiSelectsInColumn(e, settings, colIndex) {
        var columnIndex = colIndex.iCol;
        var tempWidth = settings.aoColumns[columnIndex].sWidth;
        var columnWidth = parseInt( tempWidth );
        var spanIndex = 1;

        var dt = settings.oInstance;
        var nodes = dt.api().column(columnIndex).nodes();

        $.each(nodes, function(index, node) {
            var $cell = $(node);
            var $select = $cell.find("select");

            if ($select.length) {
                _adjustSelectWidth($select);
            }
        });
    }

	function _filterData(settings) {
		var self = this;
		var dt = settings.oInstance;
		var properties = dt.properties;
		self.manualFilter = true;//prevent default query generation

		if ($.isFunction(properties.onFilter)) {
			properties.onFilter();
		}

		var querry = {};

		self.dom.filtersAoHeader.forEach(function (column, i) {
			var $td = $(column.cell);
			var $input = $td.find("input, select");

			if (!$input.length) {
				return;
			}

			$input.each(function (i, input) {//from - to filters
				var $in = $(input);

				var key = $in.attr("id").substring(String(self.id).length);
				var value = $in.val();

				if ($.isArray(value)) {
					value = value.join(",,");
				}

				querry[key] = value;

			});
		});

		dt.fnClearSelection();
		settings.oInstance.fnFilter(JSON.stringify(querry));
	}

	function _generateAoHeader(settings, $row) {
		var aoHeaderArray = [];//this tricky array is needed for good internal dt functionality and fixed columns plugin 'clone' feature

		$row.find(">th").each(function (i, th) {
			$(th).on("mouseenter.ColResize", function (e) {
				e.stopPropagation();
			});

			var header = {
				cell  : th,
				unique: false//while calculating width datatables plugin gets unique ths for getting bounds
				//this param means no colspan in this cell (see _fnDetectHeader or _fnGetUniqueThs in datatables.js)
			};

			var aoColumn = settings.aoColumns[i];

			if (aoColumn.bVisible === false || aoColumn.visible === false) {
				$(th).detach();
			}

			aoHeaderArray.push(header);
		});

		aoHeaderArray.nTr = $row[0];
		aoHeaderArray.type = ARR_TYPE_FILTERS;
		return aoHeaderArray;
	}

	function _generateFiltersRow(settings) {
		var columnsDef = settings.aoColumns;

		var $row = $("<tr></tr>");
		for (var i = 0; i < columnsDef.length; i++) {
			var column = columnsDef[i];
			var $td = _generateTdForColumns(settings, column);
			$row.append($td);
		}

		return $row.addClass(FILTERS_ROW);
	}

	function _generateTdForColumns(settings, column) {
		var $td = $("<th></th>").addClass(column.sClass);

		var $input = _getInputForColumn(settings, column);
		$td.append($input);

		return $td.addClass(CENTERED_COLUMN).addClass(FILTER_TH);
	}

    function _adjustSelectWidth($select) {
        var $button;
        if ($select.is("button")) {
            $button = $select;
        } else {
            $button = $select.multiselect("getButton");
        }

        var $label = $button.find("span").eq(1);

        if ($button.width() <= constants.MIN_COL_WIDTH_FOR_SELECT) {
            $label.hide();
        } else {
            $label.show();
        }
    }

	function _getInputForColumn(settings, column) {
		var dt = settings.oInstance;
		var properties = dt.properties;

		var $input = $("<input/>");
		var inputId;
		var $from;
		var $to;
		var $rangeWrapper;
		var $text;
		switch (column.type) {
			case "text":
				$input.attr("type", "text");
				inputId = ColumnFilters.id + column.name + "_txt";
				$input.attr("id", inputId);
				$input.attr("name", inputId);
				if (typeof column.defaultFilter === "string") {
					$input.val(column.defaultFilter);
				}
				break;
			case "select":
				$input = $("<select/>");
				inputId = ColumnFilters.id + column.name + "_sel";
				$input.attr("id", inputId);
				$input.attr("name", inputId);
				if (column.items) {
					var option = null;
					if (column.multiple !== true) {
						option = $("<option value=''>-</option>");
						$input.append(option);
					} else {
						$input.attr("multiple", "multiple");
					}

					$.each(column.items, function (index, item) {
						if (typeof item === 'string') {
							option = $("<option value='" + item + "'>" + item + "</option>");
						} else {
							option = $("<option value='" + item.key + "'>" + item.value + "</option>");
						}

						if (column.defaultFilter) {
							column.defaultFilter.forEach(function (defaultFilter) {
								if (defaultFilter == option.val()) {
									option.prop("selected", true);
								}
							});
						}

						$input.append(option);
					});
				}
				break;
			case "date":
				$rangeWrapper = $("<div class='range-wrapper'></div>");
				$from = $("<input type='text'/>");
				$from.addClass(FILTER_DATE).addClass(FROM);
				inputId = ColumnFilters.id + column.name + "_from";
				$from.attr("id", inputId);
				$from.attr("name", inputId);
				$from.DatePicker({
					format  : properties.jsDateFormat,
					date    : "",
					start   : 0,
					onChange: function (formated, dates) {
						$from.val(formated);
						$from.DatePickerHide();
						dt.api().fixedColumns().updateHeader();
					}
				});

				$to = $("<input type='text'/>");
				$to.addClass(FILTER_DATE).addClass(TO);
				inputId = ColumnFilters.id + column.name + "_to";
				$to.attr("id", inputId);
				$to.attr("name", inputId);
				$to.DatePicker({
					format  : properties.jsDateFormat,
					date    : "",
					start   : 0,
					onChange: function (formated, dates) {
						$to.val(formated);
						$to.DatePickerHide();
						dt.api().fixedColumns().updateHeader();
					}
				});

				$text = $("<label>" + lStringsCommon.COMMON_TABLE_TO + "</label>");

				$rangeWrapper.append($from);
				$rangeWrapper.append($text);
				$rangeWrapper.append($to);

				$input = $rangeWrapper;
				break;
			case "range":
				$rangeWrapper = $("<div class='range-wrapper'></div>");
				$from = $("<input type='text'/>");
				$from.addClass(FILTER_RANGE).addClass(FROM);
				inputId = ColumnFilters.id + column.name + "_from";
				$from.attr("id", inputId);
				$from.attr("name", inputId);

				$to = $("<input type='text'/>");
				$to.addClass(FILTER_RANGE).addClass(TO);
				inputId = ColumnFilters.id + column.name + "_to";
				$to.attr("id", inputId);
				$to.attr("name", inputId);

				$text = $("<label>" + lStringsCommon.COMMON_TABLE_TO + "</label>");

				$rangeWrapper.append($from);
				$rangeWrapper.append($text);
				$rangeWrapper.append($to);

				$input = $rangeWrapper;
				break;
			case "btn":
				$input = $("<div class='" + FILTER_BTN + "'></div>");
				break;
			default:
				$input = constants.SPACE;
				break;
		}

		return $input;
	}

	function _getDefaultFilterQuery(settings) {
		var aoColumns = settings.aoColumns;
		var isEmptyQuery = true;
		var query = {};
		aoColumns.forEach(function (oColumn) {
			if (!oColumn.defaultFilter || !oColumn.type) {
				return;
			}

			var type = oColumn.type;
			var value = oColumn.defaultFilter;
			var name = oColumn.name;
			var suffix;
			switch (type) {
				case "select":
					suffix = "_sel";
					break;
				case "text":
					suffix = "_txt";
					break;
				default:
					break;
			}

			if (!suffix) {
				return;
			}

			if ($.isArray(value)) {
				value = value.join(",,");
			}

			query[name + suffix] = value;
			isEmptyQuery = false;
		});

		if (isEmptyQuery) {
			return null;
		}

		return query;
	}

	function _fnCloneHeader(oClone, oGrid, aiColumns, bAll) {
		var that = this,
		    i, iLen, j, jLen, jq, nTarget, iColumn, nClone, iIndex, aoCloneLayout,
		    jqCloneThead, aoFixedHeader,
		    dt   = this.s.dt;

		$(oClone.header).remove();

		oClone.header = $(this.dom.header).clone(true, false)[0];
		oClone.header.className += " DTFC_Cloned";
		oClone.header.style.width = "100%";
		oGrid.head.appendChild(oClone.header);

		aoCloneLayout = this._fnCopyLayout(dt.aoHeader, aiColumns, true);
		jqCloneThead = $('>thead', oClone.header);
		jqCloneThead.empty();

		/* Add the created cloned TR elements to the table */
		for (i = 0, iLen = aoCloneLayout.length; i < iLen; i++) {
			jqCloneThead[0].appendChild(aoCloneLayout[i].nTr);
		}
		dt.oApi._fnDrawHead(dt, aoCloneLayout, true);
		dt.oApi._fnAdjustColumnSizing(dt);
	}

	$.fn.dataTable.Api.register('columnFilters()', function () {
		return this;
	});

    $.fn.dataTable.Api.register('columnFilters().adjustSelectWidth()', function ($select) {
        return this.iterator('table', function (ctx) {
            _adjustSelectWidth($select);
        });
    });

	$.fn.dataTable.Api.register('columnFilters().refreshFixedColumns()', function () {
		return this.iterator('table', function (ctx) {
			if (ctx._ColumnFilters) {
				ctx._ColumnFilters.refreshFixedColumns();
			}
		});
	});

	$.fn.dataTable.Api.register('columnFilters().show()', function () {
		return this.iterator('table', function (ctx) {
			if (ctx._ColumnFilters) {
				ctx._ColumnFilters.showFilters();
			}
		});
	});

	$.fn.dataTable.Api.register('columnFilters().areOpen()', function () {
		var result;
		this.iterator('table', function (ctx) {
			if (ctx._ColumnFilters) {
				result = ctx._ColumnFilters.areOpen();
			}
		});

		return result;
	});

	$.fn.dataTable.Api.register('columnFilters().defaultQuery()', function () {
		var result;
		this.iterator('table', function (ctx) {
			result = _getDefaultFilterQuery(ctx);
		});

		return result;
	});

	$.fn.dataTable.Api.register('columnFilters().getLoadTime()', function () {
		var result;
		this.iterator('table', function (ctx) {
			if (ctx._ColumnFilters) {
				result = ctx._ColumnFilters.s.loadTime;
			}
		});

		return result;
	});

	$.fn.dataTable.Api.register('columnFilters().update()', function (skipFcUpdate) {
		return this.iterator('table', function (ctx) {
			if (ctx._ColumnFilters) {
				ctx._ColumnFilters.draw(skipFcUpdate);
			}
		});
	});

	$.fn.dataTable.Api.register('columnFilters().hide()', function () {
		return this.iterator('table', function (ctx) {
			if (ctx._ColumnFilters) {
				ctx._ColumnFilters.hideFilters();
			}
		});
	});

	$.fn.dataTable.Api.register('columnFilters().clear()', function () {
		return this.iterator('table', function (ctx) {
			if (ctx._ColumnFilters) {
				ctx._ColumnFilters.clearFilters();
			}
		});
	});

	$.fn.dataTable.Api.register('columnFilters().toggle()', function () {
		return this.iterator('table', function (ctx) {
			if (ctx._ColumnFilters) {
				ctx._ColumnFilters.toggleFilters();
			}
		});
	});

	$.fn.dataTable.Api.register('columnFilters().errors()', function (errors) {
		return this.iterator('table', function (ctx) {
			if (ctx._ColumnFilters) {
				ctx._ColumnFilters.showErrors(errors);
			}
		});
	});

	$.fn.dataTable.Api.register('fixedColumns().updateHeader()', function () {
		return this.iterator('table', function (ctx) {
			if (ctx._oFixedColumns && ctx._ColumnFilters) {
				ctx._ColumnFilters.updateFCHeader();
			}
		});
	});

	$.fn.dataTable.ColumnFilters = ColumnFilters;
	$.fn.DataTable.ColumnFilters = ColumnFilters;

	$.fn.dataTableExt.aoFeatures.push({
		"fnInit"  : function (settings) {//DataTables settings object
			new ColumnFilters(settings);
			return null;//Node (optional) - the element which contains your feature. Note that the return may also be void if your plug-in does not require to inject any DOM elements
		},
		"cFeature": "F",//The character that will be used to locate this plug-in in sDom. This should be upper-case (plug-ins by convention use upper case, while built-in features use lower case
		"sFeature": "columnFilters"//The name of the feature. Development use only, not seen by the end user.
	});
});