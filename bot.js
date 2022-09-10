'use strict';
// Packages and dependencies for Discord client and Cluster manager
const { Collection, Client, GatewayIntentBits, Partials, InteractionType } = require('discord.js');
const Cluster = require('discord-hybrid-sharding');

// configuration files
const logging = require('./Utils/logging');
const appsettings = require('./appsettings.json'); // on github project this file 
// is not completed, it does need some 
// values like the bot token and the mongo db url

// auxiliary js files with functions
const load_alarms = require('./load_alarms');
const delete_alarms_when_kicked = require('./delete_alarms_for_guilds');

// db access
const alarm_db = require('./data_access/alarm_index');
const premium_db = require('./data_access/premium_index');

// Mongo setup
const mongoose = require('mongoose');
mongoose.connect(appsettings.mongo_db_url, { useUnifiedTopology: true, useNewUrlParser: true }, (err) => {
    if (err) {
        logging.logger.error(`Error connecting to MONGODB: ${err}`);
    }
    else {
        logging.logger.info('Connected to the mongodb');
    }
});

// Instances
const client = new Client({
    intents: [GatewayIntentBits.Guilds, GatewayIntentBits.GuildMessages], partials: [Partials.Channel],
    shards: Cluster.data.SHARD_LIST,
    shardCount: Cluster.data.TOTAL_SHARDS
});
const cron_list = {}; // the in memory crono list
const cron = require('cron').CronJob;
const fs = require('fs');

/****** Gets all available commands ******/
client.commands = new Collection();
const commandFiles = fs.readdirSync('./commands').filter(file => file.endsWith('.js'));


for (const file of commandFiles) {
    const command = require(`./commands/${file}`);
    // Set a new item in the Collection
    // With the key as the command name and the value as the exported module
    client.commands.set(command.data.name, command);
}

/****** Setup the bot by fetching all alarms ******/
client.once('ready', async () => {

    let allGuilds = client.guilds.cache;
    allGuilds.forEach(async (guild) => { //for each guild the bot is in
        // bootstrap alarms
        try {
            // fetch public alarms
            let f = await load_alarms.fetchAlarmsforGuild(cron_list, cron, guild, guild.id, client);

            // if not found delete
            if (f === undefined) {
                await alarm_db.delete_all_alarms_for_guild(guild.id);
            }

            // fetch OTAs
            let a = await load_alarms.fetchOTAsforGuild(cron_list, cron, guild, guild.id, client);

            if (a === undefined) {
                await alarm_db.delete_all_pubota_alarms_for_guild(guild.id);
            }

            // fetch tts alarms
            let b = await load_alarms.fetchTTSAlarms(cron_list, cron, guild, guild.id, client);

            if (b === undefined) {
                await alarm_db.delete_allttsalarm_from_guild(guild.id);
            }

        } catch (e) {
            logging.logger.error(`Error booting up the alarms for guild ${guild.id}. ${e}`);
        }
    });
    client.user.setActivity('$help to get started!');
});

/*************************** Execute Commands ************************/
client.on('interactionCreate', async interaction => {
    if (!interaction.type === InteractionType.ApplicationCommand) {
        return;
    }
    else {
        const command = client.commands.get(interaction.commandName);
        if (!command) { return; }
        else {
            try {
                await command.execute(interaction, cron_list, cron, client);
            } catch (error) {
                logging.logger.info(`An error has occured while executing the following command: ${interaction.commandName}; options: ${interaction.options}`);
                logging.logger.error(error);
                await interaction.channel.send('There was an error trying to execute that command!');
            }
        }
    }
});

// automatically take care of private alarms, clean old entries in databases, and log basic stats.
process.on('message', async message => {
    if (!message.type) { return false; }
    if (message.type === 'shardId') {
        logging.logger.info(`The shard id is: ${message.data.shardId} and has ${client.guilds.cache.size} servers`);

        if (message.type === 'shardId' && message.data && message.data.shardId === 0) {
            // delete old entries
            let deletedentries = await alarm_db.delete_all_expired_one_time_alarms();
            logging.logger.info('Deleted ' + deletedentries.deletedCount + ' one time alarms');
            let deletedpremium = await premium_db.delete_all_expired_memberships();
            logging.logger.info(deletedpremium.deletedCount + ' premium memberships have expired');
        }

        // log total guilds every day at midnight
    }

});


// If the bot is kicked, delete the alarms
client.on('guildDelete', async (guild) => {
    logging.logger.info(`Bot left the guild: ${guild.id}... Deleting the alarms for that guild`);

    try {
        let results = await delete_alarms_when_kicked.deleteAlarmsForGuild(cron_list, guild.id);
        logging.logger.info(`Sucessfully deleted ${results.deletedCount} alarms that were being used in guild ${guild.id}`);

        let results1 = await delete_alarms_when_kicked.deleteTTSAlarmsForGuild(cron_list, guild.id);
        logging.logger.info(`Sucessfully deleted ${results1.deletedCount} alarms that were being used in guild ${guild.id}`);

    } catch (e) {
        logging.logger.error(`An error has occured while trying to delete the alarms for guild ${guild.id}. Error: ${e}`);
    }
});


//Login
client.cluster = new Cluster.Client(client);
client.login(appsettings.token);