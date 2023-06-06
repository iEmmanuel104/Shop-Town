import { type } from "os";

type Endpoints<T> = Record<string, T>;

type Endpoint = {
    method: 'GET' | 'POST' | 'PATCH' | 'PUT' | 'DELETE';
    route: string;
}

const Endpoints: Endpoints<Endpoint> = {
    // USER ENDPOINTS
    ADD_USER: { method: 'POST', route: '/user/' },
    ADD_BULK_USER: { method: 'POST', route: '/user/bulk' },
    VIEW_USER: { method: 'GET', route: '/user/:id' },
    VIEW_USER_PRODUCTS: { method: 'GET', route: '/user/:id/products' },
    VIEW_USER_ASSETS: { method: 'GET', route: '/user/:id/assets' },
    VIEW_USER_STATS: { method: 'GET', route: '/user/:id/stats' },
    VIEW_USER_MONTHLY: { method: 'GET', route: '/user/:id/monthly' },
    VIEW_USER_ARTISTS: { method: 'GET', route: '/user/:id/artists' },
    VIEW_USERS: { method: 'GET', route: '/users/' },
    EDIT_USER: { method: 'PATCH', route: '/user/:id' },
    ADD_TENANT_USER: { method: 'PUT', route: '/user/:id/aut' },
    REMOVE_USER: { method: 'DELETE', route: '/user/:id' },
    DOWNLOAD_USER_DATA: { method: 'GET', route: '/user/:id/download/csv' },

    // TENANT ENDPOINTS
    CREATE_TENANT: { method: 'POST', route: '/tenant/' },
    UPDATE_TENANT: { method: 'PUT', route: '/tenant/' },
    GET_TENANT_INFO: { method: 'GET', route: '/tenant/' },
    DELETE_TENANT: { method: 'DELETE', route: '/tenant/' },
    GET_TENANT_STATS: { method: 'GET', route: '/tenant/stats' },
    GET_ALL_TENANTS: { method: 'GET', route: '/tenant/all' },

    // PRODUCT ENDPOINTS
    ADD_PRODUCT: { method: 'POST', route: '/product' },
    GET_PRODUCTS: { method: 'GET', route: '/product' },
    UPDATE_PRODUCT: { method: 'PUT', route: '/product/:id' },
    GET_PRODUCT_INFO: { method: 'GET', route: '/product/:id' },
    DELETE_PRODUCT: { method: 'DELETE', route: '/product/:id' },
    ADD_BULK_PRODUCT: { method: 'POST', route: '/product/bulk' },
    SET_BULK_SPLITS_PROUCT: { method: 'POST', route: '/product/bulksplits' },
    UPDATE_PRODUCT_ASSETS: { method: 'PUT', route: '/product/:id/assets' },
    UPDATE_PRODUCT_ARTISTS: { method: 'PUT', route: '/product/:id/artists' },
    SET_PRODUCT_DEFAULT_SPLIT: { method: 'PUT', route: '/product/:id/setdefaultsplit',},
    GET_PRODUCT_STATS: { method: 'GET', route: '/product/:id/stats' },
    DOWNLOAD_PRODUCT_DATA: { method: 'GET', route: '/product/:id/download/csv',},

    // SPLIT ENDPOINTS
    ADD_SPLIT: { method: 'POST', route: '/split/' },
    VIEW_SPLITS: { method: 'GET', route: '/split/' },
    EDIT_SPLIT: { method: 'PUT', route: '/split/:id' },
    VIEW_SPLIT: { method: 'GET', route: '/split/:id' },
    REMOVE_SPLIT: { method: 'DELETE', route: '/split/:id' },

    // REVENUE ENDPOINTS
    ADD_REVENUE: { method: 'POST', route: '/revenue/' },
    GET_REVENUES: { method: 'GET', route: '/revenue/' },
    GET_REVENUE: { method: 'GET', route: '/revenue/:id' },
    UPDATE_REVENUE: { method: 'PUT', route: '/revenue/:id' },
    DELETE_REVENUE: { method: 'DELETE', route: '/revenue/:id' },

    // PAYMENTS ENDPOINTS
    ADD_PAYMENT: { method: 'POST', route: '/payment/' },
    VIEW_PAYMENTS: { method: 'GET', route: '/payments/' },
    VIEW_PAYMENT: { method: 'GET', route: '/payment/:id' },
    EDIT_PAYMENT: { method: 'PUT', route: '/payment/:id' },
    REMOVE_PAYMENT: { method: 'DELETE', route: '/payment/:id' },
    ADD_BULK_PAYMENT: { method: 'POST', route: '/payment/bulk' },

    // EXPENSE ENDPOINTS
    ADD_EXPENSE: { method: 'POST', route: '/expense/' },
    VIEW_EXPENSES: { method: 'GET', route: '/expenses' },
    VIEW_EXPENSE: { method: 'GET', route: '/expense/:id' },
    EDIT_EXPENSE: { method: 'PUT', route: '/expense/:id' },
    REMOVE_EXPENSE: { method: 'DELETE', route: '/expense/:id' },
    ADD_BULK_EXPENSE: { method: 'POST', route: '/expense/bulk' },

    // ASSET ENDPOINTS
    ADD_ASSET: { method: 'POST', route: '/asset/' },
    GET_ASSETS: { method: 'GET', route: '/asset/' },
    ADD_BULK_ASSET: { method: 'POST', route: '/asset/bulk' },
    SET_BULK_SPLITS_ASSET: { method: 'POST', route: '/asset/bulksplits' },
    UPDATE_ASSET: { method: 'PUT', route: '/asset/:id' },
    GET_ASSET_INFO: { method: 'GET', route: '/asset/:id' },
    DELETE_ASSET: { method: 'DELETE', route: '/asset/:id' },
    ASSET_ARTISTS: { method: 'PUT', route: '/asset/:id/artists' },
    GET_ASSET_STATS: { method: 'GET', route: '/asset/:id/stats' },
    SET_ASSET_DEFAULT_SPLIT: { method: 'PUT', route: '/asset/:id/setdefaultsplit' },
    DOWNLOAD_ASSET_DATA: { method: 'GET', route: '/asset/:id/download/csv' },

    // ARTIST ENDPOINTS
    ADD_ARTIST: { method: 'POST', route: '/artist/' },
    ADD_BULK_ARTIST: { method: 'POST', route: '/artist/bulk' },
    VIEW_ARTIST: { method: 'GET', route: '/artist/:id' },
    VIEW_ARTIST_PRODUCTS: { method: 'GET', route: '/artist/:id/products' },
    VIEW_ARTIST_ASSETS: { method: 'GET', route: '/artist/:id/assets' },
    VIEW_ARTIST_STATS: { method: 'GET', route: '/artist/:id/stats' },
    VIEW_ARTISTS: { method: 'GET', route: '/artists' },
    EDIT_ARTIST: { method: 'PUT', route: '/artist/:id' },
    REMOVE_ARTIST: { method: 'DELETE', route: '/artist/:id' },
    BULK_SET_ARTIST_SPLIT: { method: 'POST', route: '/artist/bulksplit' },
    DOWNLOAD_ARTIST_DATA: { method: 'GET', route: '/artist/:id/download/csv' },

    // ACCOUNTING ENDPOINTS
    VIEW_USER_STATS_DETAILS : { method: 'GET', route: '/user/:id/stats' }
};

type Permissions = Record<string, { endpoints: string[] }>

const permissions: Permissions = {} as Permissions;

permissions.user = {
    endpoints: [
        'VIEW_USER',
        'VIEW_USER_PRODUCTS',
        'VIEW_USER_ASSETS',
        'VIEW_USER_STATS',
        'VIEW_USER_MONTHLY',
        'VIEW_USER_ARTISTS',
        'EDIT_USER',
        'DOWNLOAD_USER_DATA'
    ]
}

permissions.admin = {
    endpoints: [
        ...permissions.user.endpoints,
        'ADD_USER',
        'ADD_BULK_USER',
        'VIEW_USERS',
        'ADD_TENANT_USER',
        'REMOVE_USER',
        'CREATE_TENANT',
        'UPDATE_TENANT',
        'GET_TENANT_INFO',
        'DELETE_TENANT',
        'GET_TENANT_STATS',
        'GET_ALL_TENANTS',
        'ADD_PRODUCT',
        'UPDATE_PRODUCT',
        'GET_PRODUCT_INFO',
        'DELETE_PRODUCT',
        'ADD_BULK_PRODUCT',
        'SET_BULK_SPLITS_PROUCT',
        'UPDATE_PRODUCT_ASSETS',
        'UPDATE_PRODUCT_ARTISTS',
        'SET_PRODUCT_DEFAULT_SPLIT',
        'GET_PRODUCT_STATS',
        'DOWNLOAD_PRODUCT_DATA',
        'ADD_SPLIT',
        'VIEW_SPLITS',
        'EDIT_SPLIT',
        'VIEW_SPLIT',
        'REMOVE_SPLIT',
        'ADD_REVENUE',
        'GET_REVENUES',
        'GET_REVENUE',
        'UPDATE_REVENUE',
        'DELETE_REVENUE',
        'ADD_PAYMENT',
        'VIEW_PAYMENTS',
        'VIEW_PAYMENT',
        'EDIT_PAYMENT',
        'REMOVE_PAYMENT',
        'ADD_BULK_PAYMENT',
        'ADD_EXPENSE',
        'VIEW_EXPENSES',
        'VIEW_EXPENSE',
        'EDIT_EXPENSE',
        'REMOVE_EXPENSE',
        'ADD_BULK_EXPENSE',
        'ADD_ASSET',
        'GET_ASSETS'
    ]
}

permissions.superadmin = {
    endpoints: [
        ...permissions.admin.endpoints,
        // add any additional endpoints for superadmin here
    ]
};


export default { Endpoints, permissions };
export { Endpoint }



