import { previewCityStateBonusYields } from "../../preview-yields.js";
import { renderYieldsPreviewBox } from "../render-yields-preview.js";

class ScreenCityStateBonusYieldsDecorator {
    static latestAppliedProto = null;

    constructor(val) {
        this.item = val;
        this.applyPrototypePatch();
    }

    beforeAttach() {}
    afterAttach() {}
    beforeDetach() {}
    afterDetach() {}

    applyPrototypePatch() {
        const proto = Object.getPrototypeOf(this.item);
        if (ScreenCityStateBonusYieldsDecorator.latestAppliedProto === proto) {
            return;
        }

        ScreenCityStateBonusYieldsDecorator.latestAppliedProto = proto;
        
        // const _onAttributeChanged = proto.onAttributeChanged;
        // const _render = proto.render;
        const _createEntries = proto.createEntries;

        proto.createEntries = function (entryContainer) {
            _createEntries.call(this, entryContainer);
            console.warn('[LFYields] Applying yields preview to CityStateBonus');
            const bonusItems = entryContainer.querySelectorAll('fxs-chooser-item');
            // Render the yields preview box for each bonus item
            bonusItems.forEach((bonusItem) => {
                const bonusType = bonusItem.getAttribute('bonus-item');
                if (!bonusType) return;

                const result = previewCityStateBonusYields(bonusType);
                const yieldsPreviewBox = renderYieldsPreviewBox(result);
                bonusItem.appendChild(yieldsPreviewBox);
            });
        };
    }
}

// @ts-ignore
Controls.decorate('screen-city-state-bonus-chooser', (val) => new ScreenCityStateBonusYieldsDecorator(val));