import { previewAttributeYields } from "../../preview-yields.js";
import { renderYieldsPreviewBox } from "../render-yields-preview.js";

class AttributeCardYieldsDecorator {
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
        if (AttributeCardYieldsDecorator.latestAppliedProto === proto) {
            return;
        }

        AttributeCardYieldsDecorator.latestAppliedProto = proto;
        
        const _onAttributeChanged = proto.onAttributeChanged;
        const _render = proto.render;

        proto.setupYieldContainer = function (yieldsContainer) {
            if (yieldsContainer) {
                this.yieldsContainer = yieldsContainer;
                return;
            }

            // Fallback if not provided
            if (this.yieldsContainer) return;
            this.yieldsContainer = document.createElement("div");
        }

        proto.onAttributeChanged = function (name, oldValue, newValue) {
            _onAttributeChanged.call(this, name, oldValue, newValue);

            const self = this; // TS doesn't like this.yieldsContainer assignment in the callback

            if (name === 'type') {
                const nodeDef = GameInfo.ProgressionTreeNodes.lookup(this.type);
                if (!nodeDef) return;

                const result = previewAttributeYields(nodeDef.ProgressionTreeNodeType);
                const parentNode = this.yieldsContainer?.parentNode;
                if (parentNode && this.yieldsContainer) {
                    parentNode.removeChild(self.yieldsContainer);
                }

                self.yieldsContainer = renderYieldsPreviewBox(result);
                if (parentNode) {
                    parentNode.appendChild(self.yieldsContainer);
                }
            }
            
        }
        
        proto.render = function () {
            _render.call(this);
            this.setupYieldContainer();

            /** @type {HTMLDivElement} */
            const cardContent = this.cardDescription.parentNode;
            cardContent.appendChild(this.yieldsContainer);
        };
    }
}

Controls.decorate('attribute-card', (val) => new AttributeCardYieldsDecorator(val));
