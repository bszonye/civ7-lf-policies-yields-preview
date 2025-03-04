import { Options, OptionType } from '/core/ui/options/model-options.js';
import { CategoryType } from '/core/ui/options/options-helpers.js';

// We add a dependency on the Options module to ensure default options are loaded before we add our own
import '/core/ui/options/options.js';

const onOptionColorfulInit = (optionInfo) => {
    optionInfo.currentValue = Configuration.getUser().getValue("LFPolicyYields_Colorful") === "true";
};
const onOptionColorfulUpdate = (optionInfo, value) => {
    Configuration.getUser().setValue("LFPolicyYields_Colorful", value ? "true" : "false");
}

Options.addInitCallback(() => {
    Options.addOption({ 
        category: CategoryType.Game, 
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
