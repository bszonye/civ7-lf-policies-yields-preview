import { Options, OptionType } from '/core/ui/options/model-options.js';
import { CategoryType, CategoryData } from '/core/ui/options/options-helpers.js';
import { PolicyYieldsSettings } from '../core/settings.js';

// We add a dependency on the Options module to ensure default options are loaded before we add our own
import '/core/ui/options/options.js';

CategoryType["Mods"] = "mods";
CategoryData[CategoryType["Mods"]] = {
    title: "LOC_UI_CONTENT_MGR_SUBTITLE",
    description: "LOC_UI_CONTENT_MGR_SUBTITLE_DESCRIPTION",
};

const onOptionColorfulInit = (optionInfo) => {
    optionInfo.currentValue = PolicyYieldsSettings.IsColorful;
};
const onOptionColorfulUpdate = (optionInfo, value) => {
    PolicyYieldsSettings.IsColorful = value;
}

Options.addInitCallback(() => {
    Options.addOption({ 
        category: CategoryType["Mods"], 
        // @ts-ignore
        group: 'lf_yields', 
        type: OptionType.Checkbox, 
        id: "lf-yields-colorful", 
        initListener: onOptionColorfulInit, 
        updateListener: onOptionColorfulUpdate, 
        label: "LOC_MOD_LF_YIELDS_OPTION_COLORFUL", 
        description: "LOC_MOD_LF_YIELDS_OPTION_COLORFUL_DESC" 
    });
});
