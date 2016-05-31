define([
	"jquery",
	"plugins/datatables/dtHelperConstants",
	"datatables"
], function ($, constants) {

	var timeStart;
	var timeEnd;

	var EXPAND_SETTINGS = "aoExpandSettings";

	function Expandable(settings) {
		var self = this;
		var dt = settings.oInstance;

		self.options = dt.properties[EXPAND_SETTINGS];//serve for debugging reason

		self.s = {
			loadTime: {
				expandable: "not measured"
			}
		};

		self.draw = function () {
			timeStart = Date.now();
			_generateExpandRows.apply(self, [settings]);
			dt.updateFixedColumns();
			timeEnd = Date.now();

			var timeTotal = timeEnd - timeStart;
			self.s.loadTime = dt.getFormattedTime({expandable: timeTotal});
		};

		self.showChild = function ($row) {
			var row = dt.api().row($row);
			row.child.show();

			var expandCell = dt.api().cell(row, self.options.sExpandColumn + ":name");
			var expandTd = $(expandCell.node());
			expandTd.find(".fa").removeClass("fa-plus-square");
			expandTd.find(".fa").addClass("fa-minus-square");

			_updateAoColumns(settings, $row);
			dt.updateFixedColumns(true);
			dt.api().dtHelperSelect().update();
		};

		self.hideChild = function ($row) {
			var row = dt.api().row($row);
			row.child.hide();

			var expandCell = dt.api().cell(row, self.options.sExpandColumn + ":name");
			var expandTd = $(expandCell.node());
			expandTd.find(".fa").removeClass("fa-minus-square");
			expandTd.find(".fa").addClass("fa-plus-square");

			_updateAoColumns(settings, $row);
			dt.updateFixedColumns(true);
		};

		self.collapseAll = function (){
            $('.expand-collapse-data .fa-minus-square', dt).click();
		};

		self.expandAll= function (){
            $('.expand-collapse-data .fa-plus-square', dt).click();
		};

		settings.aoDrawCallback.push({
			fn: self.draw,
			sName: "expandable"
		});

		self.draw();

		settings._Expandable = this;
	}

	function _generateExpandRows(settings) {
		var self = this;
		var dt = settings.oInstance;
		var properties = dt.properties;
		_updateAoColumns(settings);
		_applyExpandForExistingRows.apply(self, [settings]);
	}

	function _applyExpandForExistingRows(settings) {
		var self = this;
		var dt = settings.oInstance;
		var properties = dt.properties;
		var expandSettings = properties[EXPAND_SETTINGS];

		dt.api().rows().every(function (rowIdx, tableLoop, rowLoop) {
			var row = this;

			if (row.child()) {
				return;
			}

			var $row = $(row.node());
			var data = row.data();
			var children = data[expandSettings.sExpandProp];//array
			var expandCell = dt.api().cell(row, expandSettings.sExpandColumn + ":name");
			var expandTd = $(expandCell.node());

			if (!children || !children.length) {
				return;
			}

			var childrenRows = [];

			children.forEach(function (aData) {
				var keys = dt.api().dtHelperSelect().expandableKeys();
				var isMatchedToParent = true;

				//don't add a copy of the main row to child rows
				if (dt.properties.aoExpandSettings.duplicateParent) {
					isMatchedToParent = false;
				} else {
					isMatchedToParent = dt.api().dtHelperSelect().isSelected(aData, keys, data);
				}

				if (!isMatchedToParent) {
					var parity = $row.hasClass(constants.EVEN) ? constants.EVEN : constants.ODD;
					var childRow = dt.createTr(aData, $row).addClass(parity).addClass(constants.CHILD_ROW);
					var parentWithoutChildren = $.extend(true, {}, data);
					delete parentWithoutChildren[expandSettings.sExpandProp];
					aData.parentData = parentWithoutChildren;
					childRow.attr("aData", JSON.stringify(aData));
					childrenRows.push(childRow[0]);
				}
			});
			
			if (childrenRows && childrenRows.length) {
				expandTd.prepend(dt.properties.aoExpandSettings.sExpandPicIcon);
				expandTd.addClass(constants.EXPANDABLE);
				expandTd.off(".dtHelperExpandable");
				expandTd.on("click.dtHelperExpandable", function (e) {
					e.stopPropagation();//select feature block
					var rowCurrent = dt.api().row($row);
					if (rowCurrent.child.isShown()) {
						self.hideChild($row);
					} else {
						self.showChild($row);
					}
				});

				row.child(childrenRows);
			} else {
				expandTd.removeClass(constants.EXPANDABLE);
			}
		});
	}
	
	function _updateAoColumns(settings, $row) {
		var dt = settings.oInstance;
		var properties = dt.properties;
		var expandSettings = properties[EXPAND_SETTINGS];

		if (!properties.aoExpandSettings.sExpandColumn) {
			alertModal("Trying to init expandable module without 'sExpandColumn' option given! Table: " + settings.sInstance);
			return;
		}

		if (!$row) {
			$.each(settings.aoColumns, function (index, column) {
				if (column.name
					&& expandSettings.sExpandColumn
					&& column.sClass.indexOf(constants.EXPANDABLE) === -1
					&& column.name === expandSettings.sExpandColumn) {

					settings.aoColumns[index].sClass += " " + constants.EXPANDABLE;
				}
			});
		}


		if ($row) {
			var row = dt.api().row($row);
			var isShownChildren = row.child.isShown();
			var children = row.child();//array
			var rowIndex = row.index();
			var aoData = settings.aoData;//array
			var childAoData = {};

			if (!children || !children.length) {
				return;
			}

			children.each(function (i, childRow) {
				var childData = JSON.parse($(childRow).attr("aData"));
				var childRowIndex = rowIndex + 1 + i;
				var anCells = [];
				$(childRow).find("td").each(function (i, td) {
					anCells.push(td);
				});

				if (isShownChildren) {
					childAoData = $.extend( true, {}, $.fn.DataTable.models.oRow, {
						src: expandSettings.sExpandProp,//only debug reasons, dt understands only 'dom' or 'data' value
						_aData: childData,
						anCells: anCells,
						nTr: childRow,
						parentTr: $row[0]
					} );


					aoData.splice(childRowIndex, 0, childAoData);
					settings.aiDisplay.push(settings.aiDisplay.length);
					settings.aiDisplayMaster.push(settings.aiDisplay.length);
				} else {
					aoData.splice(childRowIndex - i, 1);
					settings.aiDisplay.pop();
					settings.aiDisplayMaster.pop();
				}
			});

			_updateAoDataIndexes(settings);
		}
	}

	function _updateAoDataIndexes(settings) {
		var aoData = settings.aoData;
		aoData.forEach(function (oData, i) {
			oData.idx = i;
			oData.nTr._DT_RowIndex = i;
			$(oData.anCells).each(function (columnIndex, td) {
				td._DT_CellIndex = {
					row: i,
					column: columnIndex
				};
			});
		});
	}

	$.fn.dataTable.Api.register('expandable()', function () {
		return this;
	});

	$.fn.dataTable.Api.register('expandable().getLoadTime()', function () {
		var result;
		this.iterator('table', function (ctx) {
			if (ctx._Expandable) {
				result = ctx._Expandable.s.loadTime;
			}
		});

		return result;
	});

	$.fn.dataTable.Api.register('expandable().isSelectChildrenEnabled()', function () {
		var result = false;
		this.iterator('table', function (ctx) {
			if (ctx._Expandable) {
				result = ctx._Expandable.options.selectAllExpandable;
			}
		});

		return result;
	});

	$.fn.dataTable.Api.register('expandable().getChildren()', function (aData) {
		var result = null;
		this.iterator('table', function (ctx) {
			if (ctx._Expandable) {
				result = aData[ctx._Expandable.options.sExpandProp];
			}
		});

		return result;
	});

	$.fn.dataTable.Api.register('expandable().draw()', function () {
		return this.iterator('table', function (ctx) {
			if (ctx._Expandable) {
				ctx._Expandable.draw();
			}
		});
	});


	$.fn.dataTable.Api.register('expandable().expandAll()', function () {
		return this.iterator('table', function (ctx) {
			if (ctx._Expandable) {
				ctx._Expandable.expandAll();
			}
		});
	});

	$.fn.dataTable.Api.register('expandable().collapseAll()', function () {
		return this.iterator('table', function (ctx) {
			if (ctx._Expandable) {
				ctx._Expandable.collapseAll();
			}
		});
	});

	$.fn.dataTable.Expandable = Expandable;
	$.fn.DataTable.Expandable = Expandable;

	$.fn.dataTableExt.aoFeatures.push({
		"fnInit"  : function (settings) {//DataTables settings object
			new Expandable(settings);
			return null;//Node (optional) - the element which contains your feature. Note that the return may also be void if your plug-in does not require to inject any DOM elements
		},
		"cFeature": "E",//The character that will be used to locate this plug-in in sDom. This should be upper-case (plug-ins by convention use upper case, while built-in features use lower case
		"sFeature": "expandableRows"//The name of the feature. Development use only, not seen by the end user.
	});

});