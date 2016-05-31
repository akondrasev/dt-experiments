define(["jquery"], function ($) {
	return {
		MIN_COL_WITH                       : 20,
		MAX_COL_WIDTH                      : 2000,
		MIN_COL_WIDTH_FOR_SELECT           : 30,
		CHECKBOX_CELL_WIDTH                : 50,
		TABLE_LENGTH_MENU_SEL              : "table-length-menu",
		SELECTED                           : "selected",// checkobx state
		SELECTED_SECONDARY                 : "selected-secondary",
		EXPANDABLE                         : "expand",
		ODD                                : "odd",
		EVEN                               : "even",
		ROW_SINGLE_SELECT                  : "row-single-select",//dark epl-blue row
		DT_CHECKBOX_COLUMN                 : "dt-checkbox-column",//css renders checkbox img
		DT_RADIO_COLUMN                    : "dt-radio-column",//renders radio img
		FAKE_ROW                           : "fake-row",//click handlers should not work with such row
		NO_CB                              : "hidden-checkbox",//hide checkbox in td
		SELECT_ALL_CHECKBOX                : "select-all-checkbox",
		ARRAY_NAME_SELECTED                : "selected",
		ARRAY_NAME_SELECTED_SECONDARY      : "selectedSecondary",
		PROPERTY_NAME_SELECTED_SINGLE_ROW  : "selectedRow",
		ARRAY_NAME_SELECTION_KEYS          : "selectionKeys",
		ARRAY_NAME_SELECTION_KEYS_SECONDARY: "secondarySelectionKeys",
		SECONDARY_CHECKBOX_TD              : "td.secondary-checkbox-col",
		CHILD_ROW                          : "child-row",
		SPACE                              : "&nbsp;",
		FIXED_SIZE                         : "fixed-size",
		SCROLLY_FOR_10_ROWS                : 260,
		COLLAPSER_HTML                     : "<div class='collapser'><span class='slider_visible'></span></div>",
		COLLAPSER_HEIGHT                   : 6,
		CELL_EDITABLE                      : "editable",
		CELL_EDITABLE_CLONED               : "editable-cloned",
		EDITABLE_SELECT                    : "editable-select",
		
		DT_OPTIONS       : {
			//dataTable properties
			sAjaxSource   : null,
			data: null,
			pagingType    : "full_numbers",
			aaSorting     : [[1, 'desc']],
			processing    : true,
			serverSide    : true,
			serverMethod  : "POST",
			info          : true,
			paginate      : true,
			sort          : true,
			scrollX       : true,
			scrollY       : true,
			select        : false,
			// scroller      : { works as modern 'paging' feature
			// 	serverWait : 0,
			// 	displayBuffer: 30
			// },
			// deferRender   : true, useless with ajax data source
			scrollCollapse: false,
			sDom          : 'Z<"small_separator">tr<"small_separator"><"table-footer"ipl>',
			colResize     : {
				tableWidthFixed: false,
				exclude        : [],
				handleWidth    : 6
			},
			bAutoWidth    : true,
			aLengthMenu   : null,
			aoColumns     : [],
			oLanguage     : null,
			
			/*callbacks*/
			createdRow      : null,
			initComplete    : null,
			preDrawCallback : null,
			drawCallback    : null,
			fnServerData    : null,
			fnHeaderCallback: null
		},
		DT_HELPER_OPTIONS: {
			bFilter     : true,
			filterFilter: false,//deprecated
			onFilter    : null,
			filterErrors: false,
			filterToggle: null,
			filtersOpen : false,
			
			recordsPerPage: 10,
			rowSelection  : false,
			selectable    : true,
			radio         : false,
			
			selectionKeys         : ['id'],
			secondarySelectionKeys: ['id'],
			
			jsDateFormat: null,
			highlight   : null,
			ajaxTimeout : 15000,
			
			editable: {
				callback           : null, //function (value, cell)
				allowRowsGeneration: false
			},
			
			tableSettings             : null,
			tableSettingsButton       : null,
			tableSettingsDdMenuOptions: null,
			
			//expandable rows
			bExpandable     : false, //enable/disable expandable rows
			aoExpandSettings: {
				sExpandSelector    : ".expand-collapse-data", //jquery selector for field, that should expand/collapse the child rows
				sExpandProp        : "", //name of child row data list
				sExpandPicIcon     : "<i class='fa fa-plus-square'></i>",
				sCollapsePicIcon   : "<i class='fa fa-minus-square'></i>",
				duplicateParent    : false,
				selectionKeys      : null,
				selectAllExpandable: false,
				bOneColumn         : false,
				sExpandColumn      : null, //alternative to setting the column class manually, more convenient for dynamic grouping
				onExpandCallback   : null
			},
			
			contextMenu: false,
			collapsible: false,
			
			/*callbacks*/
			xfnDrawCallback          : null,
			xfnInitComplete          : null,
			xfnRowCallback           : null,
			xfnBeforeServerCall      : null,
			xfnAfterServerCall       : null,
			xfnAfterServerCallDataMod: null,
			xfnRowSelectionCallback  : null
		}
	};
});