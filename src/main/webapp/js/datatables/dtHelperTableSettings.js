define([
	"jquery",
	"plugins/datatables/dtHelperConstants",
	"plugins/hotkey.framework",
	"plugins/two.sided.select",
	"datatables",
	"colReorder"
], function ($, constants, hotkeys) {

	var timeStart;
	var timeEnd;

	TableSettings.count = 0;
	function TableSettings(settings) {
		var self = this;
		self.id = TableSettings.count++;

		self.s = {
			loadTime: {
				tableSettings: "not measured"
			}
		};

		new $.fn.dataTable.ColReorder(settings, {
			realtime: false
		});

		var dt = settings.oInstance;
		var properties = dt.properties;
		var tableSettings = properties.tableSettings;
		var currentTableSettings = properties.customColumnOrder;

		self.dialog = null;

		self.open = function () {
			if (!tableSettings) {
				alertModal("There is no table settings for the table");
				return;
			}

			if (!self.dialog) {
				var tableDialog = $(dt.properties.tableSettingsButton).closest('.ui-dialog');
				var positionRelativeTo = window;
				if (tableDialog && tableDialog.length) {
					positionRelativeTo = tableDialog;
				}

				var dialog = _createSettingsDialog.apply(self, [settings]);
				self.dialog = $(dialog).dialog({
					title    : settings.oLanguage.sTableSettingsTitle,
					width    : "600",
					modal    : true,
					resizable: false,
					position : {my: 'center', at: 'center', of: positionRelativeTo},
					open     : function (event, ui) {
						_setValues.apply(self, [settings]);
						hotkeys.changeContexts([]);
					},
					close    : function (event, ui) {
						hotkeys.revertContexts();
					},
					create   : function (event, ui) {
						var dialog = this;

						$(".two-sided-select", dialog).twoSidedSelect();

						$(".defaults-btn", dialog).click(function () {
							var tableSettings = dt.properties.tableSettings;
							tableSettings.currentSettings = $.grep(tableSettings.allColumns, function (column, index) {
								return column.defaultVisibilityFlag === 'Y';
							});

							_setValues.apply(self, [settings, true]);
						});

						$(".btn-cancel", dialog).click(function () {
							self.dialog.dialog("close");
						});

						$(".btn-save", dialog).click(function () {
							self.save();
						});
					}
				});
			} else {
				self.dialog.dialog("open");
			}
		};

		self.apply = function () {
			timeStart = Date.now();
			var currentColumns = currentTableSettings ? currentTableSettings : settings.oInstance.properties.tableSettings.currentSettings;
			_updateTableState(settings, currentColumns);

			if ($.isFunction(dt.callRowCallbacks)){
				dt.api().rows().every(function (rowIdx, tableLoop, rowLoop) {
					var nRow = this.node();
					var aData = this.data();
					dt.callRowCallbacks(nRow, aData, rowIdx);
				});
			}


			timeEnd = Date.now();
			var timeTotal = timeEnd - timeStart;

			if ($.isFunction(dt.getFormattedTime)) {
				self.s.loadTime = dt.getFormattedTime({tableSettings: timeTotal});
			}
		};

		self.save = function (fromUi) {
			var tableSettings = dt.properties.tableSettings;
			var areFiltersOpen = dt.api().columnFilters().areOpen();
			var selectedColumns;
			var freeze;

			if (!fromUi) {
				var currentSettings = [];
				selectedColumns = $(".two-sided-select", self.dialog).twoSidedSelect("selectedValues");
				freeze = $(".two-sided-select", self.dialog).twoSidedSelect("freezeIndex");
				tableSettings.currentTableSettings.freezeColumns = freeze;
				tableSettings.currentTableSettings.perPage = $("#" + self.id + "per-page").val();
				tableSettings.currentTableSettings.filtersOpen = $(".filter-cb", self.dialog).is(":checked") ? "Y" : "N";
				selectedColumns.forEach(function (option, i) {
					var column = $.grep(dt.properties.tableSettings.currentSettings, function (column) {
						return column.id === Number(option.value);
					});

					if (column === null || column.length === 0) {
						column = $.grep(dt.properties.tableSettings.allColumns, function (find) {
							return find.id === Number(option.value);
						});
					}

					currentSettings.push(column[0]);
				});
				tableSettings.currentSettings = currentSettings;
			} else {
				tableSettings.currentTableSettings.filtersOpen = areFiltersOpen ? "Y" : "N";
				tableSettings.currentTableSettings.perPage = $(settings.nTableWrapper).find("select[name='datatable_length']").val();
			}

			tableSettings.currentSettings.forEach(function (column) {
				var index = dt.api().column(column.name + ":name").index();
				var oColumn = settings.aoColumns[index];
				column.width = parseInt(oColumn.sWidth);
			});

			dt.properties.filtersOpen = areFiltersOpen;

			var previousTraditional = $.ajaxSettings.traditional;
			$.ajaxSettings.traditional = true;
			$.ajax({
				"url"     : 'saveTableSettings.sf',
				"dataType": 'text',
				"data"    : {
					tableName    : tableSettings.tableName,
					tableColumns : JSON.stringify(tableSettings.currentSettings),
					tableSettings: JSON.stringify(tableSettings.currentTableSettings)
				},
				"type"    : 'POST',
				"timeout" : 30000,
				"success" : function (data) {
					$.ajaxSettings.traditional = previousTraditional;
					_updateTableState(settings, tableSettings.currentSettings);

					notify(settings.oLanguage.sTableSettingsSuccess);

					if (self.dialog) {
						self.dialog.dialog("close");
					}
				}
			});
		};

		// dt.on("column-reorder.dt", function (e, settings, reorderParams) {
		// 	console.log(reorderParams);
		// });

		self.apply();

		settings._TableSettings = self;
	}

	function _updateTableState(settings, visibleColumns) {
		var dt = settings.oInstance;
		_updateUiState(settings, visibleColumns);
		dt.api().draw();
	}

	function _updateUiState(settings, visibleColumns) {
		var dt = settings.oInstance;
		var tableSettings = dt.properties.tableSettings;

		dt.api().colReorder.order(_getOrderArray(settings));
		settings.aoHeader[0].forEach(function (header) {
			$(header.cell).off('mousedown.ColReorder');
		});

		settings.aoColumns.forEach(function (oColumn, oColIndex) {
			if (!oColumn.name) {//checkboxes
				return;
			}

			var visible;
			var columnSettings;
			var i;

			for (i = 0; i < visibleColumns.length; i++) {
				if (visibleColumns[i].name === oColumn.name) {
					visible = true;
					columnSettings = visibleColumns[i];
					break;
				}
			}

			//do not update width if resize is not allowed (remain original settings width)
			if (columnSettings
				&& parseInt(columnSettings.width) > 0
				&& oColumn.resize !== false
				&& oColumn.sClass.indexOf(constants.FIXED_SIZE) < 0) {

				oColumn.width = parseInt(columnSettings.width);
				oColumn.sWidthOrig = parseInt(columnSettings.width);
				delete oColumn.sWidth;
			}

			if (!visible) {
				dt.api().column(oColumn.name + ":name").visible(false);
			} else {
				dt.api().column(oColumn.name + ":name").visible(true);
			}

		});

		if (!tableSettings) {
			return;
		}

		var leftColumns = tableSettings.currentTableSettings.freezeColumns + (dt.checkboxesUsed ? 1 : 0);

		var perPage = $(settings.nTableWrapper).find("select[name='datatable_length']");

		if (tableSettings.currentTableSettings.perPage > 0) {
			dt.api().page.len(tableSettings.currentTableSettings.perPage);
			perPage.val(String(tableSettings.currentTableSettings.perPage));
			perPage.multiselect("refresh");
		}

		if (settings._oFixedColumns) {
			settings._oFixedColumns.s.iLeftColumns = leftColumns;
			settings._oFixedColumns.fnRedrawLayout();
		}

		//colreorder reset
		settings._colReorder.s.init.iFixedColumnsLeft = leftColumns;

		// settings._colReorder._fnConstruct();

		//colResize update
		if (settings._colResize) {
			settings._colResize.s.init.exclude = dt.getExcludeResizeArray();
		}

		if (tableSettings.currentTableSettings.filtersOpen === "Y") {
			dt.api().columnFilters().show();
		} else {
			dt.api().columnFilters().hide();
		}

		dt.api().columns.adjust();
	}

	function _getOrderArray(settings) {
		var dt = settings.oInstance;
		var tableSettings = dt.properties.tableSettings;
		var customColumnOrder = dt.properties.customColumnOrder;
		var currentSettings = customColumnOrder ? customColumnOrder : tableSettings.currentSettings;
		var aoColumns = settings.aoColumns;
		var result = [];

		if (dt.checkboxesUsed) {
			result.push(0);
		}

		currentSettings.forEach(function (currentColumn) {
			var colIndex = dt.api().column(currentColumn.name + ":name").index();

			if (colIndex === undefined) {
				console.error("Column name from server is not exist in declared aoColumns. Columns: '" + currentColumn.name + "', table: '" + settings.sInstance + "'");
			}

			result.push(colIndex);
		});

		aoColumns.forEach(function (oColumn, i) {
			if (result.indexOf(i) < 0) {
				result.push(i);
			}
		});

		return result;
	}

	function _setValues(settings, defaults) {
		var self = this;
		var dt = settings.oInstance;
		var tableSettings = dt.properties.tableSettings;
		var currentTableSettings = tableSettings.currentTableSettings;
		var twoSidedSelect = $("#" + self.id + "table-settings-select");
		var selectedColumns = tableSettings.currentSettings;
		var tableWidth = $(settings.nTableWrapper).width();
		twoSidedSelect.twoSidedSelect("clearAll");

		var unselectedColumns = $.grep(tableSettings.allColumns, function (element, index) {
			for (var i = 0; i < selectedColumns.length; i++) {
				if (element.id === selectedColumns[i].id) {
					return false;
				}
			}
			return true;
		});

		//items per page
		var tableLengthDd = $("#" + self.id + "per-page");
		tableLengthDd.find("option").remove();

		$.each(settings.aLengthMenu[0], function (k, v) {
			var option = $("<option/>").text(settings.aLengthMenu[1][k]).val(v);
			tableLengthDd.append(option);
		});

		tableLengthDd.bmultiselect("rebuild");

		if (currentTableSettings.perPage) {
			tableLengthDd.bmultiselect("select", currentTableSettings.perPage);
		}

		var filtersOpenCheckbox = $(".filter-cb", self.dialog);
		//filters open
		var needsClick = ((currentTableSettings.filtersOpen === "Y") !== (filtersOpenCheckbox.is(":checked")));

		if (needsClick) {
			$("#tick_img_filter-cb" + self.id, self.dialog).click();
		}

		unselectedColumns.forEach(function (column, i) {
			var oColumn = _getColumnByName(settings, column.name);

			if (oColumn === null) {
				console.error(column.name + " is not declared in dtHelper");
			}

			var width;
			if (oColumn.sWidth) {
				width = Math.max(parseInt(oColumn.sWidth), constants.MIN_COL_WITH);
			} else {
				width = constants.MIN_COL_WITH;
			}


			twoSidedSelect.twoSidedSelect("add", {
				name       : oColumn.sTitle && oColumn.sTitle !== "" ? oColumn.sTitle : oColumn.fakeTitle,
				value      : column.id,
				isSelected : false,
				isMandatory: column.mandatoryFlag === 'Y',
				width      : width,
				maxWidth   : tableWidth
			});
		});

		//add selected
		selectedColumns.forEach(function (column, i) {
			var oColumn = _getColumnByName(settings, column.name);

			if (oColumn === null) {
				console.error(column.name + " is not declared in dtHelper");
			}

			var width;
			if (oColumn.sWidth) {
				width = Math.max(parseInt(oColumn.sWidth), constants.MIN_COL_WITH);
			} else {
				width = constants.MIN_COL_WITH;
			}

			var title = oColumn.sTitle && oColumn.sTitle !== "" ? oColumn.sTitle : oColumn.fakeTitle;

			twoSidedSelect.twoSidedSelect("add", {
				name       : title,
				value      : column.id,
				isSelected : true,
				isMandatory: column.mandatoryFlag === 'Y',
				width      : width,
				maxWidth   : tableWidth
			});
		});

		twoSidedSelect.twoSidedSelect("freezeAt", dt.properties.tableSettings.currentTableSettings.freezeColumns - 1);
	}

	function _getColumnByName(settings, name) {
		var columns = settings.aoColumns;
		for (var i = 0; i < columns.length; i++) {
			var column = columns[i];

			if (column.name === name) {
				return column;
			}
		}

		return null;
	}

	function _createSettingsDialog(settings) {
		var self = this;

		var dialog = $("<div/>").attr("id", self.id + "table-settings").addClass('modal_dialog table-settings-dialog');
		var twoSidedSelect = $("<div/>").attr("id", self.id + "table-settings-select").addClass('two-sided-select');
		var el;

		twoSidedSelect.append($("<select/>").attr("id", "myselecttsms").attr("name", "myselecttsms").attr("multiple", "true").attr("size", 6).addClass("unselected-select"));
		el = $("<div/>").addClass("select-buttons");
		el.append($("<button/>").addClass("add-btn btn btn-primary").append("&rsaquo;"));
		el.append($("<button/>").addClass("add-all-btn btn btn-primary").append("&raquo;"));
		el.append($("<button/>").addClass("remove-btn btn btn-primary").append("&lsaquo;"));
		el.append($("<button/>").addClass("remove-all-btn btn btn-primary").append("&laquo;"));
		twoSidedSelect.append(el);
		twoSidedSelect.append($("<select/>").attr("id", "myselect").attr("name", "myselect[]").attr("multiple", "true").attr("size", 6).addClass("selected-select"));

		el = $("<div/>").addClass("sort-buttons");
		el.append($("<button/>").addClass("up-btn btn btn-primary").append(settings.oLanguage.sTableSettingsUp));
		el.append($("<button/>").addClass("down-btn btn btn-primary").append(settings.oLanguage.sTableSettingsDown));
		el.append($("<button/>").addClass("defaults-btn btn btn-primary").append(settings.oLanguage.sTableSettingsDefaults));
		el.append($("<button/>").addClass("freeze-btn btn btn-primary")
			.append($("<span/>").addClass("freeze-text").text(settings.oLanguage.sTableSettingsFreeze))
			.append($("<span/>").addClass("unfreeze-text").text(settings.oLanguage.sTableSettingsUnfreeze)));
		twoSidedSelect.append(el);
		dialog.append(twoSidedSelect);

		var inputsContainer = $("<div/>");
		var showFiltersCheckbox = $("<div/>").addClass("left");
		showFiltersCheckbox.append($("<input/>").attr("type", "checkbox").addClass("filter-cb").attr("id", "filter-cb" + self.id));
		showFiltersCheckbox.append($("<label/>").attr("for", "filter-cb" + self.id).text(settings.oLanguage.sTableSettingsFilters));
		inputsContainer.append(showFiltersCheckbox);

		el = $("<div/>").addClass("left");
		el.append($("<select/>").addClass("per-page").attr("id", self.id + "per-page"));
		el.append($("<label/>").text(settings.oLanguage.sTableSettingsPerPage));
		inputsContainer.append(el);
		dialog.append(inputsContainer);

		var buttonsContainer = $("<div/>").addClass("centered-button-container clear");
		buttonsContainer.append($("<button/>").addClass("btn btn-cancel").append(settings.oLanguage.sTableSettingsCancel));
		buttonsContainer.append($("<button/>").addClass("btn btn-primary btn-save default-btn").append(settings.oLanguage.sTableSettingsSave));
		dialog.append(buttonsContainer);
		$("body").append(dialog);

		$("#" + self.id + "per-page").bmultiselect({buttonWidth: 150, maxHeight: 400, enableFiltering: false, enableCaseInsensitiveFiltering: false});

		if ($("#tick_img_filter-cb" + self.id).length === 0) {
			$("#filter-cb" + self.id, dialog).imageTick({
				tick_image_path   : "../images/checkbox2.png",
				no_tick_image_path: "../images/no_checkbox2.png",
				image_tick_class  : "checkbox"
			});
		}

		return dialog;
	}

	$.fn.dataTable.Api.register('tableSettings()', function () {
		return this;
	});

	$.fn.dataTable.Api.register('tableSettings().getLoadTime()', function () {
		var result;
		this.iterator('table', function (ctx) {
			if (ctx._TableSettings) {
				result = ctx._TableSettings.s.loadTime;
			}
		});

		return result;
	});

	$.fn.dataTable.Api.register('tableSettings().open()', function () {
		return this.iterator('table', function (ctx) {
			if (ctx._TableSettings) {
				ctx._TableSettings.open();
			}
		});
	});

	$.fn.dataTable.Api.register('tableSettings().apply()', function () {
		return this.iterator('table', function (ctx) {
			if (ctx._TableSettings) {
				ctx._TableSettings.apply();
			}
		});
	});

	$.fn.dataTable.Api.register('tableSettings().save()', function (fromUi) {
		return this.iterator('table', function (ctx) {
			if (ctx._TableSettings) {
				ctx._TableSettings.save(fromUi);
			}
		});
	});

	$.fn.dataTable.TableSettings = TableSettings;
	$.fn.DataTable.TableSettings = TableSettings;
});