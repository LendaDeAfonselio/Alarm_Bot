const { ShardingManager } = require('discord.js');
const appsettings = require('./appsettings.json');

const shards = new ShardingManager('./bot.js', {
    totalShards: 'auto',
    token: appsettings.token
});

shards.on('shardCreate', async (shard) => {
    shard.on("ready", () => {
        console.log(`New shard with id ${shard.id}`);

        shard.send({ type: "shardId", data: { shardId: shard.id } });
    });
});

shards.spawn().catch(error => console.error(`[ERROR/SHARD] Shard failed to spawn.\n${error}`));