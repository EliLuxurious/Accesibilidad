import AxeBuilder from "@axe-core/playwright";

export async function evaluateWithAxe(page) {
    try {
        const results = await new AxeBuilder({ page })
            .withTags(['wcag2a', 'wcag2aa', 'wcag21a', 'wcag21aa', 'wcag22aa'])
            .analyze();

        let critical = 0;
        let serious = 0;
        let moderate = 0;
        let minor = 0;

        const detalles = [];
        let totalRuleViolations = 0;
        let totalAffectedNodes = 0;
        
        const getScopeData = (node) => {
            const selectorString = node.target.join(", ").toLowerCase();
            const tagName = node.html ? node.html.split(" ")[0].toLowerCase() : "";
            
            const isRelated = selectorString.includes("input") || 
                              selectorString.includes("button") || 
                              selectorString.includes("select") || 
                              selectorString.includes("textarea") || 
                              selectorString.includes("form") ||
                              selectorString.includes("table") ||
                              selectorString.includes("list");
                              
            const isEssential = isRelated && (
                                node.html.includes("required") || 
                                node.html.includes('aria-required="true"') || 
                                tagName.includes("<button") || 
                                tagName.includes("<form")
                              );

            // Refined logic for scope: Ensure menus are GLOBAL, not RELATED just because they have links/buttons
            const isGlobalNav = selectorString.includes("nav") || selectorString.includes("header") || selectorString.includes("menu") || selectorString.includes("sidebar");

            return {
                scope: (isEssential && !isGlobalNav) ? "CURRENT_STEP_ESSENTIAL" : ((isRelated && !isGlobalNav) ? "TASK_RELATED" : "GLOBAL"),
            };
        };
        
        results.violations.forEach(v => {
            totalRuleViolations++;
            if (v.impact === 'critical') critical++;
            else if (v.impact === 'serious') serious++;
            else if (v.impact === 'moderate') moderate++;
            else minor++;

            v.nodes.forEach(node => {
                totalAffectedNodes++;
                const scopeData = getScopeData(node);
                
                detalles.push({
                    source: "AXE",
                    type: "violation",
                    ruleId: v.id,
                    impacto: v.impact,
                    descripcion: v.description,
                    selector: node.target.join(", "),
                    scope: scopeData.scope,
                    relevantToProfile: false, 
                    blocking: false, // Orchestrator decides
                    reason: v.help
                });
            });
        });

        results.incomplete.forEach(v => {
            v.nodes.forEach(node => {
                const scopeData = getScopeData(node);
                detalles.push({
                    source: "AXE",
                    type: "incomplete",
                    ruleId: v.id,
                    impacto: v.impact || "unknown",
                    descripcion: v.description,
                    selector: node.target.join(", "),
                    scope: scopeData.scope,
                    relevantToProfile: false,
                    blocking: false,
                    reason: v.help
                });
            });
        });

        results.passes.forEach(v => {
            detalles.push({
                source: "AXE",
                type: "pass",
                status: "OK", // Flag explícito para evidencia positiva
                ruleId: v.id,
                impacto: "none",
                descripcion: v.description,
                selector: "various",
                scope: "GLOBAL",
                relevantToProfile: false,
                blocking: false,
                reason: v.help
            });
        });

        return {
            evaluada: true,
            version: "axe-core",
            wcagTarget: "WCAG 2.2 A/AA",
            violaciones: totalRuleViolations,
            nodosAfectados: totalAffectedNodes,
            critical,
            serious,
            moderate,
            minor,
            detalles,
            raw: {
                violations: results.violations.length,
                passes: results.passes.length,
                incomplete: results.incomplete.length,
                inapplicable: results.inapplicable.length
            }
        };
    } catch (error) {
        return {
            evaluada: false,
            error: error.message
        };
    }
}
