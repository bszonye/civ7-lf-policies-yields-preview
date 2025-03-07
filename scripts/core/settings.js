export const PolicyYieldsSettings = new class {
    _data = {
        IsColorful: false
    };

    constructor() {
        const data = localStorage.getItem("LFPolicyYieldsSettings");
        try {
            if (data) {
                console.warn("[LFPolicyYieldsSettings] loading..", data);
                this._data = JSON.parse(data);
            }
            else {
                console.warn("[LFPolicyYieldsSettings] No settings found, using defaults");
            }
        }
        catch (e) {
            console.error("[LFPolicyYieldsSettings] Error loading settings", e);
        }
    }

    save() {
        console.warn("[LFPolicyYieldsSettings] saving..", JSON.stringify(this._data));
        localStorage.setItem("LFPolicyYieldsSettings", JSON.stringify(this._data));
    }

    get IsColorful() {
        return this._data.IsColorful;
    }

    set IsColorful(value) {
        this._data.IsColorful = value;
        this.save();
    }
}