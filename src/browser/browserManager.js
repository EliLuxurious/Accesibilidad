import { chromium } from "playwright";

class BrowserManager {
    constructor() {
        this.browser = null;
        this.context = null;
        this.page = null;
    }

    async open(url) {
        if (!url) {
            throw new Error("URL requerida");
        }

        console.log("Browser existe:", !!this.browser);
        console.log("Context existe:", !!this.context);
        console.log("Page existe:", !!this.page);
        console.log("URL solicitada:", url);

        if (!this.browser || !this.browser.isConnected()) {
            this.browser = await chromium.launch({
                headless: false
            });
            this.context = await this.browser.newContext();
            this.page = await this.context.newPage();
        }

        if (!this.context) {
            this.context = await this.browser.newContext();
        }

        if (!this.page || this.page.isClosed()) {
            this.page = await this.context.newPage();
        }

        try {
            await this.page.goto(url, {
                waitUntil: "domcontentloaded",
                timeout: 30000
            });
        } catch (error) {
            console.error(`[BrowserManager] Navegación fallida o límite de tiempo excedido: ${error.message}`);
            // No bloqueamos todo, dejamos que el flujo continue, pero registramos el error.
        }

        return {
            url: this.page.url()
        };
    }

    async validateAuthenticatedSession() {
        if (!this.page || this.page.isClosed()) {
            this.sessionAuthenticated = false;
            return false;
        }
        
        const url = this.page.url().toLowerCase();
        
        // Señales negativas (URL)
        if (url.includes("login") || url.includes("signin") || url.includes("auth")) {
            this.sessionAuthenticated = false;
            return false;
        }

        // Señales negativas (DOM) - buscamos inputs de password o botones de login
        try {
            const isPasswordVisible = await this.page.isVisible('input[type="password"]', { timeout: 1000 });
            if (isPasswordVisible) {
                this.sessionAuthenticated = false;
                return false;
            }
            
            // Check for common login texts
            const loginTextCount = await this.page.evaluate(() => {
                const text = document.body.innerText.toLowerCase();
                return (text.includes("iniciar sesión") || text.includes("olvidaste tu contraseña")) ? 1 : 0;
            });
            
            if (loginTextCount > 0) {
                this.sessionAuthenticated = false;
                return false;
            }
            
        } catch(e) {
            // timeout or error, continue
        }

        // Si pasamos los filtros negativos, consideramos la sesión autenticada
        this.sessionAuthenticated = true;
        return true;
    }

    async saveSession(path = "data/session.json") {
        if (!this.context) throw new Error("No hay contexto abierto.");
        
        const isAuthenticated = await this.validateAuthenticatedSession();
        if (!isAuthenticated) {
            throw new Error("SESSION_NOT_AUTHENTICATED");
        }

        await this.context.storageState({ path });
        return { success: true };
    }

    getPage() {
        if (!this.page || this.page.isClosed()) {
            throw new Error(
                "No existe una página activa. Primero abra el sistema."
            );
        }
        return this.page;
    }
    
    getContext() {
        if (!this.context) {
            throw new Error(
                "No existe un contexto de navegador activo."
            );
        }
        return this.context;
    }

    async closeBrowser() {
        if (this.browser) {
            await this.browser.close();
            this.browser = null;
            this.context = null;
            this.page = null;
        }
    }
}

// Exportamos un singleton
const browserManager = new BrowserManager();
export default browserManager;
