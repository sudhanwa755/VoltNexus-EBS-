/**
 * Shared Sidebar Logic
 * Handles mobile sidebar toggling and closing.
 */

export const Sidebar = {
    init() {
        // Elements
        const mobileMenuBtn = document.getElementById('mobileMenuBtn');
        const sidebar = document.getElementById('sidebar');
        const sidebarOverlay = document.getElementById('sidebarOverlay');
        const sidebarCloseBtn = document.getElementById('sidebarCloseBtn');

        // Determine the hidden class (check for left or right positioning)
        // Default to -translate-x-full (left) if neither is found initially, 
        // but typically the HTML should have one of them.
        let hiddenClass = '-translate-x-full';
        if (sidebar) {
            if (sidebar.classList.contains('translate-x-full')) {
                hiddenClass = 'translate-x-full';
            } else if (sidebar.classList.contains('-translate-x-full')) {
                hiddenClass = '-translate-x-full';
            }
        }

        // Functions
        const openSidebar = () => {
            if (sidebar) sidebar.classList.remove(hiddenClass);
            if (sidebarOverlay) {
                sidebarOverlay.classList.remove('hidden');
                // Force a reflow
                void sidebarOverlay.offsetWidth;
            }
            document.body.style.overflow = 'hidden';
        };

        const closeSidebar = () => {
            if (sidebar) sidebar.classList.add(hiddenClass);
            if (sidebarOverlay) sidebarOverlay.classList.add('hidden');
            document.body.style.overflow = '';
        };

        const toggleSidebar = () => {
            if (!sidebar) return;
            const isClosed = sidebar.classList.contains(hiddenClass);
            if (isClosed) {
                openSidebar();
            } else {
                closeSidebar();
            }
        };

        // Event Listeners
        if (mobileMenuBtn) {
            mobileMenuBtn.addEventListener('click', (e) => {
                e.preventDefault();
                toggleSidebar();
            });
        }

        if (sidebarOverlay) {
            sidebarOverlay.addEventListener('click', closeSidebar);
        }

        if (sidebarCloseBtn) {
            sidebarCloseBtn.addEventListener('click', closeSidebar);
        }

        // Close sidebar on escape key
        document.addEventListener('keydown', (e) => {
            if (e.key === 'Escape') {
                closeSidebar();
            }
        });

        // Close sidebar when clicking a link (optional, good for single-page feeling)
        if (sidebar) {
            const links = sidebar.querySelectorAll('a');
            links.forEach(link => {
                link.addEventListener('click', () => {
                    // Only close if we are in mobile view (screen width < 1024px)
                    if (window.innerWidth < 1024) {
                        closeSidebar();
                    }
                });
            });
        }

        console.log('Sidebar logic initialized');
    }
};
