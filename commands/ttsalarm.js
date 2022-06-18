'use strict';

const auth = require('./../auth.json');
const time_utils = require('../Utils/time_validation');
const utils = require('../Utils/utility_functions');
const logging = require('../Utils/logging');
const alarm_index = require('../data_access/alarm_index');
const utility_functions = require('../Utils/utility_functions');
const { SlashCommandBuilder } = require('@discordjs/builders');

const TIMEZOME_PARAM = 'timezone';
const MINUTE_PARAM = 'minute';
const HOUR_PARAM = 'hour';
const DAY_OF_MONTH_PARAM = 'day_of_the_month';
const MONTH_PARAM = 'month';
const WEEKDAY_PARAM = 'weekday';
const MESSAGE_PARAM = 'message';
const CHANNEL_PARAM = 'channel';

module.exports = {
    name: 'ttsAlarm',
    description: 'Sets up a tts alarm that will be repeated. The user needs to make sure that they do not have the channel muted and that they have the channel open\n' +
        'This alarm will send a message to the _channel_ of the _server_ in which it is activated. Insert channel as the last parameter if you wish to send the message to a specific channel, otherwise it will send it to the channel you are typing the message on\n',
    usage: auth.prefix + 'ttsAlarm <timezone/city/UTC> <minute> <hour> <day_of_the_month> <month> <weekday> <message> <channel?>',
    data: new SlashCommandBuilder()
        .setName('ttsalarm')
        .setDescription('Sets up a tts alarm that will be repeated.')
        .addStringOption(option => option.setName(TIMEZOME_PARAM).setDescription('The timezone the alarm will follow'))
        .addStringOption(option => option.setName(MINUTE_PARAM).setDescription('The minute in which the alarm goes off'))
        .addStringOption(option => option.setName(HOUR_PARAM).setDescription('The hour in which the alarm goes off, * for every hour'))
        .addStringOption(option => option.setName(DAY_OF_MONTH_PARAM).setDescription('The day of the month in which the alarm goes off, * for every day'))
        .addStringOption(option => option.setName(MONTH_PARAM).setDescription('The month in which the alarm goes off, * for every month'))
        .addStringOption(option => option.setName(WEEKDAY_PARAM).setDescription('The weekday in which the alarm goes off, * for every weekday'))
        .addStringOption(option => option.setName(MESSAGE_PARAM).setDescription('The message to be sent'))
        .addChannelOption(option => option.setName(CHANNEL_PARAM).setDescription('The channel for which the alarm will be sent (optional)')),
    async execute(interaction, cron_list, cron) {
        if (!utility_functions.can_send_tts_messages(interaction)) {
            interaction.channel.send('Impossible to setup tts messages, because the bot does not have TTS permission for this server!');
            return;
        }
        let canCreate = await utils.can_create_public_alarm(interaction.user.id, interaction.guild.id);
        if (!canCreate) {
            interaction.channel.send(auth.limit_alarm_message);
            return;
        }
        if (!(utils.hasAlarmRole(interaction, auth.alarm_role_name) || utils.isAdministrator(interaction))) {
            interaction.channel.send('You do not have permissions to set that alarm! Ask for the admins on your server to create and (then) give you the `Alarming` role!');
            return;
        }
        let timezone = interaction.options.getString(TIMEZOME_PARAM);
        let minute = interaction.options.getString(MINUTE_PARAM);
        let hour = interaction.options.getString(HOUR_PARAM);
        let day_of_the_month = interaction.options.getString(DAY_OF_MONTH_PARAM);
        let month = interaction.options.getString(MONTH_PARAM);
        let weekday = interaction.options.getString(WEEKDAY_PARAM);
        let message_stg = interaction.options.getString(MESSAGE_PARAM);

        if (!timezone || !minute || !hour || !day_of_the_month || !month || !weekday || !message_stg) {
            await interaction.reply({ content: 'You forgot to provide some parameter. You must assign value to all parameters except `channel`, that is optional', ephemeral: true });
            return;
        }
        let crono = `${minute} ${hour} ${day_of_the_month} ${month} ${weekday}`;
        let difference = time_utils.get_offset_difference(timezone);
        if (difference === undefined) {
            interaction.reply({
                content: 'The timezone you have entered is invalid. Please do `/timezonesinfo` for more information',
                ephemeral: true
            });
            return;
        }

        if (time_utils.validate_alarm_parameters(interaction, crono, message_stg)) {
            let channelParam = interaction.options.getChannel(CHANNEL_PARAM);
            let hasSpecifiedChannel = channelParam !== null;
            let channel_discord = interaction.channel;
            if (hasSpecifiedChannel) {
                channel_discord = channelParam;
            }
            if (channel_discord !== undefined) {
                if (!utility_functions.can_send_ttsmessages_to_ch(interaction, channel_discord)) {
                    interaction.reply({
                        content: `Cannot setup the alarm in channel ${channel_discord.id} because the bot does not have permission to send messages to it.`,
                        ephemeral: true
                    });
                    return;
                }
                let old_c = crono;
                crono = time_utils.updateParams(difference, crono);
                try {
                    // generate the id to save in the db
                    let alarm_user = interaction.user.id;
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

                    await alarm_index.add_ttsAlarm(alarm_id, crono, message_stg, interaction.guild.id, channel_discord.id, alarm_user, interaction.guild.name);
                    if (utility_functions.can_send_embeded(interaction)) {
                        logging.logger.info(`Added ${alarm_id} to tts db`);

                        interaction.reply({
                            embeds: [{
                                fields: { name: `Created TTS alarm ${alarm_id}!`, value: `Alarm with params: ${old_c} and message ${message_stg} for channel ${channel_discord.name} was added with success!` },
                                timestamp: new Date()
                            }],
                            ephemeral: true
                        });
                    } else {
                        interaction.reply({
                            content: `TTS alarm with params: ${old_c} and message ${message_stg} for channel ${channel_discord.name} was added with success!`,
                            ephemeral: true
                        });
                    }
                } catch (err) {
                    logging.logger.info(`An error occured while trying to add alarm with params: ${interaction.content}`);
                    logging.logger.error(err);
                    interaction.reply({
                        content: `Error adding the alarm with params: ${crono}, with message ${message_stg}`,
                        ephemeral: true
                    });
                }
            } else {
                interaction.reply({
                    content: 'It was not possible to use the channel to send the message... Please check the setting of the server and if the bot has the necessary permissions!',
                    ephemeral: true
                });
            }
        }
    }
};