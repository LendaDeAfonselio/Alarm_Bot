"use strict";
// Packages and dependencies
const { Collection, Client, Intents } = require('discord.js');
const logging = require('./Utils/logging');
const deployCommands = require('./deployCommands')
// configuration files
const appsettings = require('./appsettings.json'); // on github project this file 
// is not completed, it does need some 
// values like the bot token and the mongo db url

const auth = require('./auth.json');

// auxiliary js files with functions
const load_alarms = require('./load_alarms');
const delete_alarms_when_kicked = require('./delete_alarms_for_guilds');

// db access
const alarm_db = require('./data_access/alarm_index');
const premium_db = require('./data_access/premium_index');

// Mongo setup
const mongoose = require("mongoose");
let shard_id;
mongoose.connect(appsettings.mongo_db_url, { useUnifiedTopology: true, useNewUrlParser: true }, (err) => {
    if (err) {
        logging.logger.error(err);
    }
    else {
        logging.logger.info("Connected to the mongodb");
    }
});

// Instances
const client = new Client({ intents: [Intents.FLAGS.GUILDS, Intents.FLAGS.GUILD_MESSAGES] });
const cron_list = {}; // the in memory crono list
const cron = require('cron').CronJob;
const fs = require('fs');
const utility_functions = require('./Utils/utility_functions');

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
        deployCommands.registerSlashCommandsInGuild(guild.id);
        try {
            let f = await load_alarms.fetchAlarmsforGuild(cron_list, cron, guild, guild.id, client);

            if (f == undefined) {
                await alarm_db.delete_all_alarms_for_guild(guild.id);
            }
            let a = await load_alarms.fetchOTAsforGuild(cron_list, cron, guild, guild.id, client);

            if (a == undefined) {
                await alarm_db.delete_all_pubota_alarms_for_guild(guild.id);
            }

            let b = await load_alarms.fetchTTSAlarms(cron_list, cron, guild, guild.id, client);

            if (b == undefined) {
                await alarm_db.delete_allttsalarm_from_guild(guild.id);
            }

        } catch (e) {
            logging.logger.info(`Error booting up the alarms for guild: ${guild.id}`);
            logging.logger.error(e);
        }
    });

    client.user.setActivity("$help to get started!");
});

/*************************** Execute Commands ************************/
client.on('messageCreate', async message => {
    const channelPrefix = auth.prefix;
    if (!message.content.startsWith(channelPrefix)) return;
    if (message.author.bot) return;
    else {
        let args = message.content.slice(auth.prefix.length).split(/ +/);
        let command = args.shift();
        if (command !== undefined) {
            command = command.toLowerCase();
        }
        if (!client.commands.has(command)) return;
        else {
            if (utility_functions.can_send_messages(message)) {
                try {
                    await client.commands.get(command).execute(message, args, client, cron, cron_list, mongoose);
                } catch (error) {
                    logging.logger.info(`An error has occured while executing the following command: ${message.content}`);
                    logging.logger.error(error);
                    message.reply('There was an error trying to execute that command!');
                }
            } else {
                message.author.send('AlarmBot does not have permission to send messages. Please check AlarmBot permissions and try again.')
                    .catch((err) => {
                        logging.logger.info(`Can't send reply to message ${args} from user ${message.author.id}. And no permissions in the channel...`);
                        logging.logger.error(err);
                    });
            }
        }
    }
});

client.on('interactionCreate', async interaction => {
    if (!interaction.isCommand()) {
        return;
    }
    else {
        const command = client.commands.get(interaction.commandName);
        if (!command) return;
        else {
            if (utility_functions.can_send_messages(interaction)) {
                try {
                    await command.execute(interaction, cron_list, cron);
                } catch (error) {
                    logging.logger.info(`An error has occured while executing the following command: ${interaction.commandName}; options: ${interaction.options}`);
                    logging.logger.error(error);
                    await interaction.reply('There was an error trying to execute that command!');
                }
            } else {
                interaction.author.send('AlarmBot does not have permission to send messages. Please check AlarmBot permissions and try again.')
                    .catch((err) => {
                        logging.logger.info(`Can't send reply to message ${args} from user ${interaction.author.id}. And no permissions in the channel...`);
                        logging.logger.error(err);
                    });
            }
        }
    }
});

// automatically take care of private alarms, clean old entries in databases, and log basic stats.
process.on("message", async message => {
    if (!message.type) return false;
    if (message.type == "shardId") {
        logging.logger.info(`The shard id is: ${message.data.shardId} and has ${client.guilds.cache.size} servers`);
    }
    if (message.type == "shardId" && message.data && message.data.shardId == 0) {
        // delete old entries
        let deletedentries = await alarm_db.delete_all_expired_one_time_alarms();
        logging.logger.info("Deleted " + deletedentries.deletedCount + " one time alarms");
        let deletedpremium = await premium_db.delete_all_expired_memberships();
        logging.logger.info(deletedpremium.deletedCount + " premium memberships have expired");

        // fetch private alarms
        shard_id = message.data.shardId;
        await fetchPrivate(message.data.shardId);

        // log total guilds every day at midnight
        await logTotalGuildsDaily();
    };
});

// aux function to get all guilds every day
async function logTotalGuildsDaily() {
    let scheduledMessage = new cron('0 0 * * *', async () => {
        let allguilds = await utility_functions.fetchValuesAndConcatValues(client, 'guilds.cache');
        logging.logger.info("Running in " + allguilds.length + " guilds");
    }, {
        scheduled: true
    });
    scheduledMessage.start();
}


// If the bot is kicked, delete the alarms
client.on('guildDelete', async (guild) => {
    logging.logger.info(`Bot left the guild: ${guild.id}... Deleting the alarms for that guild`);

    try {
        let results = await delete_alarms_when_kicked.deleteAlarmsForGuild(cron_list, guild.id);
        logging.logger.info(`Sucessfully deleted ${results.deletedCount} alarms that were being used in guild ${guild.id}`);

        let results1 = await delete_alarms_when_kicked.deleteTTSAlarmsForGuild(cron_list, guild.id);
        logging.logger.info(`Sucessfully deleted ${results1.deletedCount} alarms that were being used in guild ${guild.id}`);

    } catch (e) {
        logging.logger.info(`An error has occured while trying to delete the alarms for guild ${guild.id}`);
        logging.logger.error(e);
    }
});

// delete private alarms on bootstrap
async function fetchPrivate(shardid) {
    try {
        await load_alarms.fetchPrivateAlarms(cron_list, cron, client, shardid);
        await load_alarms.fetchPrivateOTAs(cron_list, cron, client, shardid);
    } catch (err) {
        logging.logger.error(err);
    }
}

//Login
client.login(appsettings.token);