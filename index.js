const { ShardingManager } = require('discord.js');
const appsettings = require('./appsettings.json');

const shards = new ShardingManager('./bot.js', {
    totalShards: 'auto', // this value should always be 'auto', if its a number it should only be used for testing
    token: appsettings.token,
    execArgv: ['--trace-warnings'],
});

shards.on('shardCreate', async (shard) => {
    shard.on("ready", () => {
        console.log(`New shard with id ${shard.id}`);

        shard.send({ type: "shardId", data: { shardId: shard.id } });
    });
});

shards.spawn().catch(error => console.error(`[ERROR/SHARD] Shard failed to spawn.\n${error}`));