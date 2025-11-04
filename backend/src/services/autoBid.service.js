import db from '../db/knex.js';
import { ApiError } from '../utils/response.js';

export const recalcAutoBid = async (productId, trx = null) => {
    const knex = trx || db;
    const autoBids = await knex('auto_bids')
        .where({ product_id: productId })
        .orderBy([{ column: 'max_bid_amount', order: 'desc' }, { column: 'created_at', order: 'asc' }]);

    if (!autoBids.length) {
        return null;
    }

    // TODO: implement core logic

    throw new ApiError(501, 'AUTO_BID.NOT_IMPLEMENTED', 'Auto-bid recalculation logic is not yet implemented');
};