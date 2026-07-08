/**
 * discovery.js — 端点清单
 *
 * 由于 Swagger 未启用 JSON 端点 (/api/docs 返回 HTML 不暴露 paths), 用静态 inventory
 * 来自 backend/src scan (验证: 42 controllers, 197 endpoints)
 *
 * 端点结构: { method, path, module, auth: 'public'|'jwt'|'admin', needBody: bool }
 */

const ENDPOINTS = [
  // ===== UploadController =====
  { method: 'POST',   path: '/upload/image',                  module: 'upload',        auth: 'jwt' },
  // ===== HouseController =====
  { method: 'GET',    path: '/houses',                        module: 'houses',        auth: 'public' },
  { method: 'POST',   path: '/posts/:id/house',               module: 'houses',        auth: 'jwt', needBody: true },
  { method: 'PATCH',  path: '/posts/:id/house',               module: 'houses',        auth: 'jwt', needBody: true },
  { method: 'DELETE', path: '/posts/:id/house',               module: 'houses',        auth: 'jwt' },
  // ===== SecondhandController =====
  { method: 'GET',    path: '/secondhands',                   module: 'secondhands',   auth: 'public' },
  { method: 'POST',   path: '/posts/:id/secondhand',          module: 'secondhands',   auth: 'jwt', needBody: true },
  { method: 'PATCH',  path: '/posts/:id/secondhand',          module: 'secondhands',   auth: 'jwt', needBody: true },
  { method: 'DELETE', path: '/posts/:id/secondhand',          module: 'secondhands',   auth: 'jwt' },
  // ===== LifebizController =====
  { method: 'GET',    path: '/lifebizs',                      module: 'lifebizs',      auth: 'public' },
  { method: 'POST',   path: '/posts/:id/lifebiz',             module: 'lifebizs',      auth: 'jwt', needBody: true },
  { method: 'PATCH',  path: '/posts/:id/lifebiz',             module: 'lifebizs',      auth: 'jwt', needBody: true },
  { method: 'DELETE', path: '/posts/:id/lifebiz',             module: 'lifebizs',      auth: 'jwt' },
  // ===== JobController =====
  { method: 'GET',    path: '/jobs',                          module: 'jobs',          auth: 'public' },
  { method: 'POST',   path: '/posts/:id/job',                 module: 'jobs',          auth: 'jwt', needBody: true },
  { method: 'PATCH',  path: '/posts/:id/job',                 module: 'jobs',          auth: 'jwt', needBody: true },
  { method: 'DELETE', path: '/posts/:id/job',                 module: 'jobs',          auth: 'jwt' },
  // ===== SearchController =====
  { method: 'GET',    path: '/search',                        module: 'search',        auth: 'public' },
  { method: 'GET',    path: '/search/hot',                    module: 'search',        auth: 'public' },
  // ===== HealthController =====
  { method: 'GET',    path: '/health',                        module: 'health',        auth: 'public' },
  // ===== AreaController =====
  { method: 'GET',    path: '/areas',                         module: 'areas',         auth: 'public' },
  { method: 'GET',    path: '/areas/count',                   module: 'areas',         auth: 'public' },
  { method: 'GET',    path: '/areas/:id',                     module: 'areas',         auth: 'public' },
  // ===== FavoriteController =====
  { method: 'GET',    path: '/favorites',                     module: 'favorites',     auth: 'jwt' },
  { method: 'GET',    path: '/favorites/count',               module: 'favorites',     auth: 'jwt' },
  { method: 'POST',   path: '/favorites',                     module: 'favorites',     auth: 'jwt', needBody: true },
  { method: 'DELETE', path: '/favorites/:postId',             module: 'favorites',     auth: 'jwt' },
  // ===== CommentController =====
  { method: 'GET',    path: '/posts/:postId/comments',        module: 'comments',      auth: 'public' },
  { method: 'POST',   path: '/posts/:postId/comments',        module: 'comments',      auth: 'jwt', needBody: true },
  { method: 'DELETE', path: '/comments/:id',                  module: 'comments',      auth: 'jwt' },
  // ===== AiController =====
  { method: 'POST',   path: '/ai/draft/extract',              module: 'ai',            auth: 'jwt', needBody: true },
  { method: 'POST',   path: '/ai/draft/suggest-title',         module: 'ai',            auth: 'jwt', needBody: true },
  { method: 'POST',   path: '/ai/draft/score',                 module: 'ai',            auth: 'jwt', needBody: true },
  { method: 'POST',   path: '/ai/draft/rewrite',               module: 'ai',            auth: 'jwt', needBody: true },
  { method: 'GET',    path: '/ai/health',                     module: 'ai',            auth: 'public' },
  // ===== PostBoostController =====
  { method: 'POST',   path: '/posts/:id/boost',               module: 'posts-boost',   auth: 'jwt', needBody: true },
  // ===== PostController =====
  { method: 'POST',   path: '/posts',                         module: 'posts',         auth: 'jwt', needBody: true },
  { method: 'GET',    path: '/posts',                         module: 'posts',         auth: 'public' },
  { method: 'GET',    path: '/posts/count',                   module: 'posts',         auth: 'public' },
  { method: 'GET',    path: '/posts/me',                      module: 'posts',         auth: 'jwt' },
  { method: 'GET',    path: '/posts/:id/contact',             module: 'posts',         auth: 'jwt' },
  { method: 'GET',    path: '/posts/:id/breadcrumb',          module: 'posts',         auth: 'public' },
  { method: 'GET',    path: '/posts/:id/related',             module: 'posts',         auth: 'public' },
  { method: 'GET',    path: '/posts/sitemap-data',            module: 'posts',         auth: 'public' },
  { method: 'GET',    path: '/posts/:id',                     module: 'posts',         auth: 'public' },
  { method: 'PATCH',  path: '/posts/:id',                     module: 'posts',         auth: 'jwt', needBody: true },
  { method: 'POST',   path: '/posts/:id/status',              module: 'posts',         auth: 'jwt', needBody: true },
  { method: 'DELETE', path: '/posts/:id',                     module: 'posts',         auth: 'jwt' },
  // ===== AuthController =====
  { method: 'POST',   path: '/auth/sms-code',                 module: 'auth',          auth: 'public', needBody: true },
  { method: 'POST',   path: '/auth/login-sms',                module: 'auth',          auth: 'public', needBody: true },
  { method: 'POST',   path: '/auth/login-password',           module: 'auth',          auth: 'public', needBody: true },
  { method: 'POST',   path: '/auth/refresh',                  module: 'auth',          auth: 'public', needBody: true },
  { method: 'POST',   path: '/auth/logout',                   module: 'auth',          auth: 'jwt', needBody: false },
  { method: 'GET',    path: '/auth/me',                       module: 'auth',          auth: 'jwt' },
  // ===== UserController =====
  { method: 'POST',   path: '/users',                         module: 'users',         auth: 'admin', needBody: true },
  { method: 'GET',    path: '/users',                         module: 'users',         auth: 'public' },
  { method: 'GET',    path: '/users/count',                   module: 'users',         auth: 'public' },
  { method: 'GET',    path: '/users/me',                      module: 'users',         auth: 'jwt' },
  { method: 'GET',    path: '/users/:id',                     module: 'users',         auth: 'public' },
  { method: 'PATCH',  path: '/users/:id',                     module: 'users',         auth: 'jwt', needBody: true },
  { method: 'DELETE', path: '/users/:id',                     module: 'users',         auth: 'admin' },
  // ===== CategoryController =====
  { method: 'POST',   path: '/categories',                    module: 'categories',    auth: 'admin', needBody: true },
  { method: 'GET',    path: '/categories',                    module: 'categories',    auth: 'public' },
  { method: 'GET',    path: '/categories/tree',               module: 'categories',    auth: 'public' },
  { method: 'GET',    path: '/categories/count',              module: 'categories',    auth: 'public' },
  { method: 'GET',    path: '/categories/:id',                module: 'categories',    auth: 'public' },
  { method: 'PATCH',  path: '/categories/:id',                module: 'categories',    auth: 'admin', needBody: true },
  { method: 'DELETE', path: '/categories/:id',                module: 'categories',    auth: 'admin' },
  // ===== AnnouncementController =====
  { method: 'GET',    path: '/announcements/active',          module: 'announcements', auth: 'public' },
  { method: 'GET',    path: '/announcements',                 module: 'announcements', auth: 'public' },
  { method: 'GET',    path: '/announcements/:id',             module: 'announcements', auth: 'public' },
  // ===== AgreementController =====
  { method: 'GET',    path: '/agreements',                    module: 'agreements',    auth: 'public' },
  { method: 'GET',    path: '/agreements/:key',               module: 'agreements',    auth: 'public' },
  // ===== BannerController =====
  { method: 'GET',    path: '/banners/active',                module: 'banners',       auth: 'public' },
  // ===== TagController =====
  { method: 'GET',    path: '/tags',                          module: 'tags',          auth: 'public' },
  { method: 'GET',    path: '/tags/hot',                      module: 'tags',          auth: 'public' },
  { method: 'GET',    path: '/tags/:slug',                    module: 'tags',          auth: 'public' },
  { method: 'GET',    path: '/tags/:slug/posts',              module: 'tags',          auth: 'public' },
  // ===== SeoController (公开) =====
  { method: 'GET',    path: '/seo/sitemap-full',              module: 'seo',           auth: 'public' },
  { method: 'GET',    path: '/sitemap.xml',                   module: 'seo',           auth: 'public' },
  { method: 'GET',    path: '/seo/categories/:slug',          module: 'seo',           auth: 'public' },
  { method: 'GET',    path: '/seo/areas/:slug',               module: 'seo',           auth: 'public' },
  { method: 'GET',    path: '/seo/tdk',                       module: 'seo',           auth: 'public' },
  // ===== NotificationController =====
  { method: 'GET',    path: '/notifications/me',              module: 'notifications', auth: 'jwt' },
  { method: 'GET',    path: '/notifications/unread-count',    module: 'notifications', auth: 'jwt' },
  { method: 'POST',   path: '/notifications/:id/read',        module: 'notifications', auth: 'jwt' },
  { method: 'POST',   path: '/notifications/read-all',        module: 'notifications', auth: 'jwt' },
  { method: 'DELETE', path: '/notifications/:id',             module: 'notifications', auth: 'jwt' },
  { method: 'GET',    path: '/notifications/settings',        module: 'notifications', auth: 'jwt' },
  { method: 'PUT',    path: '/notifications/settings/:event', module: 'notifications', auth: 'jwt', needBody: true },
  { method: 'POST',   path: '/devices/register',               module: 'notifications', auth: 'jwt', needBody: true },
  { method: 'DELETE', path: '/devices/:token',                 module: 'notifications', auth: 'jwt' },
  // ===== ApplicationController =====
  { method: 'GET',    path: '/applications/me',               module: 'applications',  auth: 'jwt' },
  { method: 'GET',    path: '/applications/post-job/:id',     module: 'applications',  auth: 'jwt' },
  { method: 'POST',   path: '/applications',                  module: 'applications',  auth: 'jwt', needBody: true },
  { method: 'PATCH',  path: '/applications/:id/status',       module: 'applications',  auth: 'jwt', needBody: true },
  // ===== MessageController =====
  { method: 'POST',   path: '/messages',                      module: 'messages',      auth: 'jwt', needBody: true },
  { method: 'GET',    path: '/messages/inbox',                module: 'messages',      auth: 'jwt' },
  { method: 'GET',    path: '/messages/outbox',               module: 'messages',      auth: 'jwt' },
  { method: 'GET',    path: '/messages/with/:userId',         module: 'messages',      auth: 'jwt' },
  { method: 'GET',    path: '/messages/unread-count',         module: 'messages',      auth: 'jwt' },
  { method: 'POST',   path: '/messages/read-all',             module: 'messages',      auth: 'jwt' },
  { method: 'POST',   path: '/messages/:id/read',             module: 'messages',      auth: 'jwt' },
  { method: 'POST',   path: '/messages/:id/recall',           module: 'messages',      auth: 'jwt' },
  { method: 'DELETE', path: '/messages/:id',                  module: 'messages',      auth: 'jwt' },
  // ===== ReportController =====
  { method: 'POST',   path: '/reports',                       module: 'reports',       auth: 'jwt', needBody: true },
  { method: 'GET',    path: '/reports',                       module: 'reports',       auth: 'jwt' },
  { method: 'GET',    path: '/reports/reasons',               module: 'reports',       auth: 'public' },
  { method: 'GET',    path: '/reports/:id',                   module: 'reports',       auth: 'jwt' },
  { method: 'DELETE', path: '/reports/:id',                   module: 'reports',       auth: 'jwt' },
  // ===== CompanyController =====
  { method: 'GET',    path: '/companies',                     module: 'companies',     auth: 'public' },
  { method: 'GET',    path: '/companies/:id',                 module: 'companies',     auth: 'public' },
  { method: 'GET',    path: '/companies/:id/jobs',            module: 'companies',     auth: 'public' },
  { method: 'POST',   path: '/companies',                     module: 'companies',     auth: 'jwt', needBody: true },
  { method: 'PATCH',  path: '/companies/:id',                 module: 'companies',     auth: 'jwt', needBody: true },
  { method: 'DELETE', path: '/companies/:id',                 module: 'companies',     auth: 'jwt' },
  { method: 'POST',   path: '/companies/:id/restore',         module: 'companies',     auth: 'jwt' },
  // ===== ResumeController =====
  { method: 'GET',    path: '/resumes',                       module: 'resumes',       auth: 'public' },
  { method: 'GET',    path: '/resumes/me',                    module: 'resumes',       auth: 'jwt' },
  { method: 'PUT',    path: '/resumes/me',                    module: 'resumes',       auth: 'jwt', needBody: true },
  { method: 'DELETE', path: '/resumes/me',                    module: 'resumes',       auth: 'jwt' },
  { method: 'POST',   path: '/resumes/me/restore',            module: 'resumes',       auth: 'jwt' },
  { method: 'GET',    path: '/resumes/:id',                   module: 'resumes',       auth: 'public' },
  // ===== AdminPermissionController =====
  { method: 'GET',    path: '/admin/permissions',             module: 'admin',         auth: 'admin' },
  { method: 'GET',    path: '/admin/permissions/modules',     module: 'admin',         auth: 'admin' },
  // ===== AdminRoleController =====
  { method: 'GET',    path: '/admin/roles',                   module: 'admin',         auth: 'admin' },
  { method: 'GET',    path: '/admin/roles/:id',               module: 'admin',         auth: 'admin' },
  { method: 'POST',   path: '/admin/roles',                   module: 'admin',         auth: 'admin', needBody: true },
  { method: 'PATCH',  path: '/admin/roles/:id',               module: 'admin',         auth: 'admin', needBody: true },
  { method: 'DELETE', path: '/admin/roles/:id',               module: 'admin',         auth: 'admin' },
  { method: 'GET',    path: '/admin/roles/:id/permissions',   module: 'admin',         auth: 'admin' },
  { method: 'PUT',    path: '/admin/roles/:id/permissions',   module: 'admin',         auth: 'admin', needBody: true },
  // ===== AiUsageController =====
  { method: 'GET',    path: '/admin/ai-usage/stats',          module: 'admin',         auth: 'admin' },
  // ===== AdminCategoryController =====
  { method: 'GET',    path: '/admin/categories',              module: 'admin',         auth: 'admin' },
  { method: 'GET',    path: '/admin/categories/tree',         module: 'admin',         auth: 'admin' },
  { method: 'POST',   path: '/admin/categories',              module: 'admin',         auth: 'admin', needBody: true },
  { method: 'PATCH',  path: '/admin/categories/:id',          module: 'admin',         auth: 'admin', needBody: true },
  { method: 'DELETE', path: '/admin/categories/:id',          module: 'admin',         auth: 'admin' },
  // ===== AdminDashboardController =====
  { method: 'GET',    path: '/admin/dashboard',               module: 'admin',         auth: 'admin' },
  // ===== AdminPostController =====
  { method: 'GET',    path: '/admin/posts',                   module: 'admin',         auth: 'admin' },
  { method: 'POST',   path: '/admin/posts/:id/audit',         module: 'admin',         auth: 'admin', needBody: true },
  { method: 'POST',   path: '/admin/posts/:id/offline',       module: 'admin',         auth: 'admin', needBody: true },
  { method: 'POST',   path: '/admin/posts/audit-batch',       module: 'admin',         auth: 'admin', needBody: true },
  { method: 'POST',   path: '/admin/posts/offline-batch',     module: 'admin',         auth: 'admin', needBody: true },
  { method: 'POST',   path: '/admin/posts/purge',             module: 'admin',         auth: 'admin', needBody: true },
  { method: 'POST',   path: '/admin/posts/:id/restore',       module: 'admin',         auth: 'admin' },
  // ===== AdminReportController =====
  { method: 'GET',    path: '/admin/reports',                 module: 'admin',         auth: 'admin' },
  { method: 'POST',   path: '/admin/reports/:id/handle',      module: 'admin',         auth: 'admin', needBody: true },
  // ===== AdminUserController =====
  { method: 'GET',    path: '/admin/users',                   module: 'admin',         auth: 'admin' },
  { method: 'POST',   path: '/admin/users/:id/ban',           module: 'admin',         auth: 'admin', needBody: true },
  { method: 'POST',   path: '/admin/users/:id/unban',         module: 'admin',         auth: 'admin' },
  { method: 'GET',    path: '/admin/users/:id/roles',         module: 'admin',         auth: 'admin' },
  { method: 'POST',   path: '/admin/users/:id/roles',         module: 'admin',         auth: 'admin', needBody: true },
  { method: 'DELETE', path: '/admin/users/:id/roles/:roleId', module: 'admin',         auth: 'admin' },
  // ===== AdminAuditLogController =====
  { method: 'GET',    path: '/admin/audit-logs',              module: 'admin',         auth: 'admin' },
  { method: 'GET',    path: '/admin/audit-logs/options',      module: 'admin',         auth: 'admin' },
  { method: 'GET',    path: '/admin/audit-logs/export',       module: 'admin',         auth: 'admin' },
  { method: 'GET',    path: '/admin/audit-logs/:id',          module: 'admin',         auth: 'admin' },
  // ===== AdminLoginLogController =====
  { method: 'GET',    path: '/admin/login-logs',              module: 'admin',         auth: 'admin' },
  { method: 'GET',    path: '/admin/login-logs/options',      module: 'admin',         auth: 'admin' },
  { method: 'GET',    path: '/admin/login-logs/abnormal-ips', module: 'admin',         auth: 'admin' },
  { method: 'GET',    path: '/admin/login-logs/export',       module: 'admin',         auth: 'admin' },
  { method: 'GET',    path: '/admin/login-logs/:id',          module: 'admin',         auth: 'admin' },
  // ===== AdminNotificationTemplateController =====
  { method: 'GET',    path: '/admin/notifications/templates', module: 'admin',         auth: 'admin' },
  { method: 'GET',    path: '/admin/notifications/templates/:id', module: 'admin',    auth: 'admin' },
  { method: 'POST',   path: '/admin/notifications/templates', module: 'admin',         auth: 'admin', needBody: true },
  { method: 'PATCH',  path: '/admin/notifications/templates/:id', module: 'admin',    auth: 'admin', needBody: true },
  { method: 'DELETE', path: '/admin/notifications/templates/:id', module: 'admin',    auth: 'admin' },
  { method: 'POST',   path: '/admin/notifications/templates/:id/toggle', module: 'admin', auth: 'admin' },
  { method: 'POST',   path: '/admin/notifications/templates/:id/preview', module: 'admin', auth: 'admin', needBody: true },
  { method: 'POST',   path: '/admin/notifications/broadcast', module: 'admin',         auth: 'admin', needBody: true },
  // ===== AdminAnnouncementController =====
  { method: 'GET',    path: '/admin/announcements',           module: 'admin',         auth: 'admin' },
  { method: 'POST',   path: '/admin/announcements',           module: 'admin',         auth: 'admin', needBody: true },
  { method: 'PATCH',  path: '/admin/announcements/:id',       module: 'admin',         auth: 'admin', needBody: true },
  { method: 'DELETE', path: '/admin/announcements/:id',       module: 'admin',         auth: 'admin' },
  { method: 'POST',   path: '/admin/announcements/:id/restore', module: 'admin',       auth: 'admin' },
  // ===== AdminBannerController =====
  { method: 'GET',    path: '/admin/banners',                 module: 'admin',         auth: 'admin' },
  { method: 'POST',   path: '/admin/banners',                 module: 'admin',         auth: 'admin', needBody: true },
  { method: 'PATCH',  path: '/admin/banners/:id',             module: 'admin',         auth: 'admin', needBody: true },
  { method: 'DELETE', path: '/admin/banners/:id',             module: 'admin',         auth: 'admin' },
  { method: 'POST',   path: '/admin/banners/:id/restore',     module: 'admin',         auth: 'admin' },
  // ===== AdminCompanyController =====
  { method: 'GET',    path: '/admin/companies',               module: 'admin',         auth: 'admin' },
  { method: 'GET',    path: '/admin/companies/:id',           module: 'admin',         auth: 'admin' },
  { method: 'POST',   path: '/admin/companies/:id/verify',    module: 'admin',         auth: 'admin', needBody: true },
  { method: 'POST',   path: '/admin/companies/:id/unverify',  module: 'admin',         auth: 'admin', needBody: true },
  { method: 'DELETE', path: '/admin/companies/:id',           module: 'admin',         auth: 'admin' },
  { method: 'POST',   path: '/admin/companies/:id/restore',   module: 'admin',         auth: 'admin' },
  // ===== AdminTagController =====
  { method: 'GET',    path: '/admin/tags',                    module: 'admin',         auth: 'admin' },
  { method: 'POST',   path: '/admin/tags',                    module: 'admin',         auth: 'admin', needBody: true },
  { method: 'PATCH',  path: '/admin/tags/:id',                module: 'admin',         auth: 'admin', needBody: true },
  { method: 'DELETE', path: '/admin/tags/:id',                module: 'admin',         auth: 'admin' },
  { method: 'POST',   path: '/admin/tags/:id/merge',          module: 'admin',         auth: 'admin', needBody: true },
  { method: 'POST',   path: '/admin/tags/migrate-from-json',  module: 'admin',         auth: 'admin', needBody: true },
  // ===== AdminSeoController =====
  { method: 'POST',   path: '/admin/ai/regenerate-seo/:postId', module: 'admin',       auth: 'admin' },
  { method: 'POST',   path: '/admin/ai/regenerate-seo-batch', module: 'admin',         auth: 'admin', needBody: true },
  { method: 'POST',   path: '/admin/seo/push-baidu',         module: 'admin',         auth: 'admin', needBody: true },
];

/**
 * 替换 :id / :postId / :userId / :roleId 等路径参数为真实值 (随机大整数)
 */
function substitutePathParams(path, sample = { id: 999999999, postId: 999999999, postJobId: 999999999, userId: 999999999, roleId: 999999999, slug: 'house', key: 'terms', event: 'system', token: 'fake-device-token', eventKey: 'comment', postIdValue: '999999999' }) {
  return path
    .replace(/:id\b/g, sample.id)
    .replace(/:postId\b/g, sample.postId)
    .replace(/:postJobId\b/g, sample.postJobId)
    .replace(/:userId\b/g, sample.userId)
    .replace(/:roleId\b/g, sample.roleId)
    .replace(/:slug\b/g, sample.slug)
    .replace(/:key\b/g, sample.key)
    .replace(/:event\b/g, sample.event)
    .replace(/:token\b/g, sample.token)
    .replace(/:postJobIdValue\b/g, '999999999');
}

function getEndpointsByAuth(authType) {
  return ENDPOINTS.filter((e) => e.auth === authType);
}

function getAllEndpoints() {
  return ENDPOINTS;
}

module.exports = { ENDPOINTS, getAllEndpoints, getEndpointsByAuth, substitutePathParams };
