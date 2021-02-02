// Packages and dependencies
const Discord = require('discord.js');
const auth = require('./auth.json');
const appsettings = require('./appsettings.json');
const load_alarms = require('./load_alarms');
const delete_alarms_when_kicked = require('./delete_alarms_for_guilds');
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
    let nameLowerCase = command.name.toString().toLowerCase();
    client.commands.set(nameLowerCase, command);
}


/****** Setup the bot for life upon startup ******/
client.once('ready', async x => {
    client.guilds.cache.forEach(async (guild) => { //for each guild the bot is in
        try {
            await load_alarms.fetchAlarmsforGuild(cron_list, cron, guild, guild.id);
        } catch (e) {
            logging.logger.error(e);
        }
    });
    await load_alarms.fetchPrivateAlarms(cron_list, cron, client);
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
        if (command !== undefined) {
            command = command.toLowerCase();
        }
        if (!client.commands.has(command)) return;
        else {
            if (message.channel.type === 'dm') {
                if (command === 'alarm') {
                    message.channel.send('Impossible to setup a public alarm via DM, you have to use this command in a server! For a DM alarm use `privateAlarm`');
                } else {
                    await client.commands.get(command).execute(message, args, client, cron, cron_list, mongoose);
                }
            }
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