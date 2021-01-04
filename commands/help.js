const fs = require("fs");
const auth = require('./../auth.json');
const Discord = require('discord.js');
const logging = require('../Utils/logging');

module.exports = {
    name: 'help',
    description: 'DMs the requiree a list with all the available commands',
    usage: auth.prefix + 'help',

    execute(message, args, client, cron_list) {
        fs.readdir("./commands/", (err, files) => {
            if (err) logging.logger.error(err);
            let jsfiles = files.filter(f => f.split(".").pop() === "js");
            if (jsfiles.length <= 0) {
                message.author.send("No commands to load!");
                return;
            }
            let msg_fields = [];
            jsfiles.forEach((f) => {
                let props = require(`./${f}`);
                var namelist = props.name;
                var desclist = props.description;
                var usage = props.usage;
                msg = `\tDescription - ${desclist} \n\tUsage - ${usage}\n`;
                field = {
                    name: `Command - **${namelist}**`,
                    value: msg
                }
                msg_fields.push(field);
            });

            // sends dm
            try {
                message.author.send({
                    embed: {
                        color: 0xff80d5,
                        title: 'A list of my commands',
                        fields: msg_fields,
                        timestamp: new Date()
                    }
                });
            } catch (e) {
                logging.logger.info(`Error trying to get the help command`);
                logging.logger.error(e);
            }
        });
    },
};
