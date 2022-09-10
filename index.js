'use strict';
const { ShardingManager } = require('discord.js');
const appsettings = require('./appsettings.json');
const logging = require('./Utils/logging');

const shards = new ShardingManager('./bot.js', {
    totalShards: 'auto', // this value should be 'auto', if its a number it should favourably used for testing
    token: appsettings.token,
    execArgv: ['--trace-warnings'],
    respawn: true
});

shards.on('shardCreate', async (shard) => {
    shard.on('ready', async () => {
        logging.logger.info(`New shard with id ${shard.id}`);

        await shard.send({ type: 'shardId', data: { shardId: shard.id } });
    });
    shard.on('reconnecting', async (a, b) => {
        logging.logger.info(`Shard ${shard.id} reconnecting`);
        logging.logger.info(a);
        logging.logger.info(b);
        await shard.send({ type: 'shardId', data: { shardId: shard.id } });
    });
    shard.on('death', () => {
        logging.logger.error(`RIP Bozo! Shard ${shard.id}`);
    });
    shard.on('error', (err) => {
        logging.logger.error(`Error in ${shard.id} with : ${err}`);
        shard.respawn({ delay: 20000 });
    });
});

shards.spawn({ delay: 20000 }).catch(error => logging.logger.error(`[ERROR/SHARD] Shard failed to spawn. Error: ${error}`));