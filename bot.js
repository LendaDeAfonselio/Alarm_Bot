"use strict";
// Packages and dependencies
const Discord = require('discord.js');
const auth = require('./auth.json');
const appsettings = require('./appsettings.json');
const load_alarms = require('./load_alarms');
const delete_alarms_when_kicked = require('./delete_alarms_for_guilds');
const logging = require('./Utils/logging');
// const utility_functions = require('./Utils/utility_functions');

const alarm_db = require('./data_access/alarm_index');
const premium_db = require('./data_access/premium_index');
// Mongo setup
const mongoose = require("mongoose");
mongoose.connect(appsettings.mongo_db_url, { useUnifiedTopology: true, useNewUrlParser: true }, (err) => {
    if (err) {
        logging.logger.error(err);
    }
    else {
        logging.logger.info("Connected to the mongodb");
    }
});

// Instances
const client = new Discord.Client();
const cron_list = {}; // the in memory crono list
const cron = require('cron').CronJob;
const fs = require('fs');

/****** Gets all available commands ******/
client.commands = new Discord.Collection();
const commandFiles = fs.readdirSync('./commands').filter(file => file.endsWith('.js'));

for (const file of commandFiles) {
    const command = require(`./commands/${file}`);
    let nameLowerCase = command.name.toString().toLowerCase();
    client.commands.set(nameLowerCase, command);
}


/****** Setup the bot for life upon startup ******/
client.once('ready', async () => {
    let deletedentries = await alarm_db.delete_all_expired_one_time_alarms();
    logging.logger.info("Deleted " + deletedentries.deletedCount + " one time alarms");
    let deletedpremium = await premium_db.delete_all_expired_memberships();
    logging.logger.info(deletedpremium.deletedCount + " premium memberships have expired");

    client.guilds.cache.forEach(async (guild) => { //for each guild the bot is in
        try {
            let f = await load_alarms.fetchAlarmsforGuild(cron_list, cron, guild, guild.id);
            if (f == false) {
                await alarm_db.delete_all_alarms_for_guild(guild.id);
            }
            let a = await load_alarms.fetchOTAsforGuild(cron_list, cron, guild, guild.id);
            if (a == false) {
                await alarm_db.delete_all_pubota_alarms_for_guild(guild.id);
            }
            //             if (f == 0 && a == 0) {
            //                 utility_functions.send_message_to_default_channel(guild, `Hello, the bot is currently approaching 2500 servers.
            // At that point I need to update the bot.\nUnfortunately I did not have time to take care of that update.
            // As a result, I am once again asking you to kick the bot from this server **if you ARE NOT USING any alarms in this server**. Thank you`);
            //             }
        } catch (e) {
            logging.logger.error(e);
        }
    });

    try {
        await load_alarms.fetchPrivateAlarms(cron_list, cron, client);
        await load_alarms.fetchPrivateOTAs(cron_list, cron, client);
    } catch (err) {
        logging.logger.error(err);
    }
    client.user.setActivity("$help to get started!");
    logging.logger.info("Running in " + client.guilds.cache.size + " guilds");
});

/*************************** Execute Commands ************************/
client.on('message', async message => {
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
            try {
                await client.commands.get(command).execute(message, args, client, cron, cron_list, mongoose);
            } catch (error) {
                logging.logger.info(`An error has occured while executing the following command: ${message.content}`);
                logging.logger.error(error);
                message.reply('There was an error trying to execute that command!');
            }
        }
    }
});


// If the bot is kicked, delete the alarms
client.on('guildDelete', async (guild) => {
    logging.logger.info(`Bot left the guild: ${guild.id}... Deleting the alarms for that guild`);

    try {
        let results = await delete_alarms_when_kicked.deleteAlarmsForGuild(cron_list, guild.id);
        logging.logger.info(`Sucessfully deleted ${results.deletedCount} alarms that were being used in guild ${guild.id}`);
    } catch (e) {
        logging.logger.info(`An error has occured while trying to delete the alarms for guild ${guild.id}`);
        logging.logger.error(e);
    }
});

//Login
client.login(appsettings.token);