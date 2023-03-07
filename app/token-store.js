const { dbPool } = require('./database');
const logger = require('./logger');

const getTokenInfo = async (tokenAddress) => {
  const addressExistsQuery = `SELECT * FROM known_token WHERE address = $1;`;
  const userExists = await dbPool.query(addressExistsQuery, [tokenAddress]);
  if (userExists.rows.length === 0) return false;
  return userExists.rows[0];
};

const addNewToken = async (txData) => {
  try {
    const insertStatement = `
    insert into known_token (address, pair_address, tested, whitelisted) values($1, $2, $3, $4) RETURNING *
  `;

    const values = [txData.token, txData.pairAddress, txData.tested|false, txData.whitelisted|false];

    return await dbPool.query(insertStatement, values);
  } catch (err) {
    logger.error(err.message, 'addNewToken');
    return false;
  }
};

const addEnemy = async (address) => {
  try {
    const insertStatement = 'insert into enemy(address) values($1)';
    const values = [address];
    return await dbPool.query(insertStatement, values);
  } catch (error) {
    logger.error(error.message, 'addEnemy');
    return false;
  }
};

const isAnEnemy = async (address) => {
  const addressExistsQuery = `SELECT * FROM enemy WHERE address = $1;`;
  const userExists = await dbPool.query(addressExistsQuery, [address]);
  return userExists.rows.length > 0;
};

const getExchanges = async () => {
  const addressExistsQuery = `SELECT * FROM exchange`;
  const result = await dbPool.query(addressExistsQuery);
  return result.rows;
};

const getExchange = async (router) => {
  const addressExistsQuery = `SELECT * FROM exchange where router = $1`;
  const result = await dbPool.query(addressExistsQuery, [router]);
  return result.rows;
};

const addExchange = async ({
  name,
  website,
  router,
  factory,
  usdtPair,
  busdPair,
}) => {
  try {
    const insertStatement =
      'insert into exchange(name, website, router, factory, usdt_pair, busd_pair) values($1, $2, $3, $4, $5, $6) RETURNING *';
    const values = [name, website, router, factory, usdtPair, busdPair];
    return await dbPool.query(insertStatement, values);
  } catch (error) {
    logger.error(error.message, 'addExchange');
    return false;
  }
};

const getPair = async (pair_address) => {
  const addressExistsQuery = `SELECT * FROM pair WHERE lower(pair_address) = $1;`;
  const result = await dbPool.query(addressExistsQuery, [
    pair_address.toLowerCase(),
  ]);
  if (result.rows.length === 0) return false;
  return result.rows[0];
};

const getPairs = async (token) => {
  const addressExistsQuery = `SELECT * FROM pair WHERE lower(token0) = $1 or lower(token1) = $1;`;
  const result = await dbPool.query(addressExistsQuery, [token.toLowerCase()]);
  if (result.rows.length === 0) return [];
  return result.rows;
};

const addPair = async ({ pair_address, token0, token1, router, label }) => {
  if (!pair_address || !token0 || !token1 || !router || !label) {
    logger.error('Missing required fields', 'addPair');
    return false;
  }
  const pair = await getPair(pair_address);
  if (pair) {
    logger.error('Duplicate pair', 'addPair');
    return false;
  }

  try {
    const insertStatement =
      'insert into pair(pair_address, token0, token1, router, label) values($1, $2, $3, $4, $5)';
    const values = [pair_address, token0, token1, router, label];
    return await dbPool.query(insertStatement, values);
  } catch (error) {
    logger.error(error.message, 'addPair');
    return false;
  }
};

const removePairs = async (token) => {
  try {
    const sql =
      'delete from pair where lower(token0) = $1 or lower(token1) = $1';
    return await dbPool.query(sql, [token.toLowerCase()]);
  } catch (error) {
    logger.error(error.message, 'removePairs')
    return false;
  }
};

module.exports = {
  addNewToken,
  getTokenInfo,
  addEnemy,
  isAnEnemy,
  addExchange,
  getExchange,
  getExchanges,
  addPair,
  getPair,
  removePairs,
  getPairs,
};
