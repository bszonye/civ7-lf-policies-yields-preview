import { unwrapCurrentPlayerYields } from "./effects/yields.js";

export const PolicyYieldsCache = new class {
    /** @type {UnwrappedPlayerYields} */
    _yields = {};
    /** @type {Record<string, Set<string>>} */
    _typeTags = {};

    update() {
        this._yields = unwrapCurrentPlayerYields();
        // TODO Remove log
        // console.warn("UnwrappedPlayerYieldsCache updated", JSON.stringify(this._yields));
    }

    cleanup() {
        this._yields = {};
        this._typeTags = {};
    }

    /** @returns {UnwrappedPlayerYields} */
    getYields() {
        return this._yields;
    }

    getYieldsForType(yieldType) {
        return this._yields[yieldType];
    }

    /**
     * @param {string} type 
     * @returns {Set<string>}
     */
    getTypeTags(type) {
        if (!this._typeTags[type]) {
            const tags = GameInfo.TypeTags
                .filter(tag => tag.Type === type)
                .map(tag => tag.Tag);

            this._typeTags[type] = new Set(tags);
        }

        return this._typeTags[type];
    }

    /**
     * Check if the  type has the tag assigned
     * @param {string} type
     * @param {string} tag
     */
    hasTypeTag(type, tag) {
        return this.getTypeTags(type).has(tag);
    }
}