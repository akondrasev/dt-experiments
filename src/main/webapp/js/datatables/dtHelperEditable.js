/**
 * todos:
 * - up/down/enter/tab keys functionality as in mockup's 'itemIndex.js'
 */
define([
	"jquery",
	"plugins/datatables/dtHelperConstants",
	"plugins/3rdParty/datepicker",
	"datatables",
	"plugins/3rdParty/jquery.jeditable",
	"plugins/3rdParty/numeric"
], function ($, constants) {

	var timeStart;
	var timeEnd;

	var lastCell;

	function Data(columns, defaultData){
		var self = this;

		columns.forEach(function (oColumn) {
			if (!oColumn.name || !oColumn.mDataProp) {
				return;
			}

			if (!defaultData) {
				self[oColumn.mDataProp] = "";
			} else {
				self[oColumn.mDataProp] = defaultData[oColumn.mDataProp] ? defaultData[oColumn.mDataProp] : "";
			}
		});
	}

	var defaultOptions = {
        textField: {
            type     : 'text',
            maxlength: 50,
            height   : 20,
            // callback : null,
            tooltip  : 'Click to edit',//todo localization -akondrasev
            onblur   : function (value, settings) {
                //this is needed because default plugin 'submit' is called after timeout.
                $(this).find("form").submit();
            }
        },

        dateField: {
            type     : 'dateField',
            maxlength: 50,
            height   : 20,
            // callback : null,
            tooltip  : 'Click to edit date',//todo localization -akondrasev
            onblur   : "cancel"
        }
	};

	$.editable.addInputType('dateField', {
		element: $.editable.types.text.element,
		plugin: function (settings, original) {
			var $input = $('input', this);

			$input.DatePicker({
				format  : jsDateFormat,
				date    : "",
				start   : 0,
				onChange: function (formatted, dates) {
					$input.val(formatted);
					$input.DatePickerHide();
					$input.closest('form').submit();
				}
			});

			$input.DatePickerShow();
		}
	});

	$.editable.addInputType('numeric-field', {
		element: $.editable.types.text.element,
		plugin: function (settings, original) {
			var $input = $('input', this);
			$input.numeric({ decimal : "." , negative : true });
		}
	});

	function Editable(settings) {
		var self = this;
		var dt = settings.oInstance;
		var properties = dt.properties;

		self.s = {
			dt: settings,
			editedData: [],
			loadTime: {
				editable: "not measured"
			}
		};

		self.dom = {
			table: dt
		};

		self.draw = function () {
			timeStart = Date.now();
			var aoColumns = settings.aoColumns;

			aoColumns.forEach(function (oColumn) {
				if (!oColumn.editable) {
					return;
				}

				if (oColumn.sClass.indexOf(constants.CELL_EDITABLE) < 0) {
					oColumn.sClass += " " + constants.CELL_EDITABLE;
				}

				if (oColumn.editable === true) {
					var nodes = dt.api().column(oColumn.name + ":name").nodes();

                    $.each(nodes, function(index, node){
	                    var row = dt.api().row(node).node();
	                    var aData = dt.getRowData(row);
	                    var foundSavedData = _getDataFromArrayBySelectionKeys(aData, dt.getSelectionKeysForRow(row), self.s.editedData);

	                    if (foundSavedData) {
							$(node).html(foundSavedData[oColumn.mDataProp]);
	                    }

	                    if (node.editableInited) {
		                    return;
	                    }

                        var $cell = $(node);

						if (oColumn.idx >= settings._oFixedColumns.s.iLeftColumns) {
							$cell.addClass(constants.CELL_EDITABLE);

                            if (oColumn.type === 'select') {
                                _insertMultiSelect.apply(self, [$cell, oColumn]);
                            } else {
                                var options = _getCellOptions(oColumn.type);
                                $cell.editable(_getCallback.apply(self, [oColumn]), options);
                            }

							_setUpKeyDownHandlers($cell, settings);
							node.editableInited = true;
						} else {
							$cell.removeClass(constants.CELL_EDITABLE);
							$cell.addClass(constants.CELL_EDITABLE_CLONED);
						}
					});
				}
			});
			
			$(settings.nTableWrapper).find("td").off(".dtHelperEditable");
			$(settings.nTableWrapper).find("td").on("click.dtHelperEditable", function (e) {
				if ($(this).hasClass(constants.CELL_EDITABLE)) {
					e.stopPropagation();//prevent row selection on editable cells
				}
			});

			dt.updateFixedColumns();

			timeEnd = Date.now();
			var timeTotal = timeEnd - timeStart;
			self.s.loadTime = dt.getFormattedTime({editable: timeTotal});
		};

		self.refreshFixedColumns = function () {
			$("table.DTFC_Cloned").find("td." + constants.CELL_EDITABLE_CLONED).each(function (i, td) {
				if (td.editableInited) {
					return;
				}

				var idx = dt.api().fixedColumns().cellIndex(td).column;
				var oColumn = settings.aoColumns[idx];
				var options = _getCellOptions(oColumn.type);

				$(td).addClass(constants.CELL_EDITABLE);

                if (oColumn.type === 'select') {
                    _insertMultiSelect.apply(self, [$(td), oColumn]);
                } else {
                    $(td).editable(
                        _getCallback.apply(self, [oColumn, true]),
                        options
                    );
                }

				_setUpKeyDownHandlers($(td), settings);
				td.editableInited = true;
			});
		};

		settings.aoDrawCallback.push({
			fn   : self.draw,
			sName: "editable"
		});

		settings._Editable = self;

        self.draw();
	}

	function _getCallback(oColumn, isFixedColumn) {
		var self = this;
		var settings = self.s.dt;
		var dt = settings.oInstance;
		var properties = dt.properties;

		return function (value, settings) {
			var resultValue = value;

			if (properties.editable && $.isFunction(properties.editable.callback)) {
				resultValue = properties.editable.callback(resultValue, this);
			}

			if (isFixedColumn) {//hack for fc inputs to be refreshed
				var cell = dt.api().cell(this).node();
				$(cell).html(resultValue);
			}

			var row = dt.api().row(this).node();
			var aData = dt.getRowData(row);
			var foundData = _getDataFromArrayBySelectionKeys(aData, dt.getSelectionKeysForRow(row), self.s.editedData);
			if (!foundData) {
				aData[oColumn.mDataProp] = resultValue;
				self.s.editedData.push(aData);
			} else {
				foundData[oColumn.mDataProp] = resultValue;
			}

			return resultValue;
		};
	}

	function _getDataFromArrayBySelectionKeys(aData, keys, array) {
		var result = null;
		array.forEach(function (savedData) {
			var matchedKeys = 0;
			keys.forEach(function (key) {
				if (savedData[key] === aData[key]) {
					matchedKeys++;
				}
			});

			if (matchedKeys === keys.length) {
				result = savedData;
				return false;
			}
		});

		return result;
	}

    function _insertMultiSelect($cell, oColumn) {
        var self = this;
        var settings = self.s.dt;
        var dt = settings.oInstance;
		var $select;

        $cell.html(_getCellSelect($cell, oColumn)).addClass(constants.EDITABLE_SELECT);

		$select = $('select', $cell);
		$select.multiselect({
            multiple: false,
            selectedList: 1,
            header: lStringsCommon.COMMON_SELECT_ONE,
            click: function () {
                var select = $(this);
                var nRow = select.closest("tr")[0];
                var aData = dt.getRowData(nRow);
                var foundData = _getDataFromArrayBySelectionKeys(aData, dt.getSelectionKeysForRow(nRow), self.s.editedData);

                setTimeout(function () {
                    var value = select.val();

                    if (!foundData) {
                        aData[oColumn.mDataProp] = value;
                        self.s.editedData.push(aData);
                    } else {
                        foundData[oColumn.mDataProp] = value;
                    }
                }, 20);
            }
        });

		dt.api().columnFilters().adjustSelectWidth($select);
    }

	function _getCellOptions(type) {
		var result;
		switch (type){
			case "date":
				result = defaultOptions.dateField;
				break;
			case "range":
				result = $.extend({}, defaultOptions.textField, {type: "numeric-field"});
				break;
			default:
				result = defaultOptions.textField;
				break;
		}
		return result;
	}

    function _getCellSelect($cell, oColumn) {
        var $input = $('<select/>');

        $.each(oColumn.items, function (index, item) {
            var option;
            if (typeof item === 'string') {
                option = $("<option value='" + item + "'>" + item + "</option>");
            } else {
                option = $("<option value='" + item.value + "'>" + item.value + "</option>");
            }
            $input.append(option);
        });

        var cellValue = $cell.html();
        $input.val(cellValue);

        return $input;
    }

    function _getFormattedTime() {
        var date = new Date();
        var hours = date.getHours() < 10 ? "0" + date.getHours() : date.getHours();
        var minutes = date.getMinutes() < 10 ? "0" + date.getMinutes() : date.getMinutes();
        var ampm = (hours >= 12) ? "PM" : "AM";

       return hours + ":" + minutes + " " + ampm + " EEST";
    }

	function _setUpKeyDownHandlers(cell, settings) {
		cell.keypress(enterPrevent)
			.keydown(function (e) {
				editableKeyDown(e, $(this), settings);
			})
			.click(function (e) {
				takeNativeEditableKeyDownOff(e, settings);
			});
	}

	function editableKeyDown(e, currentCell, settings) {
		if (e.which === 9) {
			e.preventDefault();
			tabHandler(e, currentCell, settings);
		} else if (e.which === 13 || e.which === 40) {
			e.preventDefault();
			downAndEnterHandler(e, currentCell, settings);
		} else if (e.which === 38) {
			e.preventDefault();
			upHandler(e, currentCell, settings);
		}
	}

	/**
	 * keys handlers
	 */
	function getNextEditableCellFromCurrent($currentCell, searchPrevious, settings) {
		var editableCells = $("td.editable", settings.nTableWrapper);
		var currentIndex = editableCells.index($currentCell[0]);
		var nextIndex = !searchPrevious ? currentIndex + 1 : currentIndex - 1;

		if (nextIndex < 0) {
			nextIndex = editableCells.length - 1;
		} else if (nextIndex > editableCells.length - 1) {
			nextIndex = 0;
		}

		return editableCells.eq(nextIndex);
	}

	function tabHandler(e, currentCell, settings) {
		e.stopPropagation();
		var isShiftPressed = e.shiftKey;
		var nextCell = getNextEditableCellFromCurrent(currentCell, isShiftPressed, settings);

		if (nextCell !== null) {
			currentCell.find("form").submit();
			focusCell(nextCell, settings);
		}

	}

	function downAndEnterHandler(e, currentCell, settings) {
		var dt = settings.oInstance;
		var editable = dt.properties.editable;
		var currentRow = currentCell.closest("tr");
		var rowIndex = $(settings.nTableWrapper).find("tr").index(currentRow);
		var nextRow = currentRow.next(":not(.fake-row)");
		var cellIndex = $("td", currentRow).index(currentCell);
		var isFixedColumnsRow = currentRow.closest(".DTFC_Cloned").length > 0;

		currentCell.find("form").submit();

		if (nextRow.length > 0) {
			nextRow.find("td").eq(cellIndex).click();
		} else if (editable && editable.allowRowsGeneration) {
			var data = new Data(settings.aoColumns);
			nextRow = dt.addRowWithoutRedraw(data);
			settings._Editable.draw();

			if (isFixedColumnsRow) {
				nextRow = $(settings.nTableWrapper).find("tr").eq(rowIndex + 2);//row is added in normal table and to the fixedColumns table so we need get next index increasing by 2
			}

			nextRow.find("td").eq(cellIndex).click();
		} else {
			if (isFixedColumnsRow) {
				nextRow = currentRow.closest(".DTFC_Cloned").find("tbody tr:not(." + constants.FAKE_ROW + ")").first();
			} else {
				nextRow = $(settings.nTableWrapper).find("tbody tr:not(." + constants.FAKE_ROW + ")").eq(0);
			}

			nextRow.find("td").eq(cellIndex).click();
		}
	}

	function focusCell($cell, settings) {
		var dt = settings.oInstance;
		var $wrapper = $(settings.nTableWrapper);
		var select = $cell.find("select");
		if (select.length) {
			select.multiselect("open");
			var widget = select.multiselect("widget"); // for table TABbing functionality
			widget.off("keydown.dtHelperEditable");//clear prev;
			widget.on("keydown.dtHelperEditable", function (e) {
				if (e.which === 9) {
					e.preventDefault();
					tabHandler(e, $cell, settings);
				}
			});
		} else {
			$cell.click();
			if (!settings._oFixedColumns) {
				return;
			}

			//adjust scroll position for fc and normal table
			if ($cell.closest(".DTFC_Cloned").length) {
				settings._oFixedColumns.dom.scroller.scrollTop = settings._oFixedColumns.dom.grid.left.liner.scrollTop;
			} else {
				settings._oFixedColumns.dom.grid.left.liner.scrollTop = settings._oFixedColumns.dom.scroller.scrollTop;

				if ($cell.position().left < $(settings._oFixedColumns.dom.grid.left.liner).width()) {
					settings._oFixedColumns.dom.scroller.scrollLeft = 0;
				}
			}
		}
	}

	function upHandler(e, currentCell, settings) {
		var currentRow = currentCell.closest("tr");
		var cellIndex = currentCell.index();
		var nextRow = currentRow.prev(":not(.fake-row)");
		var nextCell;

		if (nextRow.length) {
			currentCell.find("form").submit();
			nextCell = nextRow.find("td").eq(cellIndex);
			nextCell.click();
		}
	}

	/**
	 * prevent FORM in td submitting by enter keypress
	 */
	function enterPrevent(e) {
		if (e.which === 13) {
			e.preventDefault();
		}
	}

	$(document).on("keydown", function (e) {
		if (lastCell && e.keyCode === 9) {
			e.preventDefault();
			var settings = lastCell.closest("table.display").DataTable().settings()[0];
			tabHandler(e, lastCell, settings);

			lastCell = null;
		}
	});

	/**
	 * this function is needed because editable plugin is binding keydown event each time td is clicked.
	 * moreover there is no any context and if you click one td, all other tds automatically affected.
	 *
	 * @see editableKeydownFunctionality
	 * @param e
	 */
	function takeNativeEditableKeyDownOff(e, settings) {
		$("td.editable", settings.nTableWrapper).off("keydown.editable");
	}

	$.fn.dataTable.Api.register('editable()', function () {
		return this;
	});

	$.fn.dataTable.Api.register('editable().getLoadTime()', function () {
		var result;
		this.iterator('table', function (ctx) {
			if (ctx._Editable) {
				result = ctx._Editable.s.loadTime;
			}
		});

		return result;
	});

	$.fn.dataTable.Api.register('editable().refreshFixedColumns()', function () {
		return this.iterator('table', function (ctx) {
			if (ctx._Editable) {
				ctx._Editable.refreshFixedColumns();
			}
		});
	});

	$.fn.dataTable.Api.register('editable().editedData()', function () {
		var result = [];
		this.iterator('table', function (ctx) {
			if (ctx._Editable) {
				result = ctx._Editable.s.editedData;
			}
		});

		return result;
	});


	$.fn.dataTable.Api.register('editable().clearEdit()', function () {
		return this.iterator('table', function (ctx) {
			if (ctx._Editable) {
				ctx._Editable.s.editedData = [];
			}
		});
	});

	$.fn.dataTable.Editable = Editable;
	$.fn.DataTable.Editable = Editable;
});