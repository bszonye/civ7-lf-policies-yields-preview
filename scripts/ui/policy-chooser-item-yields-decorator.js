import { previewPolicyYields } from "../preview-policy-yields.js";

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
            border-image-source: url("fs://game/hud_sidepanel_list-bg.png");
            border-image-outset: 0 0 0 0;
            border-image-repeat: stretch stretch;
            border-image-slice: 8 8 8 8 fill;
            border-image-width: 0.4444444444rem 0.4444444444rem 0.4444444444rem 0.4444444444rem;
            background: linear-gradient(180deg, #333640 0%, rgba(35, 37, 43, 0.95) 100%);
            padding: 0.25rem 0.5rem;
        }
        `;
        document.head.appendChild(style);
    }

    beforeAttach() {}

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
            const yieldsPreviewItems = Object.entries(yields)
                .filter(([key, value]) => value != 0 && value != null)
                .map(([key, value]) => `${value >= 0 ? '+' : ''}${value} [icon:${key}]`);
    
            // if (yieldsPreviewItems.length === 0) return;
            
            const yieldsPreviewText = yieldsPreviewItems.join(" ");
            // const button = document.createElement("fxs-activatable");        
            const container = document.createElement("fxs-activatable");
            // button.appendChild(container);
            container.style.top = "-12px";
            container.classList.value = "policy-chooser-item--preview absolute w-auto text-center";
            container.innerHTML = `
            <div class="policy-chooser-item__yields flex items-center font-body-base text-center text-accent-4">
                ${Locale.stylize(yieldsPreviewText)}
            </div>
            `;
            
            container.addEventListener('action-activate', () => {
                console.warn("LFAddon: PolicyChooserItem action-activate", node.TraditionType, JSON.stringify(modifiers));
            });
    
    
            this.Root.appendChild(container);
        };
    }
}

Controls.decorate('policy-chooser-item', (val) => new PolicyChooserItemYieldsDecorator(val));