export function query(req) {
    const page = req.query.page * 1 || 1;
    const limit = req.query.limit * 1 || 10;
    const fields = req.query.fields?.split(',');
    let sort = [];

    if (req.query.sort) {
        sort = req.query.sort.split(',');
        sort = sort.map((el) => {
            if (el[0] === '-') {
                el = el.slice(1);
                return [el, 'DESC'];
            }
            return [el, 'ASC'];
        });
    }

    return { page, limit, fields, sort };
}