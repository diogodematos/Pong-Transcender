// router.ts
export class Router {
  private routes: Map<string, () => void> = new Map();
  private currentRoute: string = '';

  constructor() {
      // Listen for browser navigation (back/forward buttons)
      window.addEventListener('popstate', (event) => {
          const route = event.state?.route || this.getRouteFromHash();
          this.navigateToRoute(route, false); // false = don't push to history again
      });

      // Handle initial page load
      this.handleInitialRoute();
  }

  // Register a route with its handler function
  addRoute(path: string, handler: () => void): void {
      this.routes.set(path, handler);
  }

  // Navigate to a route programmatically
  navigate(path: string): void {
      this.navigateToRoute(path, true); // true = push to browser history
  }

  // Get current route
  getCurrentRoute(): string {
      return this.currentRoute;
  }

  private navigateToRoute(path: string, pushToHistory: boolean): void {
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

  private updateBrowserHistory(path: string): void {
      const url = path === '/' ? '/' : `#${path}`;
      window.history.pushState({ route: path }, '', url);
      
      // Update document title based on route
      this.updateDocumentTitle(path);
  }

  private updateDocumentTitle(path: string): void {
      const titles: { [key: string]: string } = {
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

  private getRouteFromHash(): string {
      const hash = window.location.hash.slice(1);
      return hash || '/';
  }

  private handleInitialRoute(): void {
      // Get route from URL hash or default to '/'
      const route = this.getRouteFromHash();
      this.navigateToRoute(route, false);
  }
}

// Create global router instance
export const router = new Router();