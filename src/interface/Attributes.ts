
export interface Users
 {
    id: string;
    externalId?: string | null;
    firstName: string;
    lastName: string;
    email: string;
    profileImg?: string;
    phone?: string;
    country?: string;
    ipi?: string;
    role: 'admin' | 'label_admin' | 'main_admin' | 'super_admin' | 'main_super_admin' | 'artist' | 'guest';
    isVerified: boolean;
    hasPassword: boolean;
    isActive: boolean;
    fullName?: string; // virtual field
}

export interface Tenants {
    id: number;
    uid: string;
    name: string;
    info: string | null;
    user: string | null;
    email: string | null;
    links: object | null;
    bigqueryDataset: string | null;
    labeldetail: object | null;
}

export interface LabelAdmins {
    id: string;
    userId: string;
    accountDetails?: string;
    userType: string[];
}

export interface TenantUsers {
    TenantId: number;
    UserId: string;
    nickName?: string;
    paymentsettings?: { [key: string]: any};
    userType?: string[];
    lastLogin?: Date;
    permissions?: { [key: string]: any};
}

export interface Artists {
    TenantId: number;
    id: string;
    label ?: string;
    copyright ?: string;
    publisher ?: string;
    externalId ?: string;
    artistImg ?: string;
    artistName: string;
    signDate ?: Date;
    links ?: { [key: string]: string; };
    contributors ?: { [key: string]: string; };
    split?: { [key: string]: string | number; };
}

export interface ArtistUsers {
    TenantId: number;
    ArtistId: string;
    UserId: string;
}

export interface AccountDetail {
    id: string;
    accountName: string;
    bankName: string;
    accountNumber: string;
}

export interface Restrictions {
    id: string;
    userId?: string;
    permissions?: string[];
    restrictions?: string[];
}

// ACCOUNTING TYPES

export interface Payments {
    TenantId: number;
    id: string;
    title: string;
    transactionDate?: Date | null;
    currency?: string | null;
    amount?: number | null;
    amountUSD?: number | null;
    balanceCurrency?: string | null;
    balance?: number | null;
    conversionRate?: number | null;
    externalId?: string | null;
    memo?: string | null;
    files?: { [key: string]: any} | null;
}

export interface Revenues {
    TenantId: number;
    id: string;
    title: string;
    // ArtistId?: string;
    type: string;
    transactionDate?: Date;
    currency?: string;
    amount?: number;
    amountUSD?: number;
    conversionRate?: number;
    memo?: string;
    files?: any;
}

export interface Expenses {
    TenantId: number;
    id: string;
    expenseableId?: string;
    expenseableType?: string;
    title: string;
    type?: string;
    transactionDate?: Date;
    currency?: string;
    amount?: number;
    amountUSD?: number;
    conversionRate?: number;
    memo?: string;
    files?: object;
}

// CATALOG TYPES

export interface Assets {
    TenantId: number;
    id: string;
    isrc: string;
    iswc?: string;
    externalId?: string;
    assetIDs?: string[];
    displayArtist: string;
    mainArtist?: string[];
    otherArtist?: string[];
    title: string;
    type: 'Audio' | 'Video' | 'Ringtone' | 'YouTube';
    version?: string;
    mainGenre?: string[];
    subGenre?: string[];
    contributors?: Record<string, string[]>;
    extra?: Record<string, any>;
}

export interface ArtistAssets {
    TenantId: number;
    ArtistId: string;
    AssetId: string;
}

export interface Products {
    TenantId: number;
    id: string;
    upc: string;
    catalog?: string;
    externalId?: string;
    releaseDate?: Date;
    displayArtist: string;
    mainArtist?: string[];
    otherArtist?: string[];
    title: string;
    label?: string;
    type?: 'Audio' | 'Video' | 'Ringtone';
    format?: 'Single' | 'EP' | 'Album' | 'LP';
    status?: 'Live' | 'Taken Down' | 'Scheduled' | 'Pending' | 'Error';
    distribution?: string;
    mainGenre?: string[];
    subGenre?: string[];
    links?: Record<string, unknown>;
    contributors?: Record<string, unknown>;
    extra?: Record<string, unknown>;
}

export interface ArtistProducts {
    TenantId: number;
    ArtistId: string;
    ProductId: string;
}

export interface ProductAssets {
    TenantId: number;
    ProductId: string;
    Number: number;
    AssetId: string;
}

// PASSWORD TYPES
export interface Passwords {
    id: string;
    userId: string;
    password: string;
}

// FILES TYPES
export interface Files {
    TenantId: number;
    id: string;
    name: string;
    source?: string;
    CloudId?: string;
    description?: string;
    user?: string;
    email?: string;
    format?: string;
    status?: string;
    statusId?: string;
    type: 'royalty' | 'invoice' | 'receipt' | 'report';
}

// GIG TYPES
export interface Gigs {
    title: string;
    technologies: string;
    description: string;
    budget: string;
    contact_email: string;
    budgets: string | null;
}


// SPLITS TYPES
export interface Splits {
    TenantId: number;
    id: string;
    ProductId?: string;
    AssetId?: string;
    name?: string;
    type: ' ' | 'Publishing' | 'YouTube' | 'Live';
    period?: [Date, Date];
    contract?: boolean;
    ContractId?: string;
    conditions?: { Include: string[]; Exclude: string[] };
}

export interface SplitShares {
    TenantId: number;
    SplitId: string;
    UserId: string;
    Share: number;
}

export interface AccountingSplits {
    TenantId: number;
    id: string;
    name?: string;
    accountingsplitableId?: string;
    accountingsplitableType?: string;
}

export interface AccountingSplitShares {
    TenantId: number;
    AccountingSplitId: string;
    UserId: string;
    Share: number;
}

export interface Tokens {
    id: string;
    userId: string;
    password_reset_code: string | null;
    verification_code: string;
    activation_code: string;
}

export interface BlacklistedToken {
    id: string;
    token: string;
}
