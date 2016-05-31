define([
	"jquery",
	"plugins/datatables/dtHelperConstants",
	"datatables"
], function ($, constants) {

	var timeStart;
	var timeEnd;

	function DtHelperSelect(settings) {
		var self = this;

		var dt = settings.oInstance;//jquery obj
		dt[constants.ARRAY_NAME_SELECTED] = [];
		dt[constants.ARRAY_NAME_SELECTED_SECONDARY] = [];
		dt[constants.PROPERTY_NAME_SELECTED_SINGLE_ROW] = null;

		self.s = {
			loadTime: {
				select: "not measured"
			},
			dt: settings
		};

		self.selectAll = function () {
			var selectAllCheckbox = $(settings.nTableWrapper).find("." + constants.SELECT_ALL_CHECKBOX);
			selectAllCheckbox.toggleClass(constants.SELECTED);
			var isSelectAction = selectAllCheckbox.hasClass(constants.SELECTED);

			if (isSelectAction) {
				settings.oInstance.api().rows().select();
			} else {
				settings.oInstance.api().rows().deselect();
			}
		};
		
		self.update = function () {
			timeStart = Date.now();
			_setUpClickHandlers.apply(self, [settings]);

			if (dt.properties.rowSelection
				&& !dt[constants.PROPERTY_NAME_SELECTED_SINGLE_ROW]) {
				
				dt.api().row(0).select();//select first
			}

            var selectedNum = 0;
			dt.api().rows().every(function (rowIdx, tableLoop, rowLoop) {
				var row = dt.api().row(rowIdx);
				var data = row.data();
				var $row = $(row.node());
				var keys;

				if ($row.hasClass(constants.CHILD_ROW)){
					keys = _getExpandableSelectionKeys(settings);
				} else {
					keys = dt.properties[constants.ARRAY_NAME_SELECTION_KEYS];
				}

				var isSelected = _checkIfRowIsSelected(dt, data, keys, constants.ARRAY_NAME_SELECTED);
				if (isSelected) {
					row.select();
                    selectedNum++;
				}
			});

            _enableDisableSelectAll.apply(self, [settings, selectedNum]);
			dt.updateFixedColumns();

			timeEnd = Date.now();
			var timeTotal = timeEnd - timeStart;
			self.s.loadTime = dt.getFormattedTime({select: timeTotal});
		};

		self.selectPrimary = function (row) {
			var dt = settings.oInstance;
			var data = dt.getRowData(row);

			var isAlreadySelected = _checkIfRowIsSelected(dt, data, dt.properties[constants.ARRAY_NAME_SELECTION_KEYS], constants.ARRAY_NAME_SELECTED);

			if (!isAlreadySelected) {
				dt.api().rows().deselect();
			}

			dt.api().row(row).select();
			return data;
		};

		self.selectSecondary = function (row) {
			var dt = settings.oInstance;
			var data = dt.getRowData(row);
			var keys = _getSecondaryKeys(settings);
			var isAlreadySelected = _checkIfRowIsSelected(dt, data, keys, constants.ARRAY_NAME_SELECTED_SECONDARY);

			if (!isAlreadySelected) {
				row.addClass(constants.SELECTED_SECONDARY);
				_selectData(dt, data, constants.ARRAY_NAME_SELECTED_SECONDARY);
			} else {
				row.removeClass(constants.SELECTED_SECONDARY);
				_deselectData(dt, data, keys, constants.ARRAY_NAME_SELECTED_SECONDARY);
			}

			return data;
		};

		self.clearSelections = function () {
			dt[constants.ARRAY_NAME_SELECTED] = [];
			dt[constants.ARRAY_NAME_SELECTED_SECONDARY] = [];
			dt[constants.PROPERTY_NAME_SELECTED_SINGLE_ROW] = null;

			dt.api().rows().deselect();
			$(settings.nTableWrapper).find(".sel_all").removeClass(constants.SELECTED);
			$(settings.nTableWrapper).find("tr").removeClass(constants.SELECTED_SECONDARY);
		};

		self.updateFCRow = function (iRow, selected) {
			var fcRow = $("tbody", settings._oFixedColumns.dom.grid.left.body).find("tr").eq(iRow);

			if (selected) {
				fcRow.addClass(constants.SELECTED);
			} else {
				fcRow.removeClass(constants.SELECTED);
			}
		};

		settings.oInstance.on("select.dt", function (e, indexArray, itemType) {
			if (e.namespace !== "dt") {
				return false;
			}

			var dt = settings.oInstance;
			indexArray[0].forEach(function (rowIndex) {
				var row = dt.api().row(rowIndex);
				var aData = dt.getRowData(row.node());
				var isParentRow = true;
				var selectAllExpandable = dt.api().expandable().isSelectChildrenEnabled();
				var keys;

				if ($(row.node()).hasClass(constants.CHILD_ROW)) {
					keys = _getExpandableSelectionKeys(settings);
					isParentRow = false;
				} else {
					keys = dt.properties[constants.ARRAY_NAME_SELECTION_KEYS];
				}

				var isAlreadySelected;
				var selection;
				if (dt.properties.rowSelection) {
					selection = constants.PROPERTY_NAME_SELECTED_SINGLE_ROW;
				} else {
					selection = constants.ARRAY_NAME_SELECTED;
				}

				isAlreadySelected = _checkIfRowIsSelected(dt, aData, keys, selection);

				if (!isAlreadySelected) {
					_selectData(settings.oInstance, aData, selection);
				}

				if (selectAllExpandable && isParentRow) {
					_selectChildren.apply(self, [row, aData]);
				}

				dt.api().fixedColumns().updateRow(rowIndex, true);
			});
		});

		settings.oInstance.on("deselect.dt", function (e, indexArray, itemType) {
			if (e.namespace !== "dt") {
				return false;
			}

			var dt = settings.oInstance;
			var keys = dt.properties[constants.ARRAY_NAME_SELECTION_KEYS];

			indexArray[0].forEach(function (rowIndex) {
				var row = settings.oInstance.api().row(rowIndex);
				var aData = row.data();
				var selectAllExpandable = dt.api().expandable().isSelectChildrenEnabled();
				_deselectData(settings.oInstance, aData, keys, constants.ARRAY_NAME_SELECTED);

				if (selectAllExpandable) {
					_deselectChildren.apply(self, [row, aData]);
				}

				dt.api().fixedColumns().updateRow(rowIndex, false);
			});
		});

		settings.aoDrawCallback.push({
			fn: self.update,
			sName: "dtHelperSelect"
		});

		self.update();

		settings._DtHelperSelect = this;
	}

	function _deselectChildren(row, aData) {
		var self = this;
		var settings = self.s.dt;
		var dt = settings.oInstance;
		var children = dt.api().expandable().getChildren(aData);
		var keys = _getExpandableSelectionKeys(settings);
		var isShown = row.child.isShown();

		if (children && children.length) {
			children.forEach(function (childData, i) {
				if (isShown) {
					var childRow = row.child()[i];
					dt.api().row(childRow).deselect();
				} else {// we cannot use internal api if children hidden
					_deselectData(dt, childData, keys, constants.ARRAY_NAME_SELECTED);
				}
			});
		}

		dt.updateFixedColumns();
	}

	function _selectChildren(row, aData) {
		var self = this;
		var settings = self.s.dt;
		var dt = settings.oInstance;
		var children = dt.api().expandable().getChildren(aData);
		var keys = _getExpandableSelectionKeys(settings);
		var isShown = row.child.isShown();

		if (children && children.length) {
			children.forEach(function (childData, i) {
				if (isShown) {
					var childRow = row.child()[i];
					dt.api().row(childRow).select();
				} else {// we cannot use internal api if children hidden
					var isAlreadySelected = _checkIfRowIsSelected(dt, childData, keys, constants.ARRAY_NAME_SELECTED);

					if (!isAlreadySelected) {
						_selectData(dt, childData, constants.ARRAY_NAME_SELECTED);
					}
				}
			});
		}

		dt.updateFixedColumns();
	}

    function _enableDisableSelectAll(settings, selectedNum) {
        var totalRowsNum = settings.aoData.length;
        var isCheckBoxSelected = $('.' + constants.SELECT_ALL_CHECKBOX, settings.nTHead).hasClass('selected');

        if ( totalRowsNum > 0 && totalRowsNum === selectedNum) {
            if (!isCheckBoxSelected) {
                $('.' + constants.SELECT_ALL_CHECKBOX, settings.nTHead).addClass('selected');
            }

        } else {
            if (isCheckBoxSelected) {
                $('.' + constants.SELECT_ALL_CHECKBOX, settings.nTHead).removeClass('selected');
            }
        }
    }
	/**
	 * required to be called using .apply(self, []) style for giving internal api
	 * @param settings
	 * @private
	 */
	function _setUpClickHandlers(settings) {
		var dtHelperSelect = this;
		var dt = settings.oInstance;
		$(settings.nTableWrapper).off(".dtHelperSelect");
		$(settings.nTable).find(constants.SECONDARY_CHECKBOX_TD).off(".dtHelperSelect");

		$(settings.nTableWrapper).on("dblclick.dtHelperSelect", "tr", function (e) {
			var isFixedColumnsRow = $(this).closest(".DTFC_Cloned").length === 1;
			if (isFixedColumnsRow) {
				$(dt.api().row(this).node()).dblclick();
			}
		});

		$(settings.nTableWrapper).on("click.dtHelperSelect", function (e) {
			if ($(e.target).hasClass(constants.SELECT_ALL_CHECKBOX)) {
				dtHelperSelect.selectAll();
			}
		});

		$(settings.nTable).find(constants.SECONDARY_CHECKBOX_TD).on("click.dtHelperSelect", function (e) {
			e.stopPropagation();//prevent default select plugin
			var row = $(e.target).closest("tr");
			dtHelperSelect.selectSecondary(row);
		});
	}

	function _getExpandableSelectionKeys(settings) {
		var properties = settings.oInstance.properties;

		return !properties.aoExpandSettings[constants.ARRAY_NAME_SELECTION_KEYS]
			? properties[constants.ARRAY_NAME_SELECTION_KEYS]
			: properties.aoExpandSettings[constants.ARRAY_NAME_SELECTION_KEYS];
	}

	function _getSecondaryKeys(settings) {
		var properties = settings.oInstance.properties;

		return properties[constants.ARRAY_NAME_SELECTION_KEYS_SECONDARY]
			? properties[constants.ARRAY_NAME_SELECTION_KEYS_SECONDARY]
			: properties[constants.ARRAY_NAME_SELECTION_KEYS];
	}


	function _selectData(dt, aData, arrayName){
		if ($.isArray(dt[arrayName])){
			dt[arrayName].push(aData);
		} else {
			dt[arrayName] = aData;
		}

		dt.trigger("selectionChanged." + arrayName);
	}

	function _deselectData(dt, aData, keys, arrayName){
		dt[arrayName] = $.grep(dt[arrayName], function (value) {
			var equal = true;
			for (var i = 0; i < keys.length; i++) {
				if (value[keys[i]] !== aData[keys[i]]) {
					equal = false;
				}
			}
			return !equal;
		});

		dt.trigger("selectionChanged." + arrayName);
	}

	/**
	 * row counts as selected if all selection keys matched
	 * may be used for just two objects compare
	 * ex: dt, aData = {id: 1, ...}, keys = {"id"}, selection = {id: 1, ...} returns true
	 *
	 * @param dt
	 * @param row - DOM dt or aData
	 * @param keys
	 * @param selection
	 * @selection - name of dt property or plain object to check match
	 * @returns {boolean}
	 */
	function _checkIfRowIsSelected(dt, row, keys, selection) {
		var aData = $.isPlainObject(row) ? row : dt.getRowData(dt, row);
		var selected;

		if ($.isPlainObject(selection)) {
			selected = selection;
		} else if ($.isArray(selection)) {
			selected = selection;
		} else if (typeof selection === "string") {
			selected = dt[selection];
		}

		var booleanArray = [];
		var exist = false;
		var matchedSelectionKeysCount = 0; // row is selected only if all selection keys are matched in this row
		var i;

		if (!aData || selected === null) {
			return exist;
		}

		for (i = 0; i < keys.length; i++) {
			var matched = false;
			var propertyName = keys[i];
			var dataValue = aData[propertyName];
			var selectedData;
			var selectionKeyValue;

			if ($.isPlainObject(selected)) {//if row single select
				selectedData = selected;
				selectionKeyValue = selectedData[propertyName];
				if (selectionKeyValue === dataValue) {
					matched = true;
				}
			} else {
				for (var j = 0; j < selected.length; j++) {
					selectedData = selected[j];

					if (!selectedData) {
						matched = false;
						continue;
					}

					selectionKeyValue = selectedData[propertyName];

					if (selectionKeyValue === dataValue) {
						matched = true;
						break;
					}
				}
			}

			booleanArray.push(matched);
		}

		for (i = 0; i < booleanArray.length; i++) {
			if (booleanArray[i] === true) {
				matchedSelectionKeysCount++;
			}
		}

		if (matchedSelectionKeysCount === booleanArray.length) {
			exist = true;
		}

		return exist;
	}

	$.fn.dataTable.Api.register('dtHelperSelect()', function () {
		return this;
	});

	$.fn.dataTable.Api.register('dtHelperSelect().getLoadTime()', function () {
		var result;
		this.iterator('table', function (ctx) {
			if (ctx._DtHelperSelect) {
				result = ctx._DtHelperSelect.s.loadTime;
			}
		});

		return result;
	});

	$.fn.dataTable.Api.register('dtHelperSelect().selectAll()', function () {
		return this.iterator('table', function (ctx) {
			if (ctx._DtHelperSelect) {
				ctx._DtHelperSelect.selectAll();
			}
		});
	});

	$.fn.dataTable.Api.register('dtHelperSelect().clearAll()', function () {
		return this.iterator('table', function (ctx) {
			if (ctx._DtHelperSelect) {
				ctx._DtHelperSelect.clearSelections();
			}
		});
	});

	$.fn.dataTable.Api.register('dtHelperSelect().update()', function () {
		return this.iterator('table', function (ctx) {
			if (ctx._DtHelperSelect) {
				ctx._DtHelperSelect.update();
			}
		});
	});

	$.fn.dataTable.Api.register('dtHelperSelect().selectPrimary()', function (row) {
		var aData;
		this.iterator('table', function (ctx) {
			if (ctx._DtHelperSelect) {
				aData = ctx._DtHelperSelect.selectPrimary(row);
			}
		});

		return aData;
	});

	$.fn.dataTable.Api.register('dtHelperSelect().expandableKeys()', function () {
		var keys;

		this.iterator('table', function (settings) {
			if (settings._DtHelperSelect) {
				keys = _getExpandableSelectionKeys(settings);
			}
		});

		return keys;
	});

	$.fn.dataTable.Api.register('dtHelperSelect().isSelected()', function (row, keys, selection) {
		var matched;

		this.iterator('table', function (settings) {
			if (settings._DtHelperSelect) {
				matched = _checkIfRowIsSelected(settings.oInstance, row, keys, selection);
			}
		});

		return matched;
	});

	$.fn.dataTable.Api.register('dtHelperSelect().selectSecondary()', function (row) {
		var aData;
		this.iterator('table', function (ctx) {
			if (ctx._DtHelperSelect) {
				aData = ctx._DtHelperSelect.selectSecondary(row);
			}
		});

		return aData;
	});


	$.fn.dataTable.Api.register('fixedColumns().updateRow()', function (iRow, selected) {
		return this.iterator('table', function (ctx) {
			if (ctx._oFixedColumns && ctx._DtHelperSelect) {
				ctx._DtHelperSelect.updateFCRow(iRow, selected);
			}
		});
	});

	$.fn.dataTable.DtHelperSelect = DtHelperSelect;
	$.fn.DataTable.DtHelperSelect = DtHelperSelect;

	$.fn.dataTableExt.aoFeatures.push({
		"fnInit"  : function (settings) {//DataTables settings object
			new DtHelperSelect(settings);
			return null;//Node (optional) - the element which contains your feature. Note that the return may also be void if your plug-in does not require to inject any DOM elements
		},
		"cFeature": "H",//The character that will be used to locate this plug-in in sDom. This should be upper-case (plug-ins by convention use upper case, while built-in features use lower case
		"sFeature": "DtHelperSelect"//The name of the feature. Development use only, not seen by the end user.
	});

});