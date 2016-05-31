/*
 * Saved search plugin
 * 
 * Can be applied to a dtHelper object
 */

define(["jquery", 
		 "includes/dialog",
		 "includes/util",
		 "plugins/3rdParty/jquery-ui-1.10.4.custom.min",
		 "plugins/3rdParty/bootstrap-multiselect"
		 ], function($) {

	$.savedSearch = function(dt, options) {
		
		var elem = dt;
		elem.ss = {};
		elem.ss.currentSearch = 0;
		
		var defaults = {
			//Required options
			"select" : null,
			"localization" : null,
			"context" : null,
			"savedSearchList" : null,
			
			//Optional
			"headerSearch" : null,
			
			//configurable
			"placeholders" : null,
			"placeholderStart" : "|*",
			"placeholderEnd" : "*|",
			
			"deniedPattern" : "[\\|\\\\\\?\\*\\<\\\"\\:\\>\\+\\[\\]\\/\\'\\(\\)]",
			"selectWidth" : 220,
			"searchNameMaxLength" : 20
        };
        elem.ss.properties = $.extend(defaults, options);
		
		function init() {

			$("option", elem.ss.properties.select).first().val('-1');
			
			elem.ss.select = elem.ss.properties.select.bmultiselect({
				buttonWidth:elem.ss.properties.selectWidth,
				onChange: selectChanged,
				maxHeight: 500,
				numberDisplayed: 1
				});
		}

		function getSSOptions() {
			return ($("<optgroup label='"+elem.ss.properties.localization.INVENTORY_SEARCH_ACTIONS+"'>" +
					"<option value='save'>"+ elem.ss.properties.localization.INVENTORY_BTN_SAVESEARCH +"</option>" +
					"<option value='rename'>"+ elem.ss.properties.localization.INVENTORY_BTN_RENAMESEARCH +"</option>" +
                    "<option value='delete'>"+ elem.ss.properties.localization.INVENTORY_BTN_DELETESEARCH +"</option>" +
                    "<option value='default'>"+ elem.ss.properties.localization.INVENTORY_BTN_DEFAULTSEARCH +"</option>" +
					"</optgroup>"));
		}	

		function checkSearchEmpty() {
			if(elem.fnSettings().oPreviousSearch.sSearch != "") {
				var src = $.parseJSON(elem.fnSettings().oPreviousSearch.sSearch);
				if(src != null) {	
					for(i in src) {
						if($.trim(src[i]) != "") {
							return false;
						}
					}
				}
			}
			if(elem.ss.properties.headerSearch != null && elem.ss.properties.headerSearch.val() != "") {
				return false;
			}
				
			return true;
		}


		function selectChanged() {
			
			if(elem.ss.select === undefined ) {
				return;
			}
			
			var sel = elem.ss.select.val();
			if(sel == null || sel == '' || sel == '-1') {
				elem.ss.currentSearch = 0;
                activateDefaultSearch();
				return;
			}
			
			//if search value is a number - load search by id
			if(parseInt(sel) == sel) {
				loadSearch(sel, false);
			
			//predefined searches, can't ne renamed or deleted
			} else if(sel.substr(0,1) == "_" && parseInt(sel.substr(1)) == sel.substr(1)) {
				loadSearch(sel.substr(1), true);
				
			//otherwise parse the command
			} else {

				switch(sel) {
				case "save": 
					if(checkSearchEmpty()) {
						alertModal(elem.ss.properties.localization.INVENTORY_SEARCH_SEARCH_IS_EMPTY);
                        activateDefaultSearch();
						return;
					}
					var oldText = "";
					if(elem.ss.currentSearch > 0) {

						elem.ss.select.bmultiselect('select', elem.ss.currentSearch);
						
						oldText = $("option[value='"+elem.ss.currentSearch+"']", elem.ss.select).text();
						
						if (oldText == elem.ss.properties.localization.INVENTORY_LAST_SEARCH){
							oldText = "";
						}
					}
                    var dlg = textboxDialog(elem.ss.properties.localization.INVENTORY_SEARCH_SAVE_DIALOG_TITLE,
                        elem.ss.properties.localization.INVENTORY_SEARCH_SAVE_DIALOG_ENTER_NAME_LABEL,
                        oldText,
                        function(data) {
                            var error = searchNameValidation(data);
                            if(error != null) {
                                var errBox = $(".dialog_error", dlg);
                                if(errBox.length == 0) {
                                    errBox = $("<p class='dialog_error'>").text(error);
                                    errBox.insertAfter($("input", dlg));
                                } else {
                                    errBox.text(error);
                                }

                                return false;
                            }
                            saveSearchOkClick({"oldName" : oldText, "searchName" : data});
                        },
                        actionSSCancel
                    );
					break;
					
				case "rename":
					if(elem.ss.currentSearch == null || elem.ss.currentSearch == 0 || elem.ss.currentSearch == -1) {
						actionSSCancel();
						break;
					}
					if((elem.ss.currentSearch + "").substr(0,1) == "_") {
						alertModal(elem.ss.properties.localization.INVENTORY_SEARCH_CANNOT_RENAME_PREDEFINED_SEARCHES);
						actionSSCancel();
						break;
					}
					
					var oldText = $("option[value='"+elem.ss.currentSearch+"']", elem.ss.select).text();
					
					if(elem.ss.currentSearch == null || elem.ss.currentSearch <=0) {
						alertModal(elem.ss.properties.localization.INVENTORY_SEARCH_NOT_SELECTED);
                        activateDefaultSearch();
					} else if (oldText == elem.ss.properties.localization.INVENTORY_LAST_SEARCH) {
						alertModal(elem.ss.properties.localization.INVENTORY_SEARCH_CANNOT_RENAME_LAST_SEARCH_ALERT);
                        activateDefaultSearch();
					} else {
						
						elem.ss.select.bmultiselect('select', elem.ss.currentSearch);

                        var dlg = textboxDialog(elem.ss.properties.localization.INVENTORY_SEARCH_RENAME_DIALOG_TITLE,
                            elem.ss.properties.localization.INVENTORY_SEARCH_RENAME_DIALOG_NEW_NAME_LABEL,
                            oldText,
                            function(data) {
                                var error = searchNameValidation(data);
                                if(error != null) {
                                    var errBox = $(".dialog_error", dlg);
                                    if(errBox.length == 0) {
                                        errBox = $("<p class='dialog_error'>").text(error);
                                        errBox.insertAfter($("input", dlg));
                                    } else {
                                        errBox.text(error);
                                    }

                                    return false;
                                }
                                renameSearchOkClick({"oldName" : oldText, "searchName" : data});
                            },
                            actionSSCancel
                        );

					}
					
					break;

                    case "delete":
                        if(elem.ss.currentSearch == null || elem.ss.currentSearch == 0 || elem.ss.currentSearch == -1) {
                            actionSSCancel();
                            break;
                        }
                        if((elem.ss.currentSearch + "").substr(0,1) == "_") {
                            alertModal(elem.ss.properties.localization.INVENTORY_SEARCH_CANNOT_DELETE_PREDEFINED_SEARCHES);
                            actionSSCancel();
                            break;
                        }

                        var oldText = $("option[value='"+elem.ss.currentSearch+"']", elem.ss.select).text();

                        if(elem.ss.currentSearch == null || elem.ss.currentSearch <= 0) {
                            alertModal(elem.ss.properties.localization.INVENTORY_SEARCH_NOT_SELECTED);
                            activateDefaultSearch();
                        } else if (oldText == elem.ss.properties.localization.INVENTORY_LAST_SEARCH) {
                            alertModal(elem.ss.properties.localization.INVENTORY_SEARCH_CANNOT_DELETE_LAST_SEARCH_ALERT);
                            activateDefaultSearch();
                        } else {

                            elem.ss.select.bmultiselect('select', elem.ss.currentSearch);

                            titledConfirmationModal(elem.ss.properties.localization.INVENTORY_SEARCH_DELETE_DIALOG_TITLE,
                                String.format(elem.ss.properties.localization.INVENTORY_SEARCH_DELETE_DIALOG_MESSAGE, oldText),
                                deleteSearchOkClick,
                                actionSSCancel
                            );

                        }
                        break;

                    case "default":
                        if(elem.ss.currentSearch == null || elem.ss.currentSearch == 0 || elem.ss.currentSearch == -1) {
                            actionSSCancel();
                            break;
                        }

                        var oldText = $("option[value='"+elem.ss.currentSearch+"']", elem.ss.select).text();

                        if(elem.ss.currentSearch == null || elem.ss.currentSearch <= 0) {
                            alertModal(elem.ss.properties.localization.INVENTORY_SEARCH_NOT_SELECTED);
                            activateDefaultSearch();
                        } else {

                            elem.ss.select.bmultiselect('select', elem.ss.currentSearch);

                            titledConfirmationModal(elem.ss.properties.localization.INVENTORY_SEARCH_DEFAULT_DIALOG_TITLE,
                                String.format(elem.ss.properties.localization.INVENTORY_SEARCH_DEFAULT_DIALOG_MESSAGE, oldText),
                                defaultSearchOkClick,
                                actionSSCancel
                            );
                        }
                        break;

				}
			}
		}

        function activateDefaultSearch() {
            elem.ss.select.bmultiselect('select', '-1');

            var defaultSearch = $("option", elem.ss.select).filter(function(){ return $(this).text() == elem.ss.properties.localization.INVENTORY_DEFAULT_SEARCH }).first();

            if(defaultSearch.length > 0) {
                elem.ss.select.bmultiselect('select', defaultSearch.val());
                loadSearch(defaultSearch.val(), false);
            }
        }

		function renameSearchOkClick(data) {
			var nameExists = false;
			var existingId = null;
			$(".ssList option", elem.ss.select).each(function(i,e) {
				var el = $(e);
				if(el.text() == data["searchName"] && el.text() != data["oldName"]) {
					nameExists = true;
					existingId = el.val();
				}
            });
            if(nameExists) {
                    titledConfirmationModal(elem.ss.properties.localization.INVENTORY_SEARCH_RENAME_DIALOG_TITLE,
                        String.format(elem.ss.properties.localization.INVENTORY_SEARCH_RENAME_DIALOG_REPLACE_MESSAGE, data["searchName"]),
                        function(){
                            renameReplaceSearchOkClick({
                                "searchName" : data["searchName"],
                                "replace" : existingId
                            })
                        }
                    );
			} else {
				$.ajax( {
					url:'renameSavedSearchJson.sf',
					dataType: 'text',
					data: { savedSearchId : elem.ss.currentSearch, name : data["searchName"], context: elem.ss.properties.context},
					type: 'POST',
					timeout: 30000,
					success: function(msg) { renameCurrentSearch(msg, data)}
				});
			}
		}


		function renameReplaceSearchOkClick(data) {
			$.ajax( {
				url:'renameSavedSearchJson.sf',
				dataType: 'text',
				data: { savedSearchId : elem.ss.currentSearch, name : data["searchName"], replace : data["replace"], context: elem.ss.properties.context},
				type: 'POST',
				timeout: 30000,
				success: function(msg) { renameCurrentSearch(msg, data, data["replace"])} 
			});
		}
		
		function renameCurrentSearch(msg, data, replace) {
			notify(msg);
			if(replace) {
				$("option[value='"+replace+"']").remove();
			}
			$("option[value='"+elem.ss.currentSearch+"']", elem.ss.select).text(data["searchName"]);
			elem.ss.select.bmultiselect('rebuild');
			elem.ss.select.bmultiselect('select', elem.ss.currentSearch);
		}

        function deleteSearchOkClick() {
            $.ajax( {
                url:'deleteSavedSearchJson.sf',
                dataType: 'text',
                data: { savedSearchId : elem.ss.currentSearch, context: elem.ss.properties.context},
                type: 'POST',
                timeout: 30000,
                success: deleteCurrentSearch
            });
        }

		function deleteCurrentSearch(msg) {
			notify(msg);

			$("option[value='"+elem.ss.currentSearch+"']").remove();
			elem.ss.select.bmultiselect('rebuild');
            activateDefaultSearch();
			
			elem.ss.currentSearch = 0;
		}
		function loadSearch(searchId, system) {
            setTimeout(function(){
                $.ajax( {
                    url:'loadSavedSearchJson.sf',
                    dataType: 'json',
                    data: { savedSearchId : searchId, context: elem.ss.properties.context},
                    type: 'POST',
                    timeout: 30000,
                    success: function(data) { changeSavedSearch(data, system) }
                });
            },200);
		}
		
		function parsePlaceholders(data) {
			if(elem.ss.properties.placeholders == null || elem.ss.properties.placeholders.length == 0 || data == null) {
				return data;
			}
			$.each(elem.ss.properties.placeholders, function(ph,val) {
				ph = elem.ss.properties.placeholderStart + ph + elem.ss.properties.placeholderEnd;
				if(data.indexOf(ph) >= 0) {
					data = data.replace(ph, val);
				}
			});
			return data;
		}
		
		var changeSavedSearch = function(data, system) {
			
			if(elem.oFilters != null && !$(elem.oFilters).is(":visible")) {
				elem.skipAjaxCall=true;
				var sw = $(".onoffswitch-label", elem.parent().parent().parent().parent().parent().parent());
				if(sw.length != 0) {
					sw.click();
				}
				elem.fnToggleFilters();
				elem.skipAjaxCall=false;
			}
			
			var index = elem.filterIndex;
			var filters = $(".filter_row", elem.parent().parent().parent());
			var filterData = parsePlaceholders(data["tableFilters"]);
			var tfj = $.parseJSON(filterData);

			for(i in tfj) {
				if(i.indexOf("_sel", i.length - 4) !== -1) {
					if(tfj[i] == null || tfj[i] == "") {
	             	   	$("#"+index + i, filters).multiselect("uncheckAll");
					} else {
						$("#"+index + i, filters).val(tfj[i].split(',,')).multiselect('refresh');
					}
				} else {
					$("#"+index + i, filters).val(tfj[i])
				}
			}			
			
			elem.ss.properties.headerSearch.val(parsePlaceholders(data["headerSearch"]));
			elem.fnHighlightSearch(elem.ss.properties.headerSearch.val());
			elem.fnFilter(filterData);
			elem.ss.currentSearch = (system ? "_" : "") + data["id"];

};
        var saveSearchOkClick = function(props) {
			var sname = props["searchName"];
			var isDuplicated = false;
			if(sname == null || $.trim(sname) == "") {
				alertModal(elem.ss.properties.localization.INVENTORY_SEARCH_NAME_INVALID);
			}
			$('.ssList option', elem.ss.select).each( function(i, e) {
				
				if(sname.toLowerCase() == $(e).text().toLowerCase() && sname != props['oldName'].toLowerCase()) {
					isDuplicated = true;
					sname = $(e).text(); // in case we entered in different case

                    titledConfirmationModal(elem.ss.properties.localization.INVENTORY_SEARCH_NAME_REPLACE,
                        elem.ss.properties.localization.INVENTORY_SEARCH_NAME_REPLACE,
                        function(){
                            replaceSavedSearch({
                                "sname" : sname
                            })
                        },
                        function(){
                            replaceCancel({
                                "sname" : sname
                            })
                        }
                    );

				}
			});
			if(isDuplicated == false) {
				ajaxSaveSearch(sname);
			}
        };
        function replaceCancel(){
            activateDefaultSearch();
		}
		
		var actionSSCancel = function(data) {	
			
			if(elem.ss.currentSearch == null || elem.ss.currentSearch == 0) {
                activateDefaultSearch();
			} else {
				elem.ss.select.bmultiselect('select', elem.ss.currentSearch);
			}

};
        var replaceSavedSearch = function(data) {
			ajaxSaveSearch(data['sname']);
        };
        var ajaxSaveSearch = function(searchName) {
			$.ajax( {
				url:'saveSearchJson.sf',
				dataType: 'json',
				data: { 
					"searchName" : searchName,
					"headerSearch" : (elem.ss.properties.headerSearch==null ? "" : elem.ss.properties.headerSearch.val()),
					"tableFilters" : elem.fnSettings().oPreviousSearch.sSearch, 
					"context": elem.ss.properties.context
				},
				type: 'POST',
				timeout: 30000,
				success: saveSearchSuccess,
			});

};
        var saveSearchSuccess = function(response) {

            elem.ss.properties.savedSearchList = response["savedSearchList"];
            elem.ss.currentSearch = response["selectedId"];

            notify(response["textMsg"]);

            reloadSelect(elem.ss.properties.savedSearchList, elem.ss.currentSearch);
        };


        var defaultSearchOkClick = function() {
            $.ajax( {
                url:'saveSearchJson.sf',
                dataType: 'json',
                data: {
                    "searchName" : "--DEFAULT_SEARCH--",
                    "headerSearch" : (elem.ss.properties.headerSearch==null ? "" : elem.ss.properties.headerSearch.val()),
                    "tableFilters" : elem.fnSettings().oPreviousSearch.sSearch,
                    "context": elem.ss.properties.context
                },
                type: 'POST',
                timeout: 30000,
                success: saveSearchSuccess,
            });
        };
        function reloadSelect(savedSearchList, selectedId){

			// remove old options
			$('option, optgroup', elem.ss.select).remove();

			// insert new options
			var optgrp = $("<optgroup class='ssList' label='" +
					elem.ss.properties.localization.INVENTORY_SEARCH_DROPDOWN_EXISTING_SEARCHES_LABEL +
					"'></optgroup>");
			for(var key in savedSearchList){

				var opt = $("<option></option>");

				var id = savedSearchList[key].id;
				var name = unescapeCharcodes(savedSearchList[key].name);
				
				if(savedSearchList[key].userId == null && savedSearchList[key].departmentId != null && id > 0) {
					id = "_" + id;
					name += " " + elem.ss.properties.localization.INVENTORY_SEARCH_DEPARTMENT;
				}
				if(savedSearchList[key].userId == null && savedSearchList[key].departmentId == null && id > 0) {
					id = "_" + id;
					name += " " + elem.ss.properties.localization.INVENTORY_SEARCH_SYSTEM;
				}
					
				opt.attr("value",id)
				.text(name); 
				if(opt.val()== "" || opt.val()== 0) {
					elem.ss.select.append(opt);
				} else {
					optgrp.append(opt);
				}
				
			}
			if(selectedId == 0) 
				selectedId = -1;
			
			elem.ss.select.append(getSSOptions());
			elem.ss.select.append(optgrp);
			$("option", elem.ss.select).first().val('-1');
            elem.ss.select.bmultiselect('rebuild');
            if(selectedId == -1 ) {
                activateDefaultSearch();
            } else {
                elem.ss.select.bmultiselect('select', selectedId)
            }
		}
		
		function searchNameValidation(text) {
			if(text == null || $.trim(text) == "")
				return elem.ss.properties.localization.INVENTORY_SEARCH_SAVE_NAME_VALIDATION_ERROR_EMPTY;
			
			var invalidNames = [elem.ss.properties.localization.INVENTORY_SAVED_SEARCHES,
                                elem.ss.properties.localization.INVENTORY_LAST_SEARCH,
                                elem.ss.properties.localization.INVENTORY_DEFAULT_SEARCH,
                                "--LAST_SEARCH--",
                                "--DEFAULT_SEARCH--",
			                    elem.ss.properties.localization.INVENTORY_BTN_SAVESEARCH,
			                    elem.ss.properties.localization.INVENTORY_BTN_RENAMESEARCH,
			                    elem.ss.properties.localization.INVENTORY_BTN_DELETESEARCH
			                    ];
			var invalid = false;
			$.each(invalidNames, function(index, value) { 
				  if (value.toLowerCase() == text.toLowerCase()) {
				    invalid = true;
				    return false;
				  }
				});
			
			if(invalid)
				return elem.ss.properties.localization.INVENTORY_SEARCH_SAVE_NAME_VALIDATION_ERROR_INVALID;
			if(text.length > elem.ss.properties.searchNameMaxLength)
				return String.format(
						elem.ss.properties.localization.INVENTORY_SEARCH_SAVE_NAME_VALIDATION_ERROR_TOO_LONG, 
						elem.ss.properties.searchNameMaxLength);
			if(text.match(elem.ss.properties.deniedPattern) != null){
				return elem.ss.properties.localization.INVENTORY_SEARCH_SAVE_NAME_VALIDATION_ERROR_PROHIBITED_CHAR;
			}
			
			return null;
		}
		
		init();
		
		reloadSelect(elem.ss.properties.savedSearchList, elem.ss.currentSearch);
		
		return elem;	
	}	
});