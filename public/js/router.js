// router.ts
export class Router {
    constructor() {
        this.routes = new Map();
        this.currentRoute = '';
        // Listen for browser navigation (back/forward buttons)
        window.addEventListener('popstate', (event) => {
            var _a;
            const route = ((_a = event.state) === null || _a === void 0 ? void 0 : _a.route) || this.getRouteFromHash();
            this.navigateToRoute(route, false); // false = don't push to history again
        });
        // Handle initial page load
        this.handleInitialRoute();
    }
    // Register a route with its handler function
    addRoute(path, handler) {
        this.routes.set(path, handler);
    }
    // Navigate to a route programmatically
    navigate(path) {
        this.navigateToRoute(path, true); // true = push to browser history
    }
    // Get current route
    getCurrentRoute() {
        return this.currentRoute;
    }
    navigateToRoute(path, pushToHistory) {
        const handler = this.routes.get(path);
        if (!handler) {
            console.warn(`Route not found: ${path}`);
            // Default to login if route not found
            const loginHandler = this.routes.get('/login');
            if (loginHandler) {
                this.currentRoute = '/login';
                if (pushToHistory) {
                    this.updateBrowserHistory('/login');
                }
                loginHandler();
            }
            return;
        }
        this.currentRoute = path;
        // Update browser history if needed
        if (pushToHistory) {
            this.updateBrowserHistory(path);
        }
        // Execute the route handler
        handler();
    }
    updateBrowserHistory(path) {
        const url = path === '/' ? '/' : `#${path}`;
        window.history.pushState({ route: path }, '', url);
        // Update document title based on route
        this.updateDocumentTitle(path);
    }
    updateDocumentTitle(path) {
        const titles = {
            '/': 'Pong Game',
            '/login': 'Login - Pong Game',
            '/register': 'Register - Pong Game',
            '/profile': 'Profile - Pong Game',
            '/edit-profile': 'Edit Profile - Pong Game',
            '/game': 'Play Pong - Pong Game',
            '/dashboard': 'Dashboard - Pong Game'
        };
        document.title = titles[path] || 'Pong Game';
    }
    getRouteFromHash() {
        const hash = window.location.hash.slice(1);
        return hash || '/';
    }
    handleInitialRoute() {
        // Get route from URL hash or default to '/'
        const route = this.getRouteFromHash();
        this.navigateToRoute(route, false);
    }
}
// Create global router instance
export const router = new Router();
