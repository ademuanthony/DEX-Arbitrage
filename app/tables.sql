CREATE TABLE IF NOT EXISTS known_token(
  address character varying(126) not null primary key,
  pair_address character varying(126) not null,
  tested boolean not null,
  whitelisted boolean not null
);

CREATE TABLE IF NOT EXISTS trades (
  tx_hash character varying(256) not null primary key,
  token_address character varying(128) not null,
  target_hash character varying(256) not null,
  target_amount character varying(256) not null,
  target_amount_min character varying(256) not null,
  reserve_in character varying(256) not null,
  reserve_out character varying(256) not null,
  trade_size character varying(256) not null,
  profit character varying(256) not null
);

CREATE TABLE IF NOT EXISTS enemy (
  address character varying(126) not null primary key
);

CREATE TABLE IF NOT EXISTS pair (
  pair_address character varying(126) not null primary key,
  token0 character varying(126) not null,
  token1 character varying(126) not null,
  router character varying(126) not null,
  label character varying(32) not null,
  score int not null default 0
);

CREATE TABLE IF NOT EXISTS exchange (
  router character varying (126) not null primary key,
  name character varying (126) not null,
  website character varying (126) not null,
  factory character varying(126) not null,
  pair_index int not null default -1,
  busd_pair character varying(126) not null,
  usdt_pair character varying(126) not null
);
