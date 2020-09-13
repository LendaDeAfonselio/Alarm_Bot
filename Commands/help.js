const fs = require("fs");
const auth = require('./../auth.json');
const Discord = require('discord.js');


module.exports = {
    name: 'help',
    description: 'DMs the requiree a list with all the available commands',
    usage: auth.prefix + 'help',

    execute(message, args, client, cron_list) {
        fs.readdir("./commands/", (err, files) => {
            if (err) console.error(err);
            let jsfiles = files.filter(f => f.split(".").pop() === "js");
            if (jsfiles.length <= 0) {
                message.author.send("No commands to load!");
                return;
            }
            const embed = new Discord.MessageEmbed()
                .setTitle("A list of my commands:")
                .setColor(0xff80d5);
            jsfiles.forEach((f) => {
                let props = require(`./${f}`);
                var namelist = props.name;
                var desclist = props.description;
                var usage = props.usage;
                msg = `Command - **${namelist}** \n\tDescription - ${desclist} \n\tUsage - ${usage}\n`;
                embed.addField(msg);
            });

            // sends dm
            message.author.send({ embed });
        });
    },
};