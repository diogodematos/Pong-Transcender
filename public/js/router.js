export const router = {
    routes: new Map(),
    addRoute(path, callback) {
        console.log(`Adding route: ${path}`); // Debug log
        this.routes.set(path, callback);
    },
    navigate(path) {
        var _a;
        console.log(`Navigating to: ${path}`); // Debug log
        const pathWithoutHash = path.startsWith('#') ? path.slice(1) : path;
        const match = Array.from(this.routes.keys()).find(key => {
            const regex = new RegExp('^' + key.replace(/:([^/]+)/g, '(?<$1>[^/]+)') + '$');
            return regex.test(pathWithoutHash);
        });
        if (match) {
            const regex = new RegExp('^' + match.replace(/:([^/]+)/g, '(?<$1>[^/]+)') + '$');
            const result = pathWithoutHash.match(regex);
            const params = (result === null || result === void 0 ? void 0 : result.groups) || {};
            console.log('Route params:', params); // Debug log
            this.routes.get(match)(params);
        }
        else {
            console.warn(`No route found for: ${pathWithoutHash}`); // Debug log
            (_a = this.routes.get('/')) === null || _a === void 0 ? void 0 : _a();
        }
    },
    getCurrentRoute() {
        const path = window.location.hash.slice(1) || '/';
        console.log('Current route:', path); // Debug log
        return path;
    },
    navigateToRoute(path, pushState = true) {
        console.log(`Navigating to route: ${path}, pushState: ${pushState}`); // Debug log
        if (pushState) {
            window.history.pushState({}, '', '#' + path);
        }
        this.navigate(path);
    }
};
// Handle browser navigation (back/forward)
window.addEventListener('popstate', () => {
    console.log('Popstate event triggered'); // Debug log
    router.navigate(window.location.hash);
});
