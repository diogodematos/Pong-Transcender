// router.ts

interface RouteHandler {
    (): void;
}

interface Route {
    path: string;
    handler: RouteHandler;
}

class Router {
    private routes: Route[] = [];

    constructor() {
        // Listen for hash changes
        window.addEventListener('hashchange', () => {
            this.handleRouteChange();
        });

        // Não chame handleInitialRoute() aqui.
        // A responsabilidade de inicializar a rota é do main.ts
    }

    // Register a route with its handler function
    public addRoute(path: string, handler: RouteHandler): void {
        this.routes.push({ path, handler });
    }

    // Navigate to a specific route
    public navigate(path: string, pushState: boolean = true): void {
        if (pushState) {
            window.location.hash = path;
        } else {
            // If not pushing state, just handle the change directly
            this.navigateToRoute(path, false);
        }
    }

    // Handles the route change (when hash changes or on initial load)
    private handleRouteChange(): void {
        const route = this.getRouteFromHash();
        this.navigateToRoute(route, false);
    }

    // Internal function to navigate to a route without modifying history
    private navigateToRoute(route: string, isInitialLoad: boolean): void {
        const foundRoute = this.routes.find(r => r.path === route);

        if (foundRoute) {
            foundRoute.handler();
        } else {
            // Handle 404 - Not Found
            console.warn(`Route not found: ${route}. Redirecting to /login.`);
            this.navigate('/login'); // Redirect to login or a 404 page
        }
    }

    // Get the current route from URL hash
    private getRouteFromHash(): string {
        const hash = window.location.hash.substring(1); // Remove '#'
        return hash || '/'; // Default to '/' if hash is empty
    }

    // IMPORTANT: This method is called explicitly from main.ts
    // It must be public to be accessible.
    public handleInitialRoute(): void {
        const route = this.getRouteFromHash();
        this.navigateToRoute(route, false);
    }
}

// Create and export a single instance of the Router
export const router = new Router();