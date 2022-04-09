const fs = require("fs");
const auth = require('./../auth.json');
const logging = require('../Utils/logging');
const utility_functions = require('../Utils/utility_functions');
const { SlashCommandBuilder } = require('@discordjs/builders');

module.exports = {
    name: 'help',
    description: 'DMs the requiree a list with all the available commands',
    usage: auth.prefix + 'help',
    data: new SlashCommandBuilder()
        .setName("help")
        .setDescription('DMs the requiree a list with all the available commands'),
    execute(message, args, client, cron_list) {
        fs.readdir("./commands/", (err, files) => {
            if (err) logging.logger.error(err);
            let jsfiles = files.filter(f => f.split(".").pop() === "js");
            if (jsfiles.length <= 0) {
                message.author.send("No commands to load!").catch((err) => {
                    logging.logger.info(`Can't send reply to user ${message.author.id}.`);
                    logging.logger.error(err);
                });;
                return;
            }
            let msg_fields = [];

            jsfiles.forEach((f) => {
                let props = require(`./${f}`);
                let namelist = props.name;
                let desclist = props.description;
                let usage = props.usage;
                msg = `\tDescription - ${desclist} \n\tUsage - ${usage}\n`;
                field = {
                    name: `Command - **${namelist}**`,
                    value: msg
                }
                msg_fields.push(field);
            });

            msg_fields.push(field = {
                name: 'Join our discord server for more information!',
                value: 'https://discord.gg/zV3xnt8zkA'
            });
            msg_fields.push(field = {
                name: 'Unlock premium and/or support the alarm creator',
                value: 'https://ko-fi.com/alarmbot'
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
                }).catch((err) => {
                    logging.logger.info(`Can't send reply to help from user ${message.author.id}.`);
                    logging.logger.error(err);
                    if (message.channel.type !== 'dm' && utility_functions.can_send_messages_to_ch(message, message.channel)) {
                        message.channel.send({
                            embed: {
                                color: 0xff80d5,
                                title: 'A list of my commands',
                                fields: msg_fields,
                                timestamp: new Date()
                            }
                        });
                    }
                });;
            } catch (e) {
                logging.logger.info(`Error trying to get the help command`);
                logging.logger.error(e);
            }
        });
    },
};
