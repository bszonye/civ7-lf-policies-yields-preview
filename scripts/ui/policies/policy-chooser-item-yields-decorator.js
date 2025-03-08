import { PolicyYieldsSettings } from "../../core/settings.js";
import { previewPolicyYields } from "../../preview-yields.js";
import { renderYieldsPreviewBox } from "../render-yields-preview.js";

const YieldsColorMap = {
    "YIELD_GOLD": "rgba(255, 235, 75, 0.18)",
    "YIELD_FOOD": "rgba(141, 255, 75, 0.18)",
    "YIELD_PRODUCTION": "rgba(174, 79, 15, 0.18)",
    "YIELD_DIPLOMACY": "rgba(88, 192, 231, 0.18)",
    "YIELD_SCIENCE": "rgba(50, 151, 255, 0.18)",
    "YIELD_CULTURE": "rgba(197, 75, 255, 0.18)",
    "YIELD_HAPPINESS": "rgba(253, 175, 50, 0.18)",
}

const DarkYieldsColorMap = {
    "YIELD_GOLD": "rgba(51, 47, 15, 0.4)",
    "YIELD_FOOD": "rgba(28, 51, 15, 0.4)",
    "YIELD_PRODUCTION": "rgba(35, 16, 3, 0.4)",
    "YIELD_DIPLOMACY": "rgba(18, 38, 46, 0.4)",
    "YIELD_SCIENCE": "rgba(10, 30, 51, 0.4)",
    "YIELD_CULTURE": "rgba(40, 15, 51, 0.4)",
    "YIELD_HAPPINESS": "rgba(51, 35, 10, 0.4)"
}

export const DEBUG_POLICY = false;

/**
 * @param {string} type
 * @param {number} value
 * @param {boolean} isColorful
 */
function renderYieldTextSpan(type, value, isColorful) {
    const element = document.createElement("div");
    element.classList.value = "policy-chooser-item__yield";
    if (isColorful) {
        element.style.backgroundColor = YieldsColorMap[type];
    }
    if (value < 0) {
        element.classList.add("text-negative");
    }
    const positiveSign = value >= 0 ? "+" : "";
    element.innerHTML = Locale.stylize(`${positiveSign}${value}[icon:${type}]`);
    return element;
}

class PolicyChooserItemYieldsDecorator {
    static hasCSSOverrides = false;
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
        if (PolicyChooserItemYieldsDecorator.latestAppliedProto === proto) {
            return;
        }

        PolicyChooserItemYieldsDecorator.latestAppliedProto = proto;
        
        const _render = proto.render;
        
        proto.render = function () {
            _render.call(this);
            
            const node = this.policyChooserNode;
            if (!node) return;
    
            const result = previewPolicyYields(node);
            const previewBox = renderYieldsPreviewBox(result);
            this.Root.querySelector(`div[data-l10n-id="${node.name}"]`).parentNode.appendChild(previewBox);
        };
    }
}

Controls.decorate('policy-chooser-item', (val) => new PolicyChooserItemYieldsDecorator(val));
