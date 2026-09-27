export async function evaluateKeyboard(page, expectedControls, taskModel) {
    try {
        const data = await page.evaluate(({ expectedSelectors, taskType }) => {
            const focusableElements = Array.from(document.querySelectorAll(
                'a[href], button, input:not([disabled]), select:not([disabled]), textarea:not([disabled]), [tabindex]:not([tabindex="-1"])'
            ));
            
            let badTabIndexCount = 0;
            focusableElements.forEach(el => {
                if (parseInt(el.getAttribute("tabindex")) > 0) {
                    badTabIndexCount++;
                }
            });

            let controlesReales = [];
            const mainContainer = document.querySelector('main, #content, .main-content, .container') || document.body;
            
            expectedSelectors.forEach(sel => {
                const els = mainContainer.querySelectorAll(sel);
                els.forEach(el => {
                    // Ignorar si el elemento no es visible
                    const isVisible = el.offsetWidth > 0 && el.offsetHeight > 0 && 
                                      window.getComputedStyle(el).display !== 'none' && 
                                      window.getComputedStyle(el).visibility !== 'hidden';
                                      
                    if (!isVisible) return; // Future step essential, ignorar en tabulación actual

                    const name = el.getAttribute("aria-label") || el.getAttribute("aria-labelledby") || el.innerText || el.value || el.placeholder || sel;
                    const tagName = el.tagName.toLowerCase();
                    const isRequired = el.hasAttribute("required") || el.getAttribute("aria-required") === "true" || tagName === "button";
                    
                    if (name.trim() !== "") {
                        controlesReales.push({
                            nombre: name.trim().slice(0, 30), // truncar nombre largo
                            selector: sel,
                            tagName,
                            alcanzable: false,
                            required: isRequired,
                            scope: "CURRENT_STEP_ESSENTIAL" // Actualizado para soportar multistep
                        });
                    }
                });
            });

            return {
                focusableCount: focusableElements.length,
                badTabIndexCount,
                controlesEsenciales: controlesReales
            };
        }, { expectedSelectors: expectedControls || [], taskType: taskModel.tipoOperacion });

        let visitedElements = 0;
        const maxTabs = Math.min(100, data.focusableCount + 5); 
        const visitedIds = new Set();
        let loopDetected = false;

        for (let i = 0; i < maxTabs; i++) {
            await page.keyboard.press('Tab');
            
            const activeTagInfo = await page.evaluate(() => {
                const el = document.activeElement;
                if (!el || el === document.body) return null;
                const elHash = el.tagName + "#" + el.id + "." + el.className + ":" + (el.innerText || "").slice(0, 10);
                return { 
                    tag: el.tagName.toLowerCase(), 
                    text: (el.innerText || el.value || el.placeholder || "").trim().slice(0, 30),
                    hash: elHash
                };
            });

            if (activeTagInfo) {
                visitedElements++;
                visitedIds.add(activeTagInfo.hash);
                
                data.controlesEsenciales.forEach(ce => {
                    if (!ce.alcanzable && activeTagInfo.text === ce.nombre) {
                        ce.alcanzable = true;
                    }
                });

                const allRequiredReached = data.controlesEsenciales.filter(c => c.required).every(c => c.alcanzable);
                if (allRequiredReached && data.controlesEsenciales.length > 0) {
                    break; 
                }
            }
        }
        
        const focusMoved = visitedElements > 0;
        const essentialRequired = data.controlesEsenciales.filter(c => c.required);
        let essentialControlsReachable = true;
        
        if (essentialRequired.length > 0) {
            essentialControlsReachable = essentialRequired.every(ce => ce.alcanzable);
        } else if (data.controlesEsenciales.length > 0) {
            essentialControlsReachable = data.controlesEsenciales.some(ce => ce.alcanzable);
        }

        let passed = focusMoved && data.badTabIndexCount === 0 && essentialControlsReachable;
        
        // Build unified findings for keyboard
        const findings = [];
        if (data.badTabIndexCount > 0) {
            findings.push({ source: "KEYBOARD", ruleId: "tabindex", selector: "global", scope: "GLOBAL", blocking: false, reason: "Uso de tabindex > 0 detectado." });
        }
        if (!focusMoved && data.focusableCount > 0) {
            findings.push({ source: "KEYBOARD", ruleId: "keyboard-trap", selector: "unknown", scope: "GLOBAL", blocking: true, reason: "Posible trampa de teclado detectada. El foco no avanzó." });
        }
        essentialRequired.forEach(c => {
            if (!c.alcanzable) {
                findings.push({ source: "KEYBOARD", ruleId: "keyboard-unreachable", selector: c.selector, scope: "CURRENT_STEP_ESSENTIAL", blocking: true, reason: "Control obligatorio no es alcanzable por teclado." });
            }
        });

        return {
            tested: true,
            controlesEsenciales: data.controlesEsenciales,
            focusMoved: focusMoved,
            possibleTrap: !focusMoved && data.focusableCount > 0,
            essentialControlsReachable: essentialControlsReachable,
            passed: passed,
            findings: findings,
            evidence: [
                `Elementos interactivos: ${data.focusableCount}`,
                `Saltos de Tabulador ejecutados: ${visitedElements}`,
                `Controles requeridos alcanzados en etapa actual: ${essentialRequired.filter(c => c.alcanzable).length}/${essentialRequired.length}`
            ]
        };

    } catch (error) {
        return {
            tested: false,
            error: error.message
        };
    }
}
