import { resolveModifier } from "./modifiers.js";

/**
 * Obtains the modifiers associated with the Tradition, and their requirements.
 * 
 * @param {string | null} traditionType 
 * @returns {ResolvedModifier[] | null}
 */
export function getModifiersForTradition(traditionType) {
    if (!traditionType) {
        return null;
    }

    // 1. Ottieni i Modifier associati alla Tradition
    let traditionModifiers = new Set(GameInfo.TraditionModifiers
        .filter(tm => tm.TraditionType === traditionType)
        .map(tm => tm.ModifierId));

    // 2. Ottieni i ModifierType associati ai ModifierId trovati
    let modifiers = GameInfo.Modifiers
        .filter(m => traditionModifiers.has(m.ModifierId))
        .map(m => resolveModifier(m));

    return modifiers;
}

/**
 * Obtains the modifiers associated with the Attribute, and their requirements.
 * 
 * @param {string | null} attributeType 
 * @returns {ResolvedModifier[] | null}
 */
export function getModifiersForAttribute(attributeType) {
    if (!attributeType) {
        return null;
    }

    // 1. Ottieni i Modifier associati alla Tradition
    let attributeModifiers = new Set(GameInfo.ProgressionTreeNodeUnlocks
        .filter(tm => tm.TargetKind === 'KIND_MODIFIER' && tm.ProgressionTreeNodeType === attributeType)
        .map(tm => tm.TargetType));

    // 2. Ottieni i ModifierType associati ai ModifierId trovati
    let modifiers = GameInfo.Modifiers
        .filter(m => attributeModifiers.has(m.ModifierId))
        .map(m => resolveModifier(m));

    return modifiers;
}