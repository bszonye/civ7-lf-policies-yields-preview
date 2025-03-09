let isCSSApplied = false;

export function setupCSSStyles() {
    if (isCSSApplied) return;

    const style = document.createElement('style');
    style.textContent = /* css */ `
    .yields-preview__root div.yields-preview__container {
        font-weight: 700;
        line-height: 1.3333333333rem;
        border-radius: 0.38rem;
        flex-wrap: wrap;
        justify-content: center;
    }

    .yields-preview__root.no-color div.yields-preview__container {
        padding: 0.3rem;
        background: linear-gradient(180deg, rgba(19, 20, 21, 0.45) 0%, rgba(27, 27, 30, 0.85) 100%);
    }

    .yields-preview__root div.yields-preview__item {
        margin: 0;
        line-height: 1.3333333333rem;                    
        border-radius: 0.35rem;
        margin-left: 0.3rem;
    }

    /** Colorful version */
    .yields-preview__root.color div.yields-preview__item {
        padding-top: 0.15rem;
        padding-bottom: 0.15rem;
        padding-right: 0.15rem;
        padding-left: 0.35rem;  
    }


    .yields-preview__item:first-child {
        /*border-top-left-radius: 0.65rem;
        border-bottom-left-radius: 0.65rem;*/
        padding-left: 0.123rem;
        margin-left: 0 !important;
    }

    .yields-preview__item:last-child {
        /*border-top-right-radius: 0.65rem;
        border-bottom-right-radius: 0.65rem;*/
    }   


    /* Tooltips (from 23.3333) */
    .tech-civic-tooltip.tooltip .tooltip__content {
        width: 25.3333333333rem !important;
    }
    .tree-tooltip.tooltip .tooltip__content {
        width: 25.3333333333rem !important;
    }
    `;
    document.head.appendChild(style);

    isCSSApplied = true;
}