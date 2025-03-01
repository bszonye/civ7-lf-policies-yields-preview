import { previewPolicyYields } from "../preview-policy-yields.js";

const YieldsColorMap = {
    "YIELD_GOLD": "rgba(255, 235, 75, 0.15)",
    "YIELD_FOOD": "rgba(141, 255, 75, 0.15)",
    "YIELD_PRODUCTION": "rgba(174, 79, 15, 0.15)",
    "YIELD_DIPLOMACY": "rgba(88, 192, 231, 0.15)",
    "YIELD_SCIENCE": "rgba(50, 151, 255, 0.15)",
    "YIELD_CULTURE": "rgba(197, 75, 255, 0.15)",
    "YIELD_HAPPINESS": "rgba(253, 175, 50, 0.15)",
}    

/**
 * @param {string} type
 * @param {number} value
 */
function renderYieldTextSpan(type, value) {
    const element = document.createElement("div");
    element.classList.value = "policy-chooser-item__yield";
    // element.style.backgroundColor = YieldsColorMap[type];
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

        this.setupCSSOverrides();
        this.applyPrototypePatch();
    }

    setupCSSOverrides() {
        if (PolicyChooserItemYieldsDecorator.hasCSSOverrides) {
            return;
        }

        PolicyChooserItemYieldsDecorator.hasCSSOverrides = true;

        const style = document.createElement('style');
        style.textContent = /* css */ `
        .policy-chooser-item__yields {
              font-weight: 700;
              line-height: 1.3333333333rem;
              border-radius: 0.65rem;              
              background: linear-gradient(180deg, rgba(19, 20, 21, 0.45) 0%, rgba(27, 27, 30, 0.85) 100%);            padding: 0.25rem 0.5rem;
        }

        .policy-chooser-item__yields > div {
            padding: 0;
        }

        .policy-chooser-item__yield {
            margin: 0;
            line-height: 1.3333333333rem;
            padding-left: 0.35rem;
        }

        .policy-chooser-item__yield:first-child {
            border-top-left-radius: 0.65rem;
            border-bottom-left-radius: 0.65rem;
            padding-left: 0.23rem;
        }

        .policy-chooser-item__yield:last-child {
            border-top-right-radius: 0.65rem;
            border-bottom-right-radius: 0.65rem;
        }   
        `;
        document.head.appendChild(style);
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
    
            const { yields, modifiers } = previewPolicyYields(node);
            // console.warn("LFAddon: PolicyChooserItem", JSON.stringify(node), JSON.stringify(yields));
            const validYields = Object.entries(yields)
                .filter(([type, value]) => value != 0 && value != null);

            if (validYields.length === 0) return;
            
            // const yieldsPreviewText = yieldsPreviewItems.map(i => i.text).join(" ");
                    
            const container = document.createElement("fxs-activatable");
            container.classList.value = "policy-chooser-item--preview pl-2 pr-2 pt-1 pb-2 z-1";
            
            const yieldsContainer = document.createElement("div");
            yieldsContainer.classList.value = "policy-chooser-item__yields w-full font-body-sm text-center text-accent-3";
            container.appendChild(yieldsContainer);

            const yieldsTextContainer = document.createElement("div");
            yieldsTextContainer.classList.value = "w-auto flex items-center";
            yieldsContainer.appendChild(yieldsTextContainer);

            validYields.forEach(([type, value]) => {
                yieldsTextContainer.appendChild(renderYieldTextSpan(type, value));
            });
        
            container.addEventListener('action-activate', () => {
                console.warn("LFAddon: PolicyChooserItem action-activate", node.TraditionType);
                const result = previewPolicyYields(node);
                console.warn("LFAddon: PolicyChooserItem", JSON.stringify(result));
            });
    
            this.Root.querySelector(`div[data-l10n-id="${node.name}"]`).parentNode.appendChild(container);
        };
    }
}

Controls.decorate('policy-chooser-item', (val) => new PolicyChooserItemYieldsDecorator(val));
