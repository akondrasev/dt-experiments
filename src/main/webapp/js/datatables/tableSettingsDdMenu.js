define(["jquery"], function ($) {
	var menuTemplate = {
        menu    : "<div class='table-settings-submenu'><p class='invisible-line'></p><ul></ul></div>",
        submenu : "<div class='table-settings-submenu level2'><ul></ul></div>",
		option  : "<li><a href='#'><i class='fa fa-check'></i>{0}</a></li>"
	};

	// List of available options in Table Settings dd menu
	var defaultMenuOptions = [
        {
            name          : 'help',
            localizedText : lTableStrings.COMMON_TABLE_SETTINGS_HELP,
            hasToggleState: false,
            defaultState  : null,
            action        : function () {},
			sClass        : null
        }
	];

	var START_AT_INDEX = 0;

	$.fn.tableSettingsMenu = function (customMenuOptions) {
		var settings;
		var $menuHolder = $(this);

		if(typeof customMenuOptions === "string"){
			return applyMethod($menuHolder, customMenuOptions);
		}

		var tableDdMenuOptions = $.merge([], defaultMenuOptions);
		tableDdMenuOptions = extendOptions(customMenuOptions, tableDdMenuOptions);

		settings = {
			menuHolder : $menuHolder,
			menuOptions: tableDdMenuOptions
		};

		createMenu(menuTemplate.menu, settings);

		$menuHolder.data("tableSettingsDdMenu", true);
		return $menuHolder;
	};

	var publicFunctions = {
		isInit: function ($elem){
			return $elem.data("tableSettingsDdMenu") === true;
		}
	};

	function applyMethod($elem, methodName) {
		return publicFunctions[methodName]($elem);
	}


	/**
	 * Private functions:
	 */
	function createMenu(template, settings) {

		var $menu = $(template);
		var $menuHolder;

		$.each(settings.menuOptions, function (index, option) {
			var $option;
			var subSettings;

			if(option.skip) {
				return true;
			}

			$option = $(String.format(menuTemplate.option, option.localizedText)).attr('data-name', option.name);
			if (option.hasToggleState) {
				$('.fa', $option).css("visibility", "visible");

				if(option.defaultState === 'active') {
					$option.addClass(option.defaultState);
				}
			}

			if(option.sClass) {
				$option.addClass(option.sClass);
			}

			$option.click(function (e) {
				var param;
				if (option.hasToggleState) {
					$option.toggleClass('active');
				}
				if($.isFunction(option.action)){
					param = option.hasToggleState ? $option.is(".active") : undefined;
					option.action(param);
				}
			});

            if(option.subitems) {
                $("a", $option).prepend("<i class='fa fa-chevron-left'></i>");

                subSettings = {
                    menuHolder : $option,
                    menuOptions: option.subitems
                };
                createMenu(menuTemplate.submenu, subSettings);
            }

			$('> ul', $menu).append($option);

		});

		$menu.appendTo(settings.menuHolder);

		// show / hide menu
		$menuHolder = $(settings.menuHolder);
		$menuHolder.mouseover( function(){
			$menu.slideDown(500);
		});
		$menuHolder.mouseleave(function(){
			$menu.stop(true, true);
			$menu.slideUp(500);
		});
		$menuHolder.click(function(){
			$menu.stop(true, true);
			$menu.slideUp(500);
		});
	}

	function extendOptions(customMenuOptions, tableDdMenuOptions) {

		var insertAtIndex = START_AT_INDEX;

		if(customMenuOptions) {
			$.each(customMenuOptions, function (indexCustom, optionCustom) {
				var override = false;
				$.each(tableDdMenuOptions, function (indexDefault, optionDefault) {
					if (optionCustom.name === optionDefault.name) {
						optionDefault = $.extend(true, {}, optionDefault, optionCustom);
						tableDdMenuOptions[indexDefault] = optionDefault;
						override = true;
					}
				});

				if (!override) {
					tableDdMenuOptions.splice(insertAtIndex, 0, optionCustom);
					insertAtIndex++;
				}
			});
		}

		return tableDdMenuOptions;
	}

});