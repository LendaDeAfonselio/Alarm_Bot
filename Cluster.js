'use strict';
const Cluster = require('discord-hybrid-sharding');
const appsettings = require('./appsettings.json');
const logging = require('./Utils/logging');

const manager = new Cluster.Manager(`${__dirname}/bot.js`, {
    totalShards: 'auto',
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
        logging.logger.info(`Spawned Cluster with PID ${spawnedCluster?.pid}`);
    });
    cluster.on('ready', async () => {
        logging.logger.info(`Cluster ${cluster?.id} is ready`);
        await cluster.send({ type: 'shardId', data: { shardId: cluster?.id } });
    });
    cluster.on('disconnect', (disconnectedCluster) => {
        logging.logger.info(`Cluster ${disconnectedCluster?.id} disconnected`);
    });
    cluster.on('error', err => {
        logging.logger.error(`Error in ${cluster.id}: ${err}`);
    });
    cluster.on('death', () => {
        logging.logger.error(`RIP Bozo! Cluster ${cluster.id}`);
    });
});
manager.spawn({ delay: 20000, timeout: -1 });