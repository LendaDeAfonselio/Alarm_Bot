// Packages and dependencies
const Discord = require('discord.js');
const auth = require('./auth.json');
const appsettings = require('./appsettings.json');
const load_alarms = require('./load_alarms');
// TODO: Change token to appsettings later

// Mongo setup
const mongoose = require("mongoose");
mongoose.connect(appsettings.mongo_db_url, { useUnifiedTopology: true, useNewUrlParser: true }, (err) => {
    if (err)
        console.error(err);
    else
        console.log("Connected to the mongodb");
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
    //Retrieves all main channels the bot is in 

    client.guilds.cache.forEach(async (guild) => { //for each guild the bot is in
        let defaultChannel = "";
        guild.channels.cache.forEach(async (channel) => {
            if (channel.name == 'bot-and-emote-spam' && channel.type == "text" && defaultChannel == "") {
                if (channel.permissionsFor(guild.me).has("SEND_MESSAGES")) {
                    defaultChannel = channel;
                }
            }
        });
        try {
            await load_alarms.fetchAlarmsforGuild(cron_list, cron, guild, guild.id);
            await load_alarms.fetchPrivateAlarms(cron_list, cron, guild, guild.id);
        } catch (e) {
            console.log(e);
        }
    });
    client.user.setActivity("$help to get started!");
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
                console.error(error);
                message.reply('there was an error trying to execute that command!');
            }
        }
    }
});

//Login
client.login(appsettings.token);