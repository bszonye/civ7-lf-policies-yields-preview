import { previewPolicyYields } from "../../preview-yields.js";
import { renderYieldsPreviewBox } from "../render-yields-preview.js";

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

// @ts-ignore
Controls.decorate('policy-chooser-item', (val) => new PolicyChooserItemYieldsDecorator(val));
