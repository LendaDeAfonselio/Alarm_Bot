const { ShardingManager } = require('discord.js');
const appsettings = require('./appsettings.json');

const shards = new ShardingManager('./bot.js', {
    totalShards: 'auto',
    token: appsettings.token
});

shards.on('shardCreate', async (shard) => {
    console.log(`New shard with id ${shard.id}`);
});

shards.spawn().catch(error => console.error(`[ERROR/SHARD] Shard failed to spawn.`));