require.config({
	paths: {
		"datatables"  : "plugins/datatables/3rdParty/datatables",
		"fixedColumns": "plugins/datatables/3rdParty/dataTables.fixedColumns",
		"colResize"   : "plugins/datatables/3rdParty/dataTables.colResize",
		"select"      : "plugins/datatables/3rdParty/dataTables.select",
		"colReorder"      : "plugins/datatables/3rdParty/dataTables.colReorder",
		"scroller"      : "plugins/datatables/3rdParty/dataTables.scroller",


		//our plugins
		"tableSettingsDdMenu": "plugins/datatables/tableSettingsDdMenu",
		"columnFilters"      : "plugins/datatables/columnFilters",
		"dtHelperSelect"     : "plugins/datatables/dtHelperSelect",
		"dtHelperContextMenu"     : "plugins/datatables/dtHelperContextMenu",
		"expandable"     : "plugins/datatables/dtHelperExpandable",
		"fakeRows": "plugins/datatables/dtHelperFakeRows",
		"tableSettings": "plugins/datatables/dtHelperTableSettings",
		"collapsible": "plugins/datatables/dtHelperCollapsible",
		"editable": "plugins/datatables/dtHelperEditable",
		"dtHelperApi" : "plugins/datatables/dtHelperApi"
	}
});

define([
	"jquery",
	"plugins/datatables/dtHelperConstants",
	
	"datatables",
	"fixedColumns",
	"colResize",
	"select",
	"scroller",

	/*our plugins*/
	"tableSettingsDdMenu",
	"columnFilters",
	"dtHelperSelect",
	"dtHelperContextMenu",
	"expandable",
	"fakeRows",
	"tableSettings",
	"collapsible",
	"editable",
	"dtHelperApi"
], function ($, constants) {

	var oLanguage = {
		"oPaginate"                    : {
			"sFirst"   : "",
			"sPrevious": "",
			"sNext"    : "",
			"sLast"    : ""
		},
		"sProcessing"                  : "<div class='processing_dialog'>" + lTableStrings.COMMON_TABLE_PROCESSING + "</div>",
		"sLengthMenu"                  : lTableStrings.COMMON_TABLE_ITEMSPERPAGE,
		"sEmptyTable"                  : lTableStrings.COMMON_TABLE_EMPTYTABLE,
		"sZeroRecords"                 : lTableStrings.COMMON_TABLE_EMPTYRESULT,
		"sInfo"                        : lTableStrings.COMMON_TABLE_INFO,
		"sInfoEmpty"                   : lTableStrings.COMMON_TABLE_INFOEMPTY,
		"sInfoFiltered"                : lTableStrings.COMMON_TABLE_INFOFILTER,
		"sLoadingRecords"              : lTableStrings.COMMON_TABLE_LOADING,
		"sTableSettingsUp"             : lTableStrings.COMMON_TABLE_SETTINGS_UP,
		"sTableSettingsDown"           : lTableStrings.COMMON_TABLE_SETTINGS_DOWN,
		"sTableSettingsDefaults"       : lTableStrings.COMMON_TABLE_SETTINGS_DEFAULTS,
		"sTableSettingsSave"           : lTableStrings.COMMON_TABLE_SETTINGS_SAVE,
		"sTableSettingsCancel"         : lTableStrings.COMMON_TABLE_SETTINGS_CANCEL,
		"sTableSettingsSuccess"        : lTableStrings.COMMON_TABLE_SETTINGS_SUCCESS,
		"sTableSettingsFreeze"         : lTableStrings.COMMON_TABLE_SETTINGS_FREEZE,
		"sTableSettingsUnfreeze"       : lTableStrings.COMMON_TABLE_SETTINGS_UNFREEZE,
		"sTableSettingsPerPage"        : lTableStrings.COMMON_TABLE_SETTINGS_PERPAGE,
		"sTableSettingsFilters"        : lTableStrings.COMMON_TABLE_SETTINGS_FILTERS,
		"sTableSettingsTitle"          : lTableStrings.COMMON_TABLE_SETTINGS_TITLE,
		"sTableSettingsColSizeTitle"   : lTableStrings.COMMON_TABLE_SETTINGS_COL_SIZE_TITLE,
		"sTableSettingsColSizeLabel"   : lTableStrings.COMMON_TABLE_SETTINGS_COL_SIZE_LABEL,
		"sTableSettingsContextSetSize" : lTableStrings.COMMON_TABLE_SETTINGS_CONTEXT_SET_SIZE,
		"sTableSettingsContextSaveSize": lTableStrings.COMMON_TABLE_SETTINGS_CONTEXT_SAVE_SIZE,
		"sTableSettingsColSizeLimits"  : lTableStrings.COMMON_TABLE_SETTINGS_COL_SIZE_LIMITS
	};

	var timeStart;
	var timeAjaxEnd;
	var timeEnd;

	var defaults = $.extend({}, constants.DT_OPTIONS, constants.DT_HELPER_OPTIONS);

	function DtHelper(options) {
		var dt = this;
		var initSettings = $.extend(true, {}, $.extend({}, defaults, options), DtHelper.functions);
		initSettings.aoExpandSettings = $.extend({}, constants.DT_HELPER_OPTIONS.aoExpandSettings, options.aoExpandSettings);
		initSettings.editable = $.extend({}, constants.DT_HELPER_OPTIONS.editable, options.editable);

		if ($.isArray(initSettings.data)) {
			initSettings.serverSide = false;
			delete initSettings.fnServerData;
		}

		dt._initSettings = initSettings;
		_applyDataTable(dt, initSettings);
		return dt;
	}

	DtHelper.functions = {
		fnServerData: function (sSource, sortData, fnCallback) {
			var dt = this;
			var settings = dt.api().settings()[0];
			var emptyStaticData = {"aaData": [], "iTotalDisplayRecords": 0, "iTotalRecords": 0}; //NB! don't move it to global scope

			var dataAcquiredCallback = _getServerDataAcquiredCallback(dt, sSource, sortData, fnCallback);

			if (!settings._ColumnFilters || !settings._ColumnFilters.manualFilter) {
				sortData.forEach(function (data) {
					if (data.name === "sSearch"){
						data.value = JSON.stringify(dt.api().columnFilters().defaultQuery());
					}
				});
			}

			var skipCall = false;
			if ($.isFunction(dt.properties.xfnBeforeServerCall)) {
				var param = dt.properties.xfnBeforeServerCall(sSource, sortData, dataAcquiredCallback);

				if ($.isArray(param)) {
					sortData = sortData.concat(param);
				} else if (param === false) {
					skipCall = true;
					var aaData = dt.api().data();
					var page = dt.api().page.info();

					var curData = {
						"aaData": aaData,
						"iTotalDisplayRecords": page.recordsDisplay,
						"iTotalRecords": page.recordsTotal
					};

					if (aaData.length === 0) {
						curData = emptyStaticData;
					}

					dataAcquiredCallback(curData);
				}
			}

			if (dt.properties.highlight) {
				sortData.push({name: "headerSearch", value: dt.properties.highlight});
			}

			if (!skipCall) {
				timeStart = Date.now();
				$.ajax({
					dataType: "json",
					type    : "POST",
					url     : sSource,
					data    : sortData,
					success : dataAcquiredCallback,
					global  : false,//prevent global error handler
					timeout : dt.properties.ajaxTimeout,// optional] if you want to handle timeouts (which you should)
					error   : function (xmlHttpRequest, textStatus, errorThrown) {
						console.error("Ajax error: url: '" + sSource + "', table: '" + settings.sInstance + "'");
						var emptyStaticData = {"aaData": [], "iTotalDisplayRecords": 0, "iTotalRecords": 0};
						fnCallback(emptyStaticData);
					}
				});
			}
		},
		createdRow  : function (nRow, aData, rowIndex) {
			var oInstance = this;
			var settings = oInstance.api().settings()[0];

			_setUpCellTitles(nRow);

			if ($.isFunction(oInstance.properties.xfnRowCallback)) {
				nRow = oInstance.properties.xfnRowCallback(nRow, aData, rowIndex);
			}
		},
		drawCallback: function (settings) {
			var dt = settings.oInstance;
			var properties = dt.properties;

            if (typeof settings._oFixedColumns !== 'undefined') {
                var leftTableWidth = settings._oFixedColumns.s.iLeftWidth + 10; // calculate left table width + offset for 10 pxls
                $('.dataTables_empty', this).css('padding-left', leftTableWidth + "px");
            }

			if ($.isFunction(properties.xfnDrawCallback)) {
				properties.xfnDrawCallback(settings);
			}
		},
		initComplete: function (settings, json) {
			var dt = settings.oInstance;
			var properties = dt.properties;

			$(window).unbind('resize.DT-'+settings.sInstance);//prevent adjusting columns on any resize event. it made the table width 0 if table is hidden in the browser window

			var perPage = $(settings.nTableWrapper).find("select[name$='_length']");
			perPage.multiselect({
				multiple: false,
				header: false,
				selectedList: 1,
				height: "100%",
				useParentWidth: false,
				classes: constants.TABLE_LENGTH_MENU_SEL
			});

			new $.fn.dataTable.DtHelperApi(settings);

			if (properties.bFilter) {
				new $.fn.dataTable.ColumnFilters(settings);
			}

			var leftColumns;
			if (properties.tableSettings) {
				new $.fn.dataTable.TableSettings(settings);
				leftColumns = properties.tableSettings.currentTableSettings.freezeColumns + (dt.checkboxesUsed ? 1 : 0);
			} else {
				leftColumns = (dt.checkboxesUsed ? 1 : 0);
			}

			new $.fn.dataTable.FixedColumns(settings, {
				leftColumns: leftColumns,
				drawCallback: function (left) {
					dt.api().columnFilters().refreshFixedColumns();
					dt.api().editable().refreshFixedColumns();
				}
			});
			$(settings.nTable).unbind("select.dt.DTFC deselect.dt.DTFC");//for this purpose used custom fc update function in dtHelperSelect.js for exact row selected

			new $.fn.dataTable.DtHelperSelect(settings);

			if (properties.bExpandable) {
				new $.fn.dataTable.Expandable(settings);
			}

			new $.fn.dataTable.FakeRows(settings);
			new $.fn.dataTable.ContextMenu(settings);

			if (properties.collapsible) {
				new $.fn.dataTable.Collapsible(settings);
			}

			new $.fn.dataTable.Editable(settings);

			//empty table to be displayed without headers. ex: see /backoffice2/secure/upload.sf page
			if (settings.aoColumns.length === 0) {
				$(settings.nTable).width("100%");
			}

			if ($.isFunction(properties.xfnInitComplete)){
				properties.xfnInitComplete(settings, json);
			}
		}
	};

    function _setUpCellTitles(row) {
        if(!(row instanceof $)){
            row = $(row);
        }
        var isChild = row.hasClass(constants.CHILD_ROW);
        var $td;
        $("td", row).each(function (i, td) {
            $td = $(td);
            _setUpTitleForCell($td, isChild);
        });
    }

    function _setUpTitleForCell($td, isChild){

	    if ($td.hasClass(constants.DT_CHECKBOX_COLUMN) || $td.hasClass(constants.DT_RADIO_COLUMN)) {
		    return;
	    }

        if ($td.html() === "" && !isChild) {
            $td.html("-");
        } else if (!$td.hasClass(constants.DT_CHECKBOX_COLUMN) && !$td.hasClass(constants.DT_RADIO_COLUMN)) {
            if(_columnTextExists($td)) {
                $td.attr('title', $td.text());
            }
        } else {
            $td.html(constants.SPACE);
        }
    }

    function _columnTextExists($td) {
        var text = $td.text();
        return typeof text !== 'undefined' && text !== 'false' && text !== 'true' && text !== '';
    }

	function _applyDataTable(dt, settings) {
		var settingsContainer = _getTableSettingsObject(settings);

		dt.properties = settingsContainer.dtHelper;
		dt.datatable = settingsContainer.datatable;

		var tableSettings = dt.properties.tableSettings;

		if (tableSettings) {
			dt.datatable.pageLength = tableSettings.currentTableSettings.perPage;
			dt.properties.filtersOpen = tableSettings.currentTableSettings.filtersOpen === "Y";
		}

		dt.datatable.colResize.resizeCallback = function (column) {
			var skipFcUpdate = true;//don't need update fc each time column resized - optimization
			dt.api().columnFilters().update(skipFcUpdate);
		};

		dt.datatable.select = {
			className: "selected",
			info     : false
		};

		if (dt.properties.radio || dt.properties.rowSelection) {
			dt.datatable.select.style = "single";
		} else if (dt.properties.selectable) {
			dt.datatable.select.style = "multi";
		}

		_setUpCheckboxColumn(dt);

		_initTableSettingsDdMenu(dt);

		dt.datatable.aaSorting = _getActualSortArray(dt);


		var errorColumns = [];
		dt.datatable.aoColumns.forEach(function (oColumn) {
			if (!oColumn.sWidth && !oColumn.width) {
				errorColumns.push(oColumn.mDataProp);
			}
		});

		// dt.datatable.aoColumns = dt.datatable.aoColumns
		// 	.concat(dt.datatable.aoColumns)
		// 	.concat(dt.datatable.aoColumns)
		// 	.concat(dt.datatable.aoColumns)
		// 	.concat(dt.datatable.aoColumns)
		// 	.concat(dt.datatable.aoColumns)
		// 	.concat(dt.datatable.aoColumns);

		// dt.datatable.aoColumns.splice(50, 6);

		// console.log("columns length: ", dt.datatable.aoColumns.length);

		if (errorColumns.length) {
			console.error("Table '" + dt.selector + "' has no default width defined for columns: \n" + errorColumns.join("<br>"));
		}

		dt.datatable.oLanguage = oLanguage;
		dt.datatable.aLengthMenu = [[10, 25, 50, 100, propertyMaxTableRows], [10, 25, 50, 100, "Max"]];
		dt.properties.jsDateFormat = jsDateFormat;
		dt.dataTable(dt.datatable);
	}

	function _setUpCheckboxColumn(dt) {

		if (!dt.properties.radio && !dt.properties.selectable) {
			return;
		}

		dt.properties.fixedColumns += 1;
		dt.checkboxesUsed = true;
		dt.datatable.colResize.exclude = [0];

		var checkBoxColumnDefinition = {
			sClass      : constants.DT_CHECKBOX_COLUMN,
			bUseRendered: false,
			bSortable   : false,
			mDataProp   : null,
			type        : "btn",
			width       : constants.CHECKBOX_CELL_WIDTH,
			title       : "<div class='" + constants.SELECT_ALL_CHECKBOX + "'></div>",
			render      : function (data, type, full, meta) {
				return constants.SPACE;//needed for fixing draw error alert
			}
		};

		if (dt.properties.radio) {
			checkBoxColumnDefinition.sClass = constants.DT_RADIO_COLUMN;
			checkBoxColumnDefinition.title = "";
		}

		dt.datatable.aoColumns = [checkBoxColumnDefinition].concat(dt.datatable.aoColumns);
	}

	function _initTableSettingsDdMenu(dt) {
		var oInit = dt.datatable;
		var settingsButtonSelector = dt.properties.tableSettingsButton;

		var defaultOptionsForMenu = [];

		if (dt.properties.tableSettings) {
			var tableSettingsOpen = {
				name          : 'tableSettings',
				localizedText : lTableStrings.COMMON_TABLE_SETTINGS,
				hasToggleState: false,
				defaultState  : null,
				action        : function () {
					dt.api().tableSettings().open();
				},
				sClass        : null
			};
			defaultOptionsForMenu.push(tableSettingsOpen);
		}

		if (dt.properties.bFilter) {
			var filterToggler = {
				name          : "filtersToggle",
				localizedText : lTableStrings.COMMON_TABLE_SETTINGS_SHOW_FILTER_VIEWER,
				hasToggleState: true,
				defaultState  : dt.properties.filtersOpen ? "active" : "inactive",
				action        : function (param) {
					if (param === true) {
						dt.api().columnFilters().show();
					} else {
						dt.api().columnFilters().hide();
					}

				},
				sClass        : null
			};

			defaultOptionsForMenu.push(filterToggler);
		}

		if (dt.properties.tableSettings) {
			var saveSettings = {
				name          : 'saveSettings',
				localizedText : lTableStrings.COMMON_TABLE_SETTINGS_SAVE_SETTINGS,
				hasToggleState: false,
				defaultState  : null,
				action        : function () {
					dt.api().tableSettings().save(true);
				},
				sClass        : null
			};

			defaultOptionsForMenu.push(saveSettings);
		}

		if (dt.properties.tableSettingsDdMenuOptions !== null) {
			defaultOptionsForMenu = defaultOptionsForMenu.concat(dt.properties.tableSettingsDdMenuOptions);//adding custom options per table
		}


		if (!$(settingsButtonSelector).tableSettingsMenu("isInit")) {
			$(settingsButtonSelector).tableSettingsMenu(defaultOptionsForMenu);
		}
	}

	/**
	 * the reason is to know which params are needed for internal dtHelper use and make them separate from datatables options object.
	 * it makes sense if try to debug and get know what are our options for custom functionality and what are not
	 *
	 * @returns plain object containing:
	 * {
     *  dtHelper: {...},
     *  datatable: {...}
     * }
	 * @param options
	 */
	function _getTableSettingsObject(options) {
		var currentTableSettings = _getTableSettingsFromPlainObject(options, constants.DT_OPTIONS);
		var currentDtHelperSettings = _getTableSettingsFromPlainObject(options, constants.DT_HELPER_OPTIONS);

		return {
			dtHelper : currentDtHelperSettings,
			datatable: currentTableSettings
		};
	}

	/**
	 *
	 * @param obj
	 * @param defaults - where to watch what keys we should keep in resulting object
	 * @returns {...}
	 * @private
	 */
	function _getTableSettingsFromPlainObject(obj, defaults) {
		var result = {};

		for (var key in obj) {
			if (!obj.hasOwnProperty(key)) {
				continue;
			}

			if (typeof defaults[key] !== "undefined") {//important to check by type to get know if property is defined
				result[key] = obj[key];
			}
		}

		return result;
	}

	function _getActualSortArray(dt) {
		var aaSorting = dt.datatable.aaSorting;
		var actualSorting = [];
		aaSorting.forEach(function (sortData) {
			var colIndex = sortData[0] + (dt.checkboxesUsed ? 1 : 0);
			var destination = sortData[1];
			actualSorting.push([colIndex, destination]);
		});

		return actualSorting;
	}

	function _getServerDataAcquiredCallback(dt, sSource, sortData, fnCallback){
		var settings = dt.api().settings()[0];
		return function (data) {
			if ($.isFunction(dt.properties.xfnAfterServerCallDataMod)) {
				data = dt.properties.xfnAfterServerCallDataMod(data);
			}

			timeAjaxEnd = Date.now();
			fnCallback(data);

			if ($.isFunction(dt.properties.xfnAfterServerCall)) {
				dt.properties.xfnAfterServerCall(data);
			}

			if (dt.properties.filterErrors && data.errors) {
				dt.api().columnFilters().errors(data.errors);
			}
			timeEnd = Date.now();

			var timeTotal = (timeEnd - timeStart);
			var ajaxTime = (timeAjaxEnd - timeStart);
			var uiTime = timeTotal - ajaxTime;


			var loadingTimeObject = {
				total: timeTotal,
				ajax: ajaxTime,
				uiTotal: uiTime
			};

			loadingTimeObject = dt.api().dtHelper().getFormattedTime(loadingTimeObject);
			$.extend(loadingTimeObject, dt.api().columnFilters().getLoadTime());
			$.extend(loadingTimeObject, dt.api().tableSettings().getLoadTime());
			$.extend(loadingTimeObject, dt.api().fakeRows().getLoadTime());
			$.extend(loadingTimeObject, dt.api().expandable().getLoadTime());
			$.extend(loadingTimeObject, dt.api().editable().getLoadTime());
			$.extend(loadingTimeObject, dt.api().contextMenu().getLoadTime());
			$.extend(loadingTimeObject, dt.api().collapsible().getLoadTime());
			$.extend(loadingTimeObject, dt.api().dtHelperSelect().getLoadTime());

			console.log("table '" + settings.sInstance + "' load time: ", loadingTimeObject);
		};
	}

	$.fn.dtHelper = DtHelper;
});