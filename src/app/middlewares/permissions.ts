/*
    route: {
        method: {
            allowed_roles:  new Set(['artiste', 'admin', 'superadmin', 'other', 'all', 'guest'])
        }
    }
*/


type RoutePermissions = {
    [route: string]: {
        [method: string]: {
            allowed_roles: Set<string>;
        };
    };
}

const base_url = ''
// Add base url to the route, currently base url is empty, so the route is just the path

const accounting_permissions:RoutePermissions = {
    // Accounting routes
    '/accounting/:id/stats': {
        GET: {
            allowed_roles: new Set(['artiste', 'admin', 'superadmin', 'other', 'all', 'guest']),
        },
        POST: {
            allowed_roles: new Set(['artiste', 'admin', 'superadmin', 'other', 'all', 'guest']),
        },
    },
}

const artist_permissions:RoutePermissions = {
    // Artist routes
    '/artist': {
        GET: {
            allowed_roles: new Set(['artiste', 'admin', 'superadmin', 'other', 'all', 'guest']),
        },
        POST: {
            allowed_roles: new Set(['artiste', 'admin', 'superadmin', 'other', 'all', 'guest']),
        },
    },
    '/artist/bulksplit': {
        POST: {
            allowed_roles: new Set(['artiste', 'admin', 'superadmin', 'other', 'all', 'guest']),
        },
    },
    '/artist/bulk': {
        POST: {
            allowed_roles: new Set(['artiste', 'admin', 'superadmin', 'other', 'all', 'guest']),
        },
    },
    '/artist/:id': {
        GET: {
            allowed_roles: new Set(['artiste', 'admin', 'superadmin', 'other', 'all', 'guest']),
        },
        PUT: {
            allowed_roles: new Set(['artiste', 'admin', 'superadmin', 'other', 'all', 'guest']),
        },
        DELETE: {
            allowed_roles: new Set(['artiste', 'admin', 'superadmin', 'other', 'all', 'guest']),
        },
    },
    '/artist/:id/products': {
        GET: {
            allowed_roles: new Set(['artiste', 'admin', 'superadmin', 'other', 'all', 'guest']),
        },
    },
    '/artist/:id/assets': {
        GET: {
            allowed_roles: new Set(['artiste', 'admin', 'superadmin', 'other', 'all', 'guest']),
        },
    },
    '/artist/:id/stats': {
        GET: {
            allowed_roles: new Set(['artiste', 'admin', 'superadmin', 'other', 'all', 'guest']),
        },
    }, 
}

const auth_permissions:RoutePermissions = {
    // Auth routes
    '/auth/login': {
        POST: {
            allowed_roles: new Set(['artiste', 'admin', 'superadmin', 'other', 'all', 'guest']),
        },
    },
    '/auth/signup': {
        POST: {
            allowed_roles: new Set(['artiste', 'admin', 'superadmin', 'other', 'all', 'guest']),
        },
    },
    '/auth/verify': {
        POST: {
            allowed_roles: new Set(['artiste', 'admin', 'superadmin', 'other', 'all', 'guest']),
        },
    },
    '/auth/forgotpassword': {
        POST: {
            allowed_roles: new Set(['artiste', 'admin', 'superadmin', 'other', 'all', 'guest']),
        },
    },
    '/auth/passwordreset': {
        PATCH: {
            allowed_roles: new Set(['artiste', 'admin', 'superadmin', 'other', 'all', 'guest']),
        },
    },
}

const assets_permissions:RoutePermissions = {
    // Asset routes
    '/asset': {
        GET: {
            allowed_roles: new Set(['artiste', 'admin', 'superadmin', 'other', 'all', 'guest']),
        },
        POST: {
            allowed_roles: new Set(['artiste', 'admin', 'superadmin', 'other', 'all', 'guest']),
        },
    },
    '/asset/bulk': {
        POST: {
            allowed_roles: new Set(['artiste', 'admin', 'superadmin', 'other', 'all', 'guest']),
        },
    },
    '/asset/bulksplits': {
        POST: {
            allowed_roles: new Set(['artiste', 'admin', 'superadmin', 'other', 'all', 'guest']),
        },
    },
    '/asset/:id': {
        GET: {
            allowed_roles: new Set(['artiste', 'admin', 'superadmin', 'other', 'all', 'guest']),
        },
        PUT: {
            allowed_roles: new Set(['artiste', 'admin', 'superadmin', 'other', 'all', 'guest']),
        },
        DELETE: {
            allowed_roles: new Set(['artiste', 'admin', 'superadmin', 'other', 'all', 'guest']),
        },
    },
    '/asset/:id/artists': {
        PUT: {
            allowed_roles: new Set(['artiste', 'admin', 'superadmin', 'other', 'all', 'guest']),
        },
    },
    '/asset/:id/stats': {
        GET: {
            allowed_roles: new Set(['artiste', 'admin', 'superadmin', 'other', 'all', 'guest']),
        },
    },
    '/asset/:id/setdefaultsplit': {
        PUT: {
            allowed_roles: new Set(['artiste', 'admin', 'superadmin', 'other', 'all', 'guest']),
        },
    },
}

const checklist_permissions:RoutePermissions = {
    // Checklist routes
    '/checklist/royaltyassets': {
        GET: {
            allowed_roles: new Set(['artiste', 'admin', 'superadmin', 'other', 'all', 'guest']),
        },
    },
    '/checklist/royaltyproducts': {
        GET: {
            allowed_roles: new Set(['artiste', 'admin', 'superadmin', 'other', 'all', 'guest']),
        },
    },
    '/checklist/assetsplits': {
        GET: {
            allowed_roles: new Set(['artiste', 'admin', 'superadmin', 'other', 'all', 'guest']),
        },
    },
    '/checklist/productsplits': {
        GET: {
            allowed_roles: new Set(['artiste', 'admin', 'superadmin', 'other', 'all', 'guest']),
        },
    },
    '/checklist/allsplits': {
        GET: {
            allowed_roles: new Set(['artiste', 'admin', 'superadmin', 'other', 'all', 'guest']),
        },
    },
}

const expense_permissions:RoutePermissions = {
    // Expense routes
    '/expense': {
        GET: {
            allowed_roles: new Set(['artiste', 'admin', 'superadmin', 'other', 'all', 'guest']),
        },
        POST: {
            allowed_roles: new Set(['artiste', 'admin', 'superadmin', 'other', 'all', 'guest']),
        },
    },
    '/expense/:id': {
        GET: {
            allowed_roles: new Set(['artiste', 'admin', 'superadmin', 'other', 'all', 'guest']),
        },
        PUT: {
            allowed_roles: new Set(['artiste', 'admin', 'superadmin', 'other', 'all', 'guest']),
        },
        DELETE: {
            allowed_roles: new Set(['artiste', 'admin', 'superadmin', 'other', 'all', 'guest']),
        },
    },
    '/expense/bulk': {
        POST: {
            allowed_roles: new Set(['artiste', 'admin', 'superadmin', 'other', 'all', 'guest']),
        },
    },
}

const godmin_permissions:RoutePermissions = {
    // Godmin routes
    '/godmin/file/royalty/decompress/:tenant/:id': {
        PUT: {
            allowed_roles: new Set(['artiste', 'admin', 'superadmin', 'other', 'all', 'guest']),
        },
    },
    '/godmin/tenant': {
        GET: {
            allowed_roles: new Set(['artiste', 'admin', 'superadmin', 'other', 'all', 'guest']),
        },
    },
    '/godmin/asset': {
        GET: {
            allowed_roles: new Set(['artiste', 'admin', 'superadmin', 'other', 'all', 'guest']),
        },
    },
    '/godmin/expense': {
        GET: {
            allowed_roles: new Set(['artiste', 'admin', 'superadmin', 'other', 'all', 'guest']),
        },
    },
    '/godmin/product': {
        GET: {
            allowed_roles: new Set(['artiste', 'admin', 'superadmin', 'other', 'all', 'guest']),
        },
    },
    '/godmin/split': {
        GET: {
            allowed_roles: new Set(['artiste', 'admin', 'superadmin', 'other', 'all', 'guest']),
        },
    },
    '/godmin/file': {
        GET: {
            allowed_roles: new Set(['artiste', 'admin', 'superadmin', 'other', 'all', 'guest']),
        },
    },
    '/godmin/user': {
        GET: {
            allowed_roles: new Set(['artiste', 'admin', 'superadmin', 'other', 'all', 'guest']),
        },
    },
    '/godmin/artist': {
        GET: {
            allowed_roles: new Set(['artiste', 'admin', 'superadmin', 'other', 'all', 'guest']),
        },
    },
}

const payment_permissions:RoutePermissions = {
    // Payment routes
    '/payment': {
        GET: {
            allowed_roles: new Set(['artiste', 'admin', 'superadmin', 'other', 'all', 'guest']),
        },
        POST: {
            allowed_roles: new Set(['artiste', 'admin', 'superadmin', 'other', 'all', 'guest']),
        },
    },
    '/payment/:id': {
        GET: {
            allowed_roles: new Set(['artiste', 'admin', 'superadmin', 'other', 'all', 'guest']),
        },
        PUT: {
            allowed_roles: new Set(['artiste', 'admin', 'superadmin', 'other', 'all', 'guest']),
        },
        DELETE: {
            allowed_roles: new Set(['artiste', 'admin', 'superadmin', 'other', 'all', 'guest']),
        },
    },
    '/payment/bulk': {
        POST: {
            allowed_roles: new Set(['artiste', 'admin', 'superadmin', 'other', 'all', 'guest']),
        },
    },
}

const product_permissions:RoutePermissions = {
    // Product routes
    '/product': {
        GET: {
            allowed_roles: new Set(['artiste', 'admin', 'superadmin', 'other', 'all', 'guest']),
        },
        POST: {
            allowed_roles: new Set(['artiste', 'admin', 'superadmin', 'other', 'all', 'guest']),
        },
    },
    '/product/bulk': {
        POST: {
            allowed_roles: new Set(['artiste', 'admin', 'superadmin', 'other', 'all', 'guest']),
        },
    },
    '/product/bulksplits': {
        POST: {
            allowed_roles: new Set(['artiste', 'admin', 'superadmin', 'other', 'all', 'guest']),
        },
    },
    '/product/:id': {
        GET: {
            allowed_roles: new Set(['artiste', 'admin', 'superadmin', 'other', 'all', 'guest']),
        },
        PUT: {
            allowed_roles: new Set(['artiste', 'admin', 'superadmin', 'other', 'all', 'guest']),
        },
        DELETE: {
            allowed_roles: new Set(['artiste', 'admin', 'superadmin', 'other', 'all', 'guest']),
        },
    },
    '/product/:id/artists': {
        PUT: {
            allowed_roles: new Set(['artiste', 'admin', 'superadmin', 'other', 'all', 'guest']),
        },
    },
    '/product/:id/stats': {
        GET: {
            allowed_roles: new Set(['artiste', 'admin', 'superadmin', 'other', 'all', 'guest']),
        },
    },
    '/product/:id/setdefaultsplit': {
        PUT: {
            allowed_roles: new Set(['artiste', 'admin', 'superadmin', 'other', 'all', 'guest']),
        },
    },
}

const revenue_permissions:RoutePermissions = {
    // Revenue routes
    '/revenue': {
        GET: {
            allowed_roles: new Set(['artiste', 'admin', 'superadmin', 'other', 'all', 'guest']),
        },
        POST: {
            allowed_roles: new Set(['artiste', 'admin', 'superadmin', 'other', 'all', 'guest']),
        },
    },
    '/revenue/:id': {
        GET: {
            allowed_roles: new Set(['artiste', 'admin', 'superadmin', 'other', 'all', 'guest']),
        },
        PUT: {
            allowed_roles: new Set(['artiste', 'admin', 'superadmin', 'other', 'all', 'guest']),
        },
        DELETE: {
            allowed_roles: new Set(['artiste', 'admin', 'superadmin', 'other', 'all', 'guest']),
        },
    },
}

const royalty_permissions:RoutePermissions = {
    // Royalty routes
    '/royalty': {
        GET: {
            allowed_roles: new Set(['artiste', 'admin', 'superadmin', 'other', 'all', 'guest']),
        },
        POST: {
            allowed_roles: new Set(['artiste', 'admin', 'superadmin', 'other', 'all', 'guest']),
        },
    },
    '/royalty/month': {
        GET: {
            allowed_roles: new Set(['artiste', 'admin', 'superadmin', 'other', 'all', 'guest']),
        },
    },
    '/royalty/dsp': {
        GET: {
            allowed_roles: new Set(['artiste', 'admin', 'superadmin', 'other', 'all', 'guest']),
        },
    },
    '/royalty/saletype': {
        GET: {
            allowed_roles: new Set(['artiste', 'admin', 'superadmin', 'other', 'all', 'guest']),
        },
    },
    '/royalty/aggregator': {
        GET: {
            allowed_roles: new Set(['artiste', 'admin', 'superadmin', 'other', 'all', 'guest']),
        },
    },
    '/royalty/country': {
        GET: {
            allowed_roles: new Set(['artiste', 'admin', 'superadmin', 'other', 'all', 'guest']),
        },
    },
    '/royalty/artist': {
        GET: {
            allowed_roles: new Set(['artiste', 'admin', 'superadmin', 'other', 'all', 'guest']),
        },
    },
    '/royalty/asset': {
        GET: {
            allowed_roles: new Set(['artiste', 'admin', 'superadmin', 'other', 'all', 'guest']),
        },
    },
    '/royalty/product': {
        GET: {
            allowed_roles: new Set(['artiste', 'admin', 'superadmin', 'other', 'all', 'guest']),
        },
    },
    '/royalty/acountingperiod': {
        GET: {
            allowed_roles: new Set(['artiste', 'admin', 'superadmin', 'other', 'all', 'guest']),
        },
    },
}

const split_permissions:RoutePermissions = {
    // Split routes
    '/split': {
        GET: {
            allowed_roles: new Set(['artiste', 'admin', 'superadmin', 'other', 'all', 'guest']),
        },
        POST: {
            allowed_roles: new Set(['artiste', 'admin', 'superadmin', 'other', 'all', 'guest']),
        },
    },
    '/split/bulk': {
        POST: {
            allowed_roles: new Set(['artiste', 'admin', 'superadmin', 'other', 'all', 'guest']),
        },
    },
    '/split/:id': {
        GET: {
            allowed_roles: new Set(['artiste', 'admin', 'superadmin', 'other', 'all', 'guest']),
        },
        PUT: {
            allowed_roles: new Set(['artiste', 'admin', 'superadmin', 'other', 'all', 'guest']),
        },
        DELETE: {
            allowed_roles: new Set(['artiste', 'admin', 'superadmin', 'other', 'all', 'guest']),
        },
    },
}

const tenant_permissions:RoutePermissions = {
    // Tenant routes
    '/tenant': {
        GET: {
            allowed_roles: new Set(['artiste', 'admin', 'superadmin', 'other', 'all', 'guest']),
        },
        PUT: {
            allowed_roles: new Set(['artiste', 'admin', 'superadmin', 'other', 'all', 'guest']),
        },
        DELETE: {
            allowed_roles: new Set(['artiste', 'admin', 'superadmin', 'other', 'all', 'guest']),
        },
    },
    '/tenant/artist': {
        GET: {
            allowed_roles: new Set(['artiste', 'admin', 'superadmin', 'other', 'all', 'guest']),
        },
    },
    '/tenant/asset': {
        GET: {
            allowed_roles: new Set(['artiste', 'admin', 'superadmin', 'other', 'all', 'guest']),
        },
    },
    '/tenant/product': {
        GET: {
            allowed_roles: new Set(['artiste', 'admin', 'superadmin', 'other', 'all', 'guest']),
        },
    },
}

const user_permissions:RoutePermissions = {
    // User routes
    '/user': {
        GET: {
            allowed_roles: new Set(['artiste', 'admin', 'superadmin', 'other', 'all', 'guest']),
        },
        POST: {
            allowed_roles: new Set(['artiste', 'admin', 'superadmin', 'other', 'all', 'guest']),
        },
    },
    '/user/:id': {
        GET: {
            allowed_roles: new Set(['artiste', 'admin', 'superadmin', 'other', 'all', 'guest']),
        },
        PUT: {
            allowed_roles: new Set(['artiste', 'admin', 'superadmin', 'other', 'all', 'guest']),
        },
        DELETE: {
            allowed_roles: new Set(['artiste', 'admin', 'superadmin', 'other', 'all', 'guest']),
        },
    },
    '/user/bulk': {
        POST: {
            allowed_roles: new Set(['artiste', 'admin', 'superadmin', 'other', 'all', 'guest']),
        },
    },
    '/user/:id/aut': {
        PUT: {
            allowed_roles: new Set(['artiste', 'admin', 'superadmin', 'other', 'all', 'guest']),
        },
    },
    '/user/:id/role': {
        PUT: {
            allowed_roles: new Set(['artiste', 'admin', 'superadmin', 'other', 'all', 'guest']),
        },
    },
    '/user/:id/artist': {
        PUT: {
            allowed_roles: new Set(['artiste', 'admin', 'superadmin', 'other', 'all', 'guest']),
        },
    },
    '/user/:id/asset': {
        PUT: {
            allowed_roles: new Set(['artiste', 'admin', 'superadmin', 'other', 'all', 'guest']),
        },
    },
    '/user/:id/products': {
        PUT: {
            allowed_roles: new Set(['artiste', 'admin', 'superadmin', 'other', 'all', 'guest']),
        },
    },
    '/user/:id/stats': {
        PUT: {
            allowed_roles: new Set(['artiste', 'admin', 'superadmin', 'other', 'all', 'guest']),
        },
    },
}

const sensitive_permissions:RoutePermissions = {
    '/user/delete': {
        DELETE: {
            allowed_roles: new Set(['artiste', 'admin', 'superadmin', 'other', 'all', 'guest']),
        },
    },
}

module.exports = {
    ...accounting_permissions,
    ...artist_permissions,
    ...assets_permissions,
    ...auth_permissions,
    ...checklist_permissions,
    ...expense_permissions,
    ...godmin_permissions,
    ...payment_permissions,
    ...product_permissions,
    ...revenue_permissions,
    ...royalty_permissions,
    ...split_permissions,
    ...tenant_permissions,
    ...user_permissions,
    ...sensitive_permissions,
    '/auth/invite': {
        POST: {
            allowed_roles: new Set(['artiste', 'admin', 'superadmin', 'other', 'all', 'guest']),
        },
    },
}
