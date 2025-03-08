import { PolicyYieldsSettings } from "../core/settings.js";
import { setupCSSStyles } from "./yields-styles.js";

const DEBUG_YIELDS = false;

const YieldsColorMap = {
    "YIELD_GOLD": "rgba(255, 235, 75, 0.18)",
    "YIELD_FOOD": "rgba(141, 255, 75, 0.18)",
    "YIELD_PRODUCTION": "rgba(174, 79, 15, 0.18)",
    "YIELD_DIPLOMACY": "rgba(88, 192, 231, 0.18)",
    "YIELD_SCIENCE": "rgba(50, 151, 255, 0.18)",
    "YIELD_CULTURE": "rgba(197, 75, 255, 0.18)",
    "YIELD_HAPPINESS": "rgba(253, 175, 50, 0.18)",
}

/**
 * @param {string} type
 * @param {number} value
 * @param {boolean} isColorful
 */
function renderYieldTextSpan(type, value, isColorful) {
    const element = document.createElement("div");
    element.classList.value = "yields-preview__item";
    if (isColorful) {
        element.style.backgroundColor = YieldsColorMap[type];
    }
    if (value < 0) {
        element.classList.add("text-negative");
    }
    const positiveSign = value >= 0 ? "+" : "";
    element.innerHTML = Locale.stylize(`${positiveSign}${value}[icon:${type}]`);
    return element;
}

/**
 * Renders the yields preview box.
 * We could probably transform this into a component, but we would need a way to pass result
 * which is an object and triggere the update only when the object changes.
 * 
 * @param {YieldsPreviewResult} result
 */
export function renderYieldsPreviewBox(result) {
    setupCSSStyles();
    
    const { error, isValid, modifiers, yields } = result;
    
    const validYields = Object.entries(yields);
    if (validYields.length == 0 && !error) {
        return document.createElement("div");
    }
    if (error && !DEBUG_YIELDS) {
        return document.createElement("div");
    }

    const element = document.createElement(DEBUG_YIELDS ? "fxs-activatable": "div");
    element.classList.value = "yields-preview__root pl-2 pr-2 pt-1 pb-2 z-1";

    const colorClass = PolicyYieldsSettings.IsColorful ? "color" : "no-color";
    element.classList.add(colorClass);
    
    const yieldsContainer = document.createElement("div");
    yieldsContainer.classList.value = "yields-preview__container font-body-sm text-center text-accent-3 flex items-center";
    element.appendChild(yieldsContainer);
    
    validYields.forEach(([type, value]) => {
        yieldsContainer.appendChild(renderYieldTextSpan(type, value, colorClass === "color"));
    });
    
    if (DEBUG_YIELDS) {
        if (error) {
            const errorElement = document.createElement("div");
            errorElement.classList.value = "text-negative mt-2";
            errorElement.style.wordBreak = "break-all";
            errorElement.textContent = error;
            yieldsContainer.appendChild(errorElement);
        }

        element.addEventListener('action-activate', () => {
            // console.warn("LFAddon: PolicyChooserItem action-activate", node.TraditionType);
            // const result = previewPolicyYields(node);
            console.warn("LFAddon: YieldsPreviewBox rendered", JSON.stringify(result));
        });
    }

    return element;
}