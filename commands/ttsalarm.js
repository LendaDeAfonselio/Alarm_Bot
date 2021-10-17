"use strict";

const auth = require('./../auth.json');
const time_utils = require('../Utils/time_validation');
const utils = require('../Utils/utility_functions');
const logging = require('../Utils/logging');
const channel_regex = /<#\d+>/;
const alarm_index = require('../data_access/alarm_index');

module.exports = {
    name: 'ttsAlarm',
    description: 'Sets up a tts alarm that will be repeated. The user needs to make sure that they do not have the channel muted and that they have the channel open\n' +
        'This alarm will send a message to the _channel_ of the _server_ in which it is activated. Insert channel as the last parameter if you wish to send the message to a specific channel, otherwise it will send it to the channel you are typing the message on\n',
    usage: auth.prefix + 'ttsAlarm <timezone/city/UTC> <minute> <hour> <day_of_the_month> <month> <weekday> <message> <channel?>',
    async execute(msg, args, client, cron, cron_list, mongoose) {
        if (msg.channel.type === 'dm') {
            msg.channel.send('Impossible to setup a tts alarm via DM, you have to use this command in a server!');
            return;
        }
        let canCreate = await utils.can_create_public_alarm(msg.author.id, msg.guild.id);
        if (!canCreate) {
            msg.channel.send(auth.limit_alarm_message);
            return;
        }
        if (!(utils.hasAlarmRole(msg, auth.alarm_role_name) || utils.isAdministrator(msg))) {
            msg.channel.send('You do not have permissions to set that alarm! Ask for the admins on your server to give you the `Alarming` role!');
            return;
        }
        if (args.length <= 6) {
            msg.channel.send(`Not enough parameters were passed.\n 
                'Usage: ' + ${this.usage}`
            );
            return;
        }

        var timezone = args[0];
        var crono = args.slice(1, 6).join(' ');
        var message_stg = args.slice(6, args.length).join(' ');
        var difference = time_utils.get_offset_difference(timezone);
        if (difference === undefined) {
            msg.channel.send('The timezone you have entered is invalid. Please do `' + auth.prefix + 'timezonesinfo` for more information');
            return;
        }

        if (time_utils.validate_alarm_parameters(msg, crono, message_stg)) {
            var channel = args.pop();
            var hasSpecifiedChannel = channel_regex.test(channel);
            let channel_discord = msg.channel;
            if (hasSpecifiedChannel) {
                channel_discord = msg.guild.channels.cache.get(channel.replace(/[<>#]/g, ''));
                message_stg = args.slice(6, args.length).join(' ');
            }
            if (channel_discord !== undefined) {
                let old_c = crono;
                crono = time_utils.updateParams(difference, crono);
                try {
                    // generate the id to save in the db
                    let alarm_user = msg.author.id;
                    let this_alarm_id = Math.random().toString(36).substring(4);
                    let alarm_id = `${auth.tts_alarm_prefix}_${this_alarm_id}`;

                    let scheduledMessage = new cron(crono, () => {
                        try {
                            channel_discord.send(message_stg, {
                                tts: true
                            });
                        } catch (err) {
                            logging.logger.error(`Error when alarm with id ${alarm_id} went off: ${err}`);
                        }
                    }, {
                        scheduled: true
                    });
                    scheduledMessage.start();
                    // save locally
                    cron_list[alarm_id] = scheduledMessage;

                    await alarm_index.add_ttsAlarm(alarm_id, crono, message_stg, msg.guild.id, channel_discord.id, alarm_user, msg.guild.name);
                    msg.channel.send({
                        embed: {
                            fields: { name: `Created TTS alarm ${alarm_id}!`, value: `Alarm with params: ${old_c} and message ${message_stg} for channel ${channel_discord.name} was added with success!` },
                            timestamp: new Date()
                        }
                    });
                } catch (err) {
                    logging.logger.info(`An error occured while trying to add alarm with params: ${msg.content}`);
                    logging.logger.error(err);
                    msg.channel.send(`Error adding the alarm with params: ${crono}, with message ${message_stg}`);
                }
            } else {
                msg.channel.send(`It was not possible to use the channel to send the message... Please check the setting of the server and if the bot has the necessary permissions!`);
            }
        }
    }
}