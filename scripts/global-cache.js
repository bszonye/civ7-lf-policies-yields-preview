import { unwrapCurrentPlayerYields } from "./yields.js";

class UnwrappedPlayerYieldsCache {
    /** @type {UnwrappedPlayerYields} */
    _yields = {};

    /** @returns {UnwrappedPlayerYields} */
    get() {
        return this._yields;
    }

    update() {
        this._yields = unwrapCurrentPlayerYields();
        // TODO Remove log
        console.warn("UnwrappedPlayerYieldsCache updated", JSON.stringify(this._yields));
    }

    getForYieldType(yieldType) {
        return this._yields[yieldType];
    }

}

export const UnwrappedPlayerYieldsCacheInstance = new UnwrappedPlayerYieldsCache();