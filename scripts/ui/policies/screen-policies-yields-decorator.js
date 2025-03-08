import { PolicyYieldsCache } from "../../cache.js";

class ScreenPoliciesYieldsDecorator {
    static latestAppliedProto = null;

    constructor(val) {
        this.screen = val;

        this.applyPrototypePatch();
    }

    beforeAttach() {
        PolicyYieldsCache.update();
    }

    afterAttach() {}
    beforeDetach() {}
    afterDetach() {}

    /**
     * We need to patch the `createPolicyNode` method to set the TraditionType on the node so we can preview the yields.
     * This is necessary because the TraditionType is not available on the node by default.
     */
    applyPrototypePatch() {
        const proto = Object.getPrototypeOf(this.screen);
        if (ScreenPoliciesYieldsDecorator.latestAppliedProto === proto) {
            return;
        }
        
        const _createPolicyNode = proto.createPolicyNode;
        
        proto.createPolicyNode = function (policy, isSelectable) {
            const node = _createPolicyNode.call(this, policy, isSelectable);
            
            // We need to set the TraditionType on the node so we can preview the yields
            node.TraditionType = policy.TraditionType;

            return node;
        };
    }
}

Controls.decorate('screen-policies', (val) => new ScreenPoliciesYieldsDecorator(val));