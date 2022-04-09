"use strict";
const { SlashCommandBuilder } = require('@discordjs/builders');

const Alarm_model = require('../models/alarm_model');
const auth = require('./../auth.json');
const time_utils = require('../Utils/time_validation');
const utils = require('../Utils/utility_functions');
const logging = require('../Utils/logging');
const utility_functions = require('../Utils/utility_functions');
const channel_regex = /<#\d+>/;

module.exports = {
    name:'alarm' ,
    description: 'Sets up an alarm that will be repeated according to parameters passed',
    usage: auth.prefix + 'alarm <timezone/city/UTC> <minute> <hour> <day_of_the_month> <month> <weekday> <message> <channel?>',
    data: new SlashCommandBuilder()
        .setName('alarm')
        .setDescription('Sets up an alarm that will be repeated according to parameters passed'),
    async execute(msg, args, client, cron, cron_list, mongoose) {
        if (msg.channel.type === 'dm') {
            msg.channel.send('Impossible to setup a public alarm via DM, you have to use this command in a server! For a DM alarm use `' + auth.prefix + 'privateAlarm` command');
            return;
        }
        let canCreate = await utils.can_create_public_alarm(msg.author.id, msg.guild.id);
        if (!canCreate) {
            msg.channel.send(auth.limit_alarm_message);
            return;
        }
        if (utils.hasAlarmRole(msg, auth.alarm_role_name) || utils.isAdministrator(msg)) {
            if (args.length > 6) {
                var timezone = args[0];
                var crono = args.slice(1, 6).join(' ');
                var message_stg = args.slice(6, args.length).join(' ');
                var difference = time_utils.get_offset_difference(timezone);
                if (difference === undefined) {
                    msg.channel.send('The timezone you have entered is invalid. Please do `' + auth.prefix + 'timezonesinfo` for more information');
                }
                else if (time_utils.validate_alarm_parameters(msg, crono, message_stg)) {
                    var channel = args.pop();
                    var hasSpecifiedChannel = channel_regex.test(channel);
                    let channel_discord = msg.channel;
                    if (hasSpecifiedChannel) {
                        channel_discord = msg.guild.channels.cache.get(channel.replace(/[<>#]/g, ''));
                        message_stg = args.slice(6, args.length).join(' ');
                    }
                    if (channel_discord !== undefined) {
                        if (!utility_functions.can_send_messages_to_ch(msg, channel_discord)) {
                            msg.channel.send(`Cannot setup the alarm in channel ${channel} because the bot does not have permission to send messages to it.`)
                            return;
                        }
                        let old_c = crono;
                        crono = time_utils.updateParams(difference, crono);
                        try {
                            // generate the id to save in the db
                            let alarm_user = msg.author.id;
                            let this_alarm_id = Math.random().toString(36).substring(4);
                            let alarm_id = `${auth.public_alarm_prefix}_${this_alarm_id}`;

                            let scheduledMessage = new cron(crono, () => {
                                try {
                                    channel_discord.send(`${message_stg}`);
                                } catch (err) {
                                    logging.logger.error(`Error when alarm with id ${alarm_id} went off: ${err}`);
                                }
                            }, {
                                scheduled: true
                            });
                            scheduledMessage.start();
                            // save locally
                            cron_list[alarm_id] = scheduledMessage;

                            // save to DB
                            const newAlarm = new Alarm_model({
                                alarm_id: alarm_id,
                                alarm_args: crono,
                                user_id: alarm_user,
                                message: message_stg,
                                guild: msg.guild.id,
                                server_name: msg.guild.name,
                                channel: channel_discord.id,
                                isActive: true,
                                timestamp: Date.now(),
                            });
                            newAlarm.save()
                                .then((result) => {
                                    if (utility_functions.can_send_embeded(msg)) {
                                        msg.channel.send({
                                            embed: {
                                                fields: { name: `Alarm with id: ${alarm_id} added!`, value: `Alarm with params: ${old_c} and message ${message_stg} for channel ${channel_discord.name} was added with success!` },
                                                timestamp: new Date()
                                            }
                                        });
                                    }
                                    else {
                                        msg.channel.send(`Alarm with params: ${old_c} and message ${message_stg} for channel ${channel_discord.name} was added with success! Consider turning on embed links for the bot to get a prettier message :)`);
                                    }
                                })
                                .catch((err) => {
                                    logging.logger.info(`An error while trying to add ${alarm_id} to the database.`);
                                    logging.logger.error(err);
                                });
                        } catch (err) {
                            logging.logger.info(`An error while trying to add alarm with params: ${msg.content}`);
                            logging.logger.error(err);
                            msg.channel.send(`Error adding the alarm with params: ${crono}, with message ${message_stg}`);
                        }
                    } else {
                        msg.channel.send('It was not possible to use the channel to send the message... Please check the setting of the server and if the bot has the necessary permissions!');
                    }
                }
            } else {
                msg.channel.send('Not enough parameters were passed.\n' +
                    'Usage: ' + this.usage
                );
            }
        }
        else {
            msg.channel.send('You do not have permissions to set that alarm! Ask for the admins on your server to create and (then) give you the `Alarming` role!');
        }
    }
};


