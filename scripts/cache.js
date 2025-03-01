import { unwrapCurrentPlayerYields } from "./effects/yields.js";

export const PolicyYieldsCache = new class {
    /** @type {UnwrappedPlayerYields} */
    _yields = {};

    update() {
        this._yields = unwrapCurrentPlayerYields();
        // TODO Remove log
        // console.warn("UnwrappedPlayerYieldsCache updated", JSON.stringify(this._yields));
    }

    cleanup() {
        this._yields = {};
    }

    /** @returns {UnwrappedPlayerYields} */
    getYields() {
        return this._yields;
    }

    getYieldsForType(yieldType) {
        return this._yields[yieldType];
    }

}