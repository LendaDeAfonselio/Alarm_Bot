const { ShardingManager } = require('discord.js');
const appsettings = require('./appsettings.json');
const logging = require('./Utils/logging');

const shards = new ShardingManager('./bot.js', {
    totalShards: 'auto', // this value should always be 'auto', if its a number it should only be used for testing
    token: appsettings.token,
    execArgv: ['--trace-warnings'],
    respawn: true
});

shards.on('shardCreate', async (shard) => {
    shard.on("ready", () => {
        logging.logger.info(`New shard with id ${shard.id}`);

        shard.send({ type: "shardId", data: { shardId: shard.id } });
    });
    shard.on('reconnecting', (a, b) => {
        logging.logger.info(`Shard ${shard.id} reconnecting`);
        logging.logger.info(a);
        logging.logger.info(b);
        shard.send({ type: "shardId", data: { shardId: shard.id } });
    });
    shard.on('death', () => {
        logging.logger.error(`RIP Bozo! Shard ${shard.id}`);
    });
    shard.on('error', (err) => {
        logging.logger.error(`Error in  ${shard.id} with : ${err} `)
        shard.respawn()
    });
});

shards.spawn('auto', 20000).catch(error => logging.logger.error(`[ERROR/SHARD] Shard failed to spawn. Error: ${error}`));