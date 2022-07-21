'use strict';
const { ApplicationCommandType, SlashCommandBuilder } = require('discord.js');
const Alarm_model = require('../models/alarm_model');
const auth = require('./../auth.json');
const time_utils = require('../Utils/time_validation');
const utils = require('../Utils/utility_functions');
const logging = require('../Utils/logging');
const utility_functions = require('../Utils/utility_functions');

const TIMEZOME_PARAM = 'timezone';
const MINUTE_PARAM = 'minute';
const HOUR_PARAM = 'hour';
const DAY_OF_MONTH_PARAM = 'day_of_the_month';
const MONTH_PARAM = 'month';
const WEEKDAY_PARAM = 'weekday';
const MESSAGE_PARAM = 'message';
const CHANNEL_PARAM = 'channel';

module.exports = {
    name: 'alarm',
    description: 'Sets up an alarm that will be repeated according to parameters passed',
    usage: '`/alarm <timezone/city/UTC> <minute> <hour> <day_of_the_month> <month> <weekday> <message> <channel?>`',
    type: ApplicationCommandType.ChatInput,
    data: new SlashCommandBuilder()
        .setName('alarm')
        .setDescription('Sets up an alarm that will be repeated according to parameters passed')
        .addStringOption(option => option.setName(TIMEZOME_PARAM).setDescription('The timezone the alarm will follow'))
        .addStringOption(option => option.setName(MINUTE_PARAM).setDescription('The minute in which the alarm goes off'))
        .addStringOption(option => option.setName(HOUR_PARAM).setDescription('The hour in which the alarm goes off, * for every hour'))
        .addStringOption(option => option.setName(DAY_OF_MONTH_PARAM).setDescription('The day of the month in which the alarm goes off, * for every day'))
        .addStringOption(option => option.setName(MONTH_PARAM).setDescription('The month in which the alarm goes off, * for every month'))
        .addStringOption(option => option.setName(WEEKDAY_PARAM).setDescription('The weekday in which the alarm goes off, * for every weekday'))
        .addStringOption(option => option.setName(MESSAGE_PARAM).setDescription('The message to be sent'))
        .addChannelOption(option => option.setName(CHANNEL_PARAM).setDescription('The channel for which the alarm will be sent (optional)')),
    async execute(interaction, cron_list, cron) {
        if (interaction.channel.type === 'dm') {
            await interaction.reply('Impossible to setup a public alarm via DM, you have to use this command in a server! For a DM alarm use `/privateAlarm` command');
            return;
        }
        let canCreate = await utils.can_create_public_alarm(interaction.user.id, interaction.guild.id);
        if (!canCreate) {
            await interaction.reply(auth.limit_alarm_message);
            return;
        }
        if (utils.hasAlarmRole(interaction, auth.alarm_role_name) || utils.isAdministrator(interaction)) {
            const timezone = interaction.options.getString(TIMEZOME_PARAM);
            const minute = interaction.options.getString(MINUTE_PARAM);
            const hour = interaction.options.getString(HOUR_PARAM);
            const day_of_the_month = interaction.options.getString(DAY_OF_MONTH_PARAM);
            const month = interaction.options.getString(MONTH_PARAM);
            const weekday = interaction.options.getString(WEEKDAY_PARAM);
            const message_stg = interaction.options.getString(MESSAGE_PARAM);

            if (!timezone || !minute || !hour || !day_of_the_month || !month || !weekday || !message_stg) {
                await interaction.reply({ content: 'You forgot to provide some parameter. You must assign value to all parameters except `channel`, that is optional', ephemeral: true });
                return;
            }

            let crono = `${minute} ${hour} ${day_of_the_month} ${month} ${weekday}`;
            let difference = time_utils.get_offset_difference(timezone);
            if (difference === undefined) {
                await interaction.reply({ content: 'The timezone you have entered is invalid. Please do `/timezonesinfo` for more information', ephemeral: true });
            }
            else if (time_utils.validate_alarm_parameters(interaction, crono, message_stg)) {
                let channelParam = interaction.options.getChannel(CHANNEL_PARAM);
                let hasSpecifiedChannel = channelParam !== null;
                let channel_discord = interaction.channel;
                if (hasSpecifiedChannel) {
                    channel_discord = channelParam;
                }
                if (channel_discord !== undefined) {
                    if (!utility_functions.can_send_messages_to_ch(interaction, channel_discord)) {
                        interaction.reply(`Cannot setup the alarm in channel ${channel_discord.id} because the bot does not have permission to send messages to it.`);
                        return;
                    }
                    let old_c = crono;
                    crono = time_utils.updateParams(difference, crono);
                    try {
                        // generate the id to save in the db
                        let alarm_user = interaction.user.id;
                        let this_alarm_id = Math.random().toString(36).substring(4);
                        let alarm_id = `${auth.public_alarm_prefix}_${this_alarm_id}`;

                        let scheduledMessage = new cron(crono, () => {
                            try {
                                channel_discord.send(message_stg);
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
                            guild: interaction.guild.id,
                            server_name: interaction.guild.name,
                            channel: channel_discord.id,
                            isActive: true,
                            timestamp: Date.now(),
                        });
                        newAlarm.save()
                            .then(async (_) => {
                                if (utility_functions.can_send_embeded(interaction)) {
                                    logging.logger.info(`Added ${alarm_id} to alarm db`);
                                    await interaction.reply({
                                        embeds: [{
                                            fields: { name: `Created alarm ${alarm_id}!`, value: `Alarm with crono: \`${old_c}\` and message: \`${message_stg}\` for channel ${channel_discord.name} added!` },
                                            timestamp: new Date()
                                        }]
                                    });
                                }
                                else {
                                    await interaction.reply(`Alarm with params: ${old_c} and message ${message_stg} for channel ${channel_discord.name} was added with success! Consider turning on embed links for the bot to get a prettier message :)`);
                                }
                            })
                            .catch((err) => {
                                logging.logger.info(`An error while trying to add ${alarm_id} to the database.`);
                                logging.logger.error(err);
                            });
                    } catch (err) {
                        logging.logger.info(`An error while trying to add alarm with params: ${interaction.content}`);
                        logging.logger.error(err);
                        await interaction.reply(`Error adding the alarm with params: ${crono}, with message ${message_stg}`);
                    }
                } else {
                    await interaction.reply('It was not possible to use the channel to send the message... Please check the setting of the server and if the bot has the necessary permissions!');
                }
            }
        }
        else {
            await interaction.reply('You do not have permissions to set that alarm! Ask for the admins on your server to create and (then) give you the `Alarming` role!');
        }
    }
};


