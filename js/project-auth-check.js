/**
 * Project Auth Check
 * Tüm sayfalarda kullanılacak proje erişim kontrolü
 */
(function() {
    var isAuthenticated = sessionStorage.getItem('project_authenticated');
    var currentPage = window.location.pathname.split('/').pop();

    // Login sayfasındaysa kontrol yapma
    if (currentPage === 'project-login.html') return;

    // Authenticated değilse login'e yönlendir
    if (isAuthenticated !== 'true') {
        window.location.href = 'project-login.html';
    }
})();
