// router.ts

interface RouteHandler {
    (params?: any): void;
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

    // Do not call handleInitialRoute() here.
    // The responsibility to initialize the route is in main.ts
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
        const {matchedRoute, params} = this.matchRouteWithParams(route);

        if (matchedRoute) {
            matchedRoute.handler(params);
        } else {
            // Handle 404 - Not Found
            console.warn(`Route not found: ${route}. Redirecting to /login.`);
            this.navigate('/login'); // Redirect to login or a 404 page
        }
    }

    private matchRouteWithParams(currentRoute: string): { matchedRoute: Route | null, params: any } {
        for (const route of this.routes) {
            const params = this.extractParams(route.path, currentRoute);
            if (params !== null) {
                return { matchedRoute: route, params };
            }
        }
        return { matchedRoute: null, params: null };
    }

    // Extract parameters from the route path
    private extractParams(routePattern: string, currentRoute: string): any | null {
        const patternParts = routePattern.split('/');
        const routeParts = currentRoute.split('/');

        if (patternParts.length !== routeParts.length) {
            return null;
        }

        const params: any = {};
        let isMatch = true;

        for (let i = 0; i < patternParts.length; i++) {
            const patternPart = patternParts[i];
            const routePart = routeParts[i];

            if (patternPart.startsWith(':')) {
                // It's a parameter (ex: :id)
                const paramName = patternPart.substring(1);
                params[paramName] = routePart;
            } else if (patternPart !== routePart) {
                // Fixed parts must be equal
                isMatch = false;
                break;
            }
        }

        return isMatch ? params : null;
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