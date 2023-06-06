const getPagination = (page: number | null , size: number | null ) => {
    const limit = size ? +size : null;
    let offset = null;
    if (limit !== null) offset = page ? (page - 1) * limit : 0;

    return { limit, offset };
};

const getPagingData = (data: { count: number; rows: any[] }, page: number | null, limit: number | null, name: string) => {
    const totalItems = data.count;
    const rows = data.rows;
    const currentPage = page ? +page : 1;
    let totalPages;
    if (limit !== null ) totalPages = Math.ceil(totalItems / limit);
    

    return { totalItems, [name]: rows, totalPages, currentPage };
};

export default { getPagination, getPagingData };
