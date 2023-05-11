const getPagination = (page, size) => {
    const limit = size ? +size : 1;
    const offset = page ? (page - 1) * limit : 0;

    return { limit, offset };
};

const getPagingData = (data, page, limit, name) => {
    const totalItems = data.count;
    const rows = data.rows;
    const currentPage = page ? +page : 1;
    const totalPages = Math.ceil(totalItems / limit);

    return { totalItems, [name]: rows, totalPages, currentPage };
};

module.exports = { getPagination, getPagingData };
