export async function evaluateARIA(page, expectedControls) {
    if (!expectedControls || expectedControls.length === 0) return { validations: [] };

    const validations = await page.evaluate((selectors) => {
        let results = [];
        const mainContainer = document.querySelector('main, #content, .main-content, .container') || document.body;
        const seenKeys = new Set();
        
        // Helper to calculate a somewhat real Accessible Name without relying blindly on value or innerText
        const getAccessibleName = (el) => {
            const tagName = el.tagName.toLowerCase();
            const ariaLabel = el.getAttribute("aria-label");
            if (ariaLabel) return ariaLabel;
            
            const ariaLabelledBy = el.getAttribute("aria-labelledby");
            if (ariaLabelledBy) {
                const labelEl = document.getElementById(ariaLabelledBy);
                if (labelEl) return labelEl.innerText;
            }
            
            // For inputs, look for associated <label>
            if (tagName === "input" || tagName === "textarea" || tagName === "select") {
                if (el.id) {
                    const label = document.querySelector(`label[for="${el.id}"]`);
                    if (label) return label.innerText;
                }
                const parentLabel = el.closest('label');
                if (parentLabel) {
                     // Get text excluding the input itself
                     let text = "";
                     parentLabel.childNodes.forEach(n => {
                         if (n.nodeType === Node.TEXT_NODE) text += n.textContent;
                     });
                     if (text.trim()) return text.trim();
                }
                
                // Fallbacks for inputs: placeholder or title, NEVER 'value' for text inputs 
                // (except type="submit" or "button" where value is the label)
                if (tagName === "input" && (el.type === "submit" || el.type === "button")) {
                    if (el.value) return el.value;
                }
                if (el.getAttribute("title")) return el.getAttribute("title");
                if (el.getAttribute("placeholder")) return el.getAttribute("placeholder");
                
                return ""; // Do not fallback to innerText or value for checkboxes, radios, texts
            }
            
            // For buttons and links, text content is the accessible name
            if (tagName === "button" || tagName === "a") {
                if (el.innerText) return el.innerText;
            }

            return "";
        };

        selectors.forEach(sel => {
            const els = mainContainer.querySelectorAll(sel);
            els.forEach(el => {
                const name = getAccessibleName(el);
                const tagName = el.tagName.toLowerCase();
                const role = el.getAttribute("role") || tagName;
                const typeAttr = el.getAttribute("type");
                
                const dedupeKey = `${role}-${name}-${sel}`;
                if (seenKeys.has(dedupeKey)) return;
                seenKeys.add(dedupeKey);

                let isNameEmpty = name === "" || name.trim().length === 0;
                let isNameUndefined = name === undefined || name === null;
                
                let status = "OK";
                let reason = "";

                // Only require accessible name for strictly interactive controls
                const requiresNameTags = ["button", "a", "input", "select", "textarea"];
                const requiresNameRoles = ["button", "link", "checkbox", "radio", "switch", "combobox", "textbox", "searchbox", "slider", "spinbutton"];
                
                // Exempt inputs like hidden, submit, reset, etc., unless submit/reset lack value
                const exemptInputTypes = ["hidden"];
                
                const requiresName = (requiresNameTags.includes(tagName) && !exemptInputTypes.includes(typeAttr)) || requiresNameRoles.includes(role);

                if (requiresName) {
                    if (isNameUndefined) {
                        status = "ARIA_ERROR";
                        reason = "Error al calcular Accessible Name";
                    } else if (isNameEmpty) {
                        status = "CONTROL_ESENCIAL_SIN_NOMBRE";
                        reason = "Falta Accessible Name (ARIA/Label)";
                    }
                }

                results.push({
                    source: "ARIA",
                    ruleId: "aria-name",
                    elementType: role, // Requested by user finding model
                    selector: sel,
                    scope: "CURRENT_STEP_ESSENTIAL", // Se actualizará en orquestador si es necesario
                    accessibleName: name,
                    valido: status === "OK",
                    status: status,
                    blocking: status !== "OK", // Preliminary, orchestrator refines causality
                    reason: reason
                });
            });
        });
        return results;
    }, expectedControls);

    return {
        evaluado: true,
        validations
    };
}
