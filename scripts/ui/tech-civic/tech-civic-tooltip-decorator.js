import TooltipManager, { Tooltip } from '/core/ui/tooltips/tooltip-manager.js';
import TechTreeChooser from '/base-standard/ui/tech-tree-chooser/model-tech-tree-chooser.js'
import CultureTreeChooser from '/base-standard/ui/culture-tree-chooser/model-culture-tree-chooser.js';
import TechTree from '/base-standard/ui/tech-tree/model-tech-tree.js';
import CultureTree from '/base-standard/ui/culture-tree/model-culture-tree.js';
import { TreeGrid } from '/base-standard/ui/tree-grid/tree-grid.js';
import { previewModifiersYields, previewPolicyYields } from '../../preview-yields.js';
import { resolveModifierById } from '../../modifiers.js';
import { renderYieldsPreviewBox } from '../render-yields-preview.js';
import { getUnlockTargetDescriptions, getUnlockTargetName } from '/base-standard/ui/utilities/utilities-textprovider.js';
import { formatStringArrayAsNewLineText } from '/core/ui/utilities/utilities-core-textprovider.js';

// Preload tooltips to make sure we can override them
import '/base-standard/ui/tooltips/tech-civic-tooltip.js';

console.warn('LFYieldsPreview: Tech/Civic Tooltip Decorator');

// @ts-ignore
const _types = TooltipManager.types;

patchChooserTreeModel(TechTreeChooser);
patchChooserTreeModel(CultureTreeChooser);
patchTreeGrid();

patchChooserTreeTooltip(_types['tech']);
patchChooserTreeTooltip(_types['culture']);
patchChooserTreeTooltip(_types['tech-tree'], true);
patchChooserTreeTooltip(_types['culture-tree'], true);

engine.whenReady.then(() => {
    TechTreeChooser.update();
    CultureTreeChooser.update();
    // @ts-ignore
    TechTree.update();
    // @ts-ignore
    CultureTree.update();
});

// ====================================================================================================
// Extend Tree nodes data 
// ====================================================================================================

function patchChooserTreeModel(model) {
    const proto = Object.getPrototypeOf(model);

    const _originalBuildUINodeInfo = proto.buildUINodeInfo;

    proto.buildUINodeInfo = function (nodeInfo, nodeData) {
        const result = _originalBuildUINodeInfo.call(this, nodeInfo, nodeData);
        
        processUnlockIndices(nodeData.unlockIndices, result);

        return result;
    }
}

function patchTreeGrid() {
    const proto = TreeGrid.prototype;

    // @ts-ignore
    const _originalGenerateData = proto.generateData;

    // @ts-ignore
    function patchedGenerateData (...args) {
        _originalGenerateData.call(this, ...args);

        this._treeData.cards.forEach((card, i) => {
            const nodeData = Game.ProgressionTrees.getNode(this._player, card.nodeType);
            if (!nodeData) return;
            
            processUnlockIndices(nodeData.unlockIndices, card);
        });
    }

    // @ts-ignore
    proto.generateData = patchedGenerateData;
}

/**
 * @typedef {{ lfYieldsModifiersIds?: string[] } & (import('/base-standard/ui/tree-grid/tree-support.js').TreeGridDepthInfo | import('/base-standard/ui/tree-chooser-item/model-tree-chooser-item.js').TreeChooserDepthInfo)} YieldsDepthInfo
 */

/**
 * 
 * @param {any} unlockIndices 
 * @param {import('/base-standard/ui/tech-tree-chooser/model-tech-tree-chooser.js').TechChooserNode | import('/base-standard/ui/culture-tree-chooser/model-culture-tree-chooser.js').CultureChooserNode | import('/base-standard/ui/tree-grid/tree-support.js').TreeGridCard} data 
 */
function processUnlockIndices(unlockIndices, data) {
    for (let i of unlockIndices) {
        try {
            const unlockInfo = GameInfo.ProgressionTreeNodeUnlocks[i];
            // console.warn('unlockInfo -->', unlockInfo.TargetKind, unlockInfo.TargetType);
            if (unlockInfo) {
                // These are the only two types of unlocks we are interested in.
                // If we find a new one, add it here.
                if (unlockInfo.TargetKind !== 'KIND_MODIFIER' && unlockInfo.TargetKind !== 'KIND_TRADITION') {
                    continue;
                }                

                if (unlockInfo.TargetKind === 'KIND_MODIFIER') {
                    // console.warn('unlockInfo -->', unlockInfo.TargetKind, unlockInfo.TargetType, unlockInfo.Hidden, 'depth', unlockInfo.UnlockDepth);
                    if (data.unlocksByDepth && unlockInfo.UnlockDepth >= 1) {
                        // console.warn('Adding modifier id to data.unlocksByDepth.lfYieldsModifiersIds, depth:', unlockInfo.UnlockDepth);
                        /** @type {YieldsDepthInfo} */
                        const depth = data.unlocksByDepth[unlockInfo.UnlockDepth - 1];
                        depth.lfYieldsModifiersIds = depth.lfYieldsModifiersIds || [];
                        depth.lfYieldsModifiersIds.push(unlockInfo.TargetType);                    }
                }

                // === Only for traditions ===
                if (unlockInfo.Hidden) continue;

                // This is the simplest way to match the existing data (which misses the modifier id),
                // without having to re-implement the whole logic.
                // The tooltip is easier since description by itself is stylized
                const localName = getUnlockTargetName(unlockInfo.TargetType, unlockInfo.TargetKind);
                const localDesc = formatStringArrayAsNewLineText(getUnlockTargetDescriptions(unlockInfo.TargetType, unlockInfo.TargetKind));
                const localTooltip = localName?.length ? localName : localDesc; // Same

                // Skip if no name or description, the game does it too.
                if (!localTooltip) continue;
                
                const targetUnlock = data.unlocks?.find(u => u.tooltip == localTooltip);
                if (!targetUnlock) continue;

                if (unlockInfo.TargetKind === 'KIND_TRADITION') {
                    // We need to store the modifier id in the unlocks array in order to use it
                    // to calculate the yields in the tooltip.
                    // We use a prefix to differentiate it from the other game properties.                    
                    // We edit `unlocks` but it modifies `unlockByDepths` by reference.
                    targetUnlock.lfYieldsTraditionId = unlockInfo.TargetType;
                }
            }
        }
        catch (e) {
            console.error('Error while processing unlock info', e);
            console.error(e.stack);
        }
    }
}

// ====================================================================================================
// Tech/Civic Tooltip Decorator
// ====================================================================================================

function patchChooserTreeTooltip(chooser, isTreeView = false) {
    const _originalUpdate = chooser.update;
    chooser.update = function () {
        _originalUpdate.call(this);

        /** @type {any} */
        var self = this;

        // -- same section as original code --
        if (!self.hoveredNodeID) {
            console.error("[LFYieldsPreview] tech-tree-tooltip: Attempting to update Tech/Civic info tooltip, but unable to get selected node");
            return;
        }
        /** @type {import('/base-standard/ui/tech-tree-chooser/model-tech-tree-chooser.js').TechChooserNode} */
        const node = self.model.findNode(self.hoveredNodeID);
        if (!node) {
            console.error("[LFYieldsPreview] tech-tree-tooltip: Attempting to update Tech/Civic info tooltip, but unable to get selected node");
            return;
        }

        if (!node.unlocksByDepth) {
            console.error("[LFYieldsPreview] tech-tree-tooltip: No unlocks for node: " + self.hoveredNodeID);
            return;
        }
        // -- end of original code --

        /** @type {YieldsDepthInfo | null | undefined} */
        let currentDepth = null;

        // Support both tooltips (Chooser & Tree) with the same decorator
        if (isTreeView) {
            let index = 0;
            if (self.level) index = self.level;
            currentDepth = node.unlocksByDepth[index];
        }
        else {
            currentDepth = node.unlocksByDepth.find(depth => depth.isCurrent);
        }

        /** @type {HTMLDivElement} */
        const unlocksContainer = isTreeView 
            ? self.fragment.querySelector('.tech-tree-tooltip__unlocks-container')
            : self.fragment.querySelector('.tech-civic-tooltip__unlocks-container');

        // Add tooltip for yields for SINGLE unlocks, e.g. Traditions
        currentDepth?.unlocks?.forEach((unlock, i) => {
            // console.warn('unlock -->', String(chooser), JSON.stringify(unlock));
            try {
                const previewBox = renderUnlockYieldsPreviewBox(unlock);
                if (previewBox) {
                    unlocksContainer.children[i].appendChild(previewBox);
                }
            }
            catch (e) {
                console.error('Error while rendering yields preview box', e);
                console.error(e.stack);
            }
        });

        // Add tooltip for yields for MULTIPLE unlocks, e.g. Modifiers (some are hidden, so
        // we need to show them "grouped" in the same preview box)
        // @ts-ignore
        const allModifierIds = currentDepth?.lfYieldsModifiersIds;
        // console.warn('allModifierIds -->', JSON.stringify(allModifierIds), 'for', node.name);
        if (allModifierIds?.length) {
            const modifiers = allModifierIds.map(id => resolveModifierById(id));
            const result = previewModifiersYields(modifiers, "Tech/Civic tooltip" + node.name);
            const previewBox = renderYieldsPreviewBox(result);
            if (previewBox) {
                unlocksContainer.appendChild(previewBox);
            }
        }
    };
}

function renderUnlockYieldsPreviewBox(unlock) {
    if (unlock.lfYieldsTraditionId) {
        const result = previewPolicyYields({ TraditionType: unlock.lfYieldsTraditionId });
        return renderYieldsPreviewBox(result);
    }

    return null;
}