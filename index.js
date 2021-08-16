const { ShardingManager } = require('discord.js');
const appsettings = require('./appsettings.json');

const shards = new ShardingManager('./bot.js', {
    token: appsettings.token,
    totalShards: "auto"
});

shards.on('shardCreate', async (shard) => {
    console.log(`New shard with id ${shard.id}`);
});

shards.spawn();