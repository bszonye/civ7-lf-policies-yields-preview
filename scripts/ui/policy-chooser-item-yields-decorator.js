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
              font-weight: 700;
              line-height: 1.3333333333rem;
              background: linear-gradient(180deg, rgba(35, 37, 43, 0.45) 0%, rgba(35, 37, 43, 0.85) 100%);            padding: 0.25rem 0.5rem;
        }

        .policy-chooser-item__yields div {
            margin-bottom: -0.15rem;
        }
        `;
        document.head.appendChild(style);
    }

    beforeAttach() {}
    afterAttach() {}

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
                .map(([key, value]) => `${value >= 0 ? '+' : ''}${value}[icon:${key}]`);
    
            // if (yieldsPreviewItems.length === 0) return;
            
            const yieldsPreviewText = yieldsPreviewItems.join(" ");
            // const button = document.createElement("fxs-activatable");        
            const container = document.createElement("fxs-activatable");
            // button.appendChild(container);
            container.style.bottom = "0px";
            container.classList.value = "policy-chooser-item--preview absolute w-full";
            container.innerHTML = `
            <div class="policy-chooser-item__yields w-full font-body-sm text-center text-accent-3">
                <div class="w-auto flex items-center">${Locale.stylize(yieldsPreviewText)}</div>
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

// engine.whenReady.then(() => {
//     const player = Players.get(GameContext.localPlayerID);

//     for (let i = 0; i < GameInfo.Yields.length; i++) {
//         const yieldType = GameInfo.Yields[i].YieldType;
//         const yields = player.Stats.getYieldsForType(yieldType);

//     }
// });