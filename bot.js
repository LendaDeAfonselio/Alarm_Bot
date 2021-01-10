// Packages and dependencies
const Discord = require('discord.js');
const auth = require('./auth.json');
const appsettings = require('./appsettings.json');
const load_alarms = require('./load_alarms');
const logging = require('./Utils/logging');

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
    client.commands.set(command.name, command);
}


/****** Setup the bot for life upon startup ******/
client.once('ready', async x => {
    client.guilds.cache.forEach(async (guild) => { //for each guild the bot is in
        try {
            await load_alarms.fetchAlarmsforGuild(cron_list, cron, guild, guild.id);
            await load_alarms.fetchPrivateAlarms(cron_list, cron, guild, guild.id);
        } catch (e) {
            logging.logger.error(e);
        }
    });
    client.user.setActivity("$help to get started!");
    logging.logger.info("Running in " + client.guilds.cache.size + " guilds");
});

/*************************** Execute Commands ************************/
client.on('message', async message => {
    const channelPrefix = auth.prefix;
    if (!message.content.startsWith(channelPrefix)) return;
    else {
        var args = message.content.slice(auth.prefix.length).split(/ +/);
        var command = args.shift();
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

//Login
client.login(appsettings.token);