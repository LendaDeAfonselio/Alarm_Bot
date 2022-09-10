'use strict';
const Cluster = require('discord-hybrid-sharding');
const appsettings = require('./appsettings.json');
const logging = require('./Utils/logging');

const manager = new Cluster.Manager(`${__dirname}/bot.js`, {
    totalShards: 'auto',
    shardsPerClusters: 2,
    mode: 'process', // you can also choose "worker"
    token: appsettings.token,
    respawn: true,
    spawnOptions: {
        delay: 20000,
        timeout: -1
    }
});

manager.on('clusterCreate', async (cluster) => {
    logging.logger.info(`Launched Cluster ${cluster.id}`);
    cluster.on('spawn', spawnedCluster => {
        logging.logger.info(`Spawned Cluster ${spawnedCluster.id}`);
    });
    cluster.on('ready', async (readyCluster) => {
        logging.logger.info(`Cluster ${readyCluster.id} is ready`);
        await readyCluster.send({ type: 'shardId', data: { shardId: readyCluster.id } });
    });
    cluster.on('disconnect', (disconnectedCluster) => {
        logging.logger.info(`Cluster ${disconnectedCluster.id} disconencted`);
    });
    cluster.on('error', err => {
        logging.logger.error(`Error in ${cluster.id}: ${err}`);
    });
});
manager.spawn({ timeout: -1 });