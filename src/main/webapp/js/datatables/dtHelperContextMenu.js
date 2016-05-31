define(["jquery",
    "plugins/datatables/dtHelperConstants",
	"plugins/hotkey.framework",
	"datatables",
	"includes/util",
    "plugins/3rdParty/jquery.qtip",
	"plugins/3rdParty/bootstrap-contextmenu"], function ($, constants, hotkeys) {

	var timeStart;
	var timeEnd;

	var template = {
		menu   : '<div class="context-menu"><ul role="menu" class="epl-menu">{0}</ul></div>',
		element: '<li action-name="{0}" class="context-menu-option"><p tabindex="-1">{1}</p></li>'
	};

	var optionStructure = {
		text  : "localized name",
		name  : "option-name",
		action: function (row, aData) {
			alertModal("Test action worked");
		}
	};

    var headerActions = [
        {
            text: lStringsCommon.TABLE_SETTINGS_CONTEXT_SET_SIZE,
            name: "set-size",
            action: function (aPos, currentData, dt) {
                showSetSizeDialog(dt);
            }
        },
        {
            text: lStringsCommon.TABLE_SETTINGS_CONTEXT_SAVE_SIZE,
            name: "save-size",
            action: function (aPos, currentData, dt) {
                var settings = dt.api().settings()[0];
                var columnIndex = $selectedHeader.attr('data-column-index');
                var column = settings.aoColumns[columnIndex];

                if (column) {
                    var width = column.width;
                    var tableName = dt.properties.tableSettings.tableName;

                    $.ajax({
                        "url": 'saveColumnWidth.sf',
                        "dataType": 'text',
                        "data": {
                            tableName: tableName,
                            columnName: column.name,
                            width: width
                        },
                        "type": 'POST',
                        "timeout": 30000,
                        "success": function (data) {
                            notify(lTableStrings .COMMON_TABLE_SETTINGS_SUCCESS);
                        },
                        "error": handleAjaxError
                    });
                }
			}
        }
    ];

    var $sizeDialog;
    var $selectedHeader;
    var $sizeTemplate = getSizeTemplate();

	function ContextMenu(settings) {
		var self = this;
        var dt = settings.oInstance;
		var properties = settings.oInstance.properties;

		self.s = {
			loadTime: {
				contextMenu: "not measured"
			}
		};

		self.callAction = function (actionName) {
			self.options.forEach(function (option) {
				if (option.name === actionName && $.isFunction(option.action)) {
					var aData = settings.oInstance.api().row(self.currentRow).data();
					var rowIndex = settings.oInstance.api().row(self.currentRow[0]).index();
					option.action(rowIndex, aData, settings.oInstance);
				}
			});
		};

		timeStart = Date.now();
		_applyContextMenu.apply(self, [settings]);
		timeEnd = Date.now();

		var timeTotal = timeEnd - timeStart;
		self.s.loadTime = dt.getFormattedTime({contextMenu: timeTotal});

		settings._ContextMenu = self;
	}

	function _createMenu(optionsArray) {
		var elements = '';
		$.each(optionsArray, function () {
			elements += String.format(template.element, this.name, this.text);
		});
		var $menu = $(String.format(template.menu, elements));
		$menu.appendTo(".content_wrapper");
		return $menu;
	}

	function _applyContextMenu(settings) {
		var self = this;
		var properties = settings.oInstance.properties;

		var actions = properties.contextMenu ? properties.contextMenu.actions : false; //array

		if (actions) {
			self.options = actions.concat(headerActions);
			self.contextMenu = $(_createMenu(actions));

		} else {
			self.options = headerActions;
		}

        self.headerContextMenu = $(_createMenu(headerActions));
		self.currentRow = null;

		if (actions) {
			$(settings.nTable).contextmenu({
				target: self.contextMenu,
				before: function (e, context) {
					var $cell = $(e.target).closest("td");
					var $row = $cell.closest("tr");

					if ($row.hasClass(constants.FAKE_ROW)) {
						return false;
					}

					self.currentRow = $row;

					if (properties.contextMenu.selectSecondary) {
						settings.oInstance.api().dtHelperSelect().selectSecondary($row);
					} else {
						settings.oInstance.api().dtHelperSelect().selectPrimary($row);
					}

					return true;
				},
				onItem: onItemClick
			});
		}

		$(settings.nTHead).contextmenu({
            target: self.headerContextMenu,
            before: function(e,context) {
                var $cell = $(e.target).closest("th");
                $selectedHeader = $cell;
                var $row = $cell.closest("tr");

                if ($row.hasClass('filters-row')) {
                    return false;
                }

                self.currentRow = $row;
                return true;
            },
            onItem: onItemClick
        });

        function onItemClick(context, e) {
            var $li = $(e.target).closest('li');
            var actionName = $li.attr("action-name");
            self.callAction(actionName);
        }
	}

    function getSizeTemplate() {
        var html =
            '<div id="assign-dialog" class="modal_dialog text-center">' +
                '<div class="default-field-container" >' +
                '<label for="set_priority" class="field-label required" style="width:auto;">'+lStringsCommon.COMMON_SIZE+': </label>' +
                '<input type="text" class="filter-range" id="dialog-set-size" name="dialog-set-size" />' +
                '</div>' +

                '<div class="centered-button-container">' +
                '<button id="btn-set-size-cancel" class="btn" type="button">'+lStringsCommon.COMMON_CANCEL+'</button>' +
                '<button id="btn-set-size-save" class="btn btn-primary default-btn" type="button">'+lStringsCommon.COMMON_OK+'</button>' +
                '</div>' +
            '</div>';

        return $(html);
    }

    function showSetSizeDialog(dt) {
        var settings = dt.api().settings()[0];
        var setSizeField = $("#dialog-set-size" ,$sizeTemplate);

	    if (!$sizeDialog) {
            $sizeDialog = $($sizeTemplate).dialog({
			    title    : lStringsCommon.TABLE_SETTINGS_CONTEXT_SET_SIZE + ":",
			    width    : "320",
			    modal    : true,
			    resizable: false,
                create: function (event, ui){
                    $('#btn-set-size-cancel', this).click(function() {
                        $sizeTemplate.dialog('close');
                    });

                    $('#btn-set-size-save', this).click(function() {
                        var width = $('#dialog-set-size', $sizeTemplate).val();
                        var columnIndex = $selectedHeader.attr('data-column-index');
                        var aoColumns = settings.aoColumns;

                        if (validateWidth(width)) {
                            addErrorStyle(setSizeField, String.format(lTableStrings.COMMON_TABLE_SETTINGS_COL_SIZE_LIMITS, constants.MIN_COL_WITH, constants.MAX_COL_WIDTH) );
                            return false;
                        }

                        width = parseInt(width);
                        aoColumns[columnIndex].sWidth = width;
                        aoColumns[columnIndex].width = width;
                        aoColumns[columnIndex].sWidthOrig = width;

	                    dt.api().columns.adjust();
                        settings.oApi.fnColResize(settings, columnIndex);
	                    dt.api().columnFilters().update();
                        $sizeTemplate.dialog('close');
                    });
                },
			    open     : function (event, ui) {
                    hotkeys.changeContexts([]);
                    $('#dialog-set-size', $sizeTemplate).val($selectedHeader.width());
			    },
			    close    : function (event, ui) {
                    hotkeys.revertContexts();
                    removeErrorStyle(setSizeField);
			    }
		    });

	    } else {
            $sizeDialog.dialog("open");
	    }
    }

    function validateWidth(width) {
        return /[a-zA-Z.,]/.test(width) || width.length === 0
            || parseInt(width) < constants.MIN_COL_WITH || parseInt(width) > constants.MAX_COL_WIDTH || isNaN(width);
    }

	$.fn.dataTable.Api.register('contextMenu()', function () {
		return this;
	});


	$.fn.dataTable.Api.register('contextMenu().getLoadTime()', function () {
		var result;
		this.iterator('table', function (ctx) {
			if (ctx._ContextMenu) {
				result = ctx._ContextMenu.s.loadTime;
			}
		});

		return result;
	});

	$.fn.dataTable.ContextMenu = ContextMenu;
	$.fn.DataTable.ContextMenu = ContextMenu;
});