import { unwrapCurrentPlayerYields } from "./effects/yields.js";

export const PolicyYieldsCache = new class {
    /** @type {UnwrappedPlayerYields} */
    _yields = {};
    /** @type {Record<string, Set<string>>} */
    _constructibleTypeTags = {};

    update() {
        this._yields = unwrapCurrentPlayerYields();
        // TODO Remove log
        // console.warn("UnwrappedPlayerYieldsCache updated", JSON.stringify(this._yields));
    }

    cleanup() {
        this._yields = {};
        this._constructibleTypeTags = {};
    }

    /** @returns {UnwrappedPlayerYields} */
    getYields() {
        return this._yields;
    }

    getYieldsForType(yieldType) {
        return this._yields[yieldType];
    }

    /**
     * @param {string} constructibleType 
     * @returns {Set<string>}
     */
    getTagsForConstructibleType(constructibleType) {
        if (!this._constructibleTypeTags[constructibleType]) {
            const tags = GameInfo.TypeTags
                .filter(tag => tag.Type === constructibleType)
                .map(tag => tag.Tag);

            this._constructibleTypeTags[constructibleType] = new Set(tags);
        }

        return this._constructibleTypeTags[constructibleType];
    }

    /**
     * Check if the constructible type has the tag assigned
     * @param {string} constructibleType
     * @param {string} tag
     */
    hasConstructibleTypeTag(constructibleType, tag) {
        return this.getTagsForConstructibleType(constructibleType).has(tag);
    }
}