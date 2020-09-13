// Packages and dependencies
const Discord = require('discord.js');
const auth = require('./auth.json');
const token = require('./token.json');


// Instances
const client = new Discord.Client();
const cron_list = {};
const cron = require('cron').CronJob;
const fs = require('fs');

// setup a list and a file with all cron jobs so they can be recharged upon start up and deleted from the file if altered


/****** Gets all available commands ******/
client.commands = new Discord.Collection();
const commandFiles = fs.readdirSync('./commands').filter(file => file.endsWith('.js'));

for (const file of commandFiles) {
    const command = require(`./commands/${file}`);
    client.commands.set(command.name, command);
}


/****** Setup the bot for life upon startup ******/
client.once('ready', () => {
    // client.user.setActivity(" with NP-Hard Problems");
    //Retrieves all main channels the bot is in 

    client.guilds.cache.forEach((guild) => { //for each guild the bot is in
        let defaultChannel = "";
        guild.channels.cache.forEach((channel) => {
            if (channel.name == 'bot-and-emote-spam' && channel.type == "text" && defaultChannel == "") {
                if (channel.permissionsFor(guild.me).has("SEND_MESSAGES")) {
                    defaultChannel = channel;
                }
            }
        });
    });

});

/*************************** Execute Commands ************************/
client.on('message', message => {
    const channelPrefix = auth.prefix;
    // console.log(cron_list);
    if (!message.content.startsWith(channelPrefix)) return;
    else {
        var args = message.content.slice(auth.prefix.length).split(/ +/);
        var command = args.shift();
        if (!client.commands.has(command)) return;
        else {
            try {
                client.commands.get(command).execute(message, args, client, cron, cron_list);
            } catch (error) {
                console.error(error);
                message.reply('there was an error trying to execute that command!');
            }
        }
    }
});

//Login
client.login(token.token);