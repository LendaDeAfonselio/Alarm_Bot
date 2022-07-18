'use strict';

const Private_alarm_model = require('../models/private_alarm_model');
const auth = require('./../auth.json');
const private_flag = auth.private_prefix;
const utils = require('../Utils/time_validation');
const time_utils = require('../Utils/time_validation');
const logging = require('../Utils/logging');
const gen_utils = require('../Utils/utility_functions');
const { SlashCommandBuilder } = require('@discordjs/builders');

const TIMEZOME_PARAM = 'timezone';
const MINUTE_PARAM = 'minute';
const HOUR_PARAM = 'hour';
const DAY_OF_MONTH_PARAM = 'day_of_the_month';
const MONTH_PARAM = 'month';
const WEEKDAY_PARAM = 'weekday';
const MESSAGE_PARAM = 'message';

module.exports = {
    name: 'privateAlarm',
    description: 'Sets up a private alarm that will be repeated as specified in the arguments\n' +
        'The remainders will be sent to you via Direct Message!\n' +
        '**The bot has to have a server in common with you to send a private message!**',
    usage: '`/privateAlarm <timezone> <m> <h> <day_of_month> <month> <year> <weekday> <message>`',
    data: new SlashCommandBuilder()
        .setName('privatealarm')
        .setDescription('Sets up a private alarm that will be repeated as specified in the arguments')
        .addStringOption(option => option.setName(TIMEZOME_PARAM).setDescription('The timezone the alarm will follow'))
        .addStringOption(option => option.setName(MINUTE_PARAM).setDescription('The minute in which the alarm goes off'))
        .addStringOption(option => option.setName(HOUR_PARAM).setDescription('The hour in which the alarm goes off, * for every hour'))
        .addStringOption(option => option.setName(DAY_OF_MONTH_PARAM).setDescription('The day of the month in which the alarm goes off, * for every day'))
        .addStringOption(option => option.setName(MONTH_PARAM).setDescription('The month in which the alarm goes off, * for every month'))
        .addStringOption(option => option.setName(WEEKDAY_PARAM).setDescription('The weekday in which the alarm goes off, * for every weekday'))
        .addStringOption(option => option.setName(MESSAGE_PARAM).setDescription('The message to be sent')),
    async execute(interaction, cron_list, cron) {
        let canCreate = await gen_utils.can_create_private_alarm(interaction.user.id);
        let timezone = interaction.options.getString(TIMEZOME_PARAM);
        let minute = interaction.options.getString(MINUTE_PARAM);
        let hour = interaction.options.getString(HOUR_PARAM);
        let day_of_the_month = interaction.options.getString(DAY_OF_MONTH_PARAM);
        let month = interaction.options.getString(MONTH_PARAM);
        let weekday = interaction.options.getString(WEEKDAY_PARAM);
        let message_stg = interaction.options.getString(MESSAGE_PARAM);
        if (!canCreate) {
            interaction.channel.send('You have reached the maximum ammount of private alarms! Use `$premium` to discover how to get more alarms');
            return;
        }
        if (!timezone || !minute || !hour || !day_of_the_month || !month || !weekday || !message_stg) {
            await interaction.reply({ content: 'You forgot to provide some parameter. You must assign value to all parameters except `channel`, that is optional', ephemeral: true });
            return;
        }
        let crono = `${minute} ${hour} ${day_of_the_month} ${month} ${weekday}`;
        let difference = time_utils.get_offset_difference(timezone);
        if (difference === undefined) {
            interaction.channel.send('The timezone you have entered is invalid. Please do `' + auth.prefix + 'timezonesinfo` for more information');
        }
        if (utils.validate_alarm_parameters(interaction, crono, message_stg)) {
            let old_c = crono;

            crono = time_utils.updateParams(difference, crono);
            try {
                let alarm_user = interaction.user.id;
                let this_alarm_id = Math.random().toString(36).substring(4);
                let alarm_id = `${private_flag}_${this_alarm_id}`;

                let scheduledMessage = new cron(crono, () => {
                    interaction.user.send(message_stg).catch((err) => {
                        logging.logger.info(`Can't send private message to user ${interaction.user.id}. ${alarm_id}.`);
                        logging.logger.error(err);
                        if (interaction.channel.type !== 'dm' && gen_utils.can_send_messages_to_ch(interaction, interaction.channel)) {
                            interaction.reply(`Cannot send you the DM for alarm with id ${alarm_id}. Check your permissions for DMs!`);
                        }

                    });

                }, {
                    scheduled: true
                });
                scheduledMessage.start();

                // save locally
                cron_list[alarm_id] = scheduledMessage;

                // save to DB
                const newAlarm = new Private_alarm_model({
                    alarm_id: alarm_id,
                    alarm_args: crono,
                    message: message_stg,
                    user_id: alarm_user,
                    isActive: true,
                    timestamp: Date.now(),
                });
                newAlarm.save()
                    .then(async (_) => {
                        logging.logger.info(`Added ${alarm_id} to private alarm db`);

                        await interaction.reply({
                            embeds: [{
                                color: 2447003,
                                timestamp: new Date(),
                                fields: [{
                                    name: `Created alarm ${alarm_id}!`, value: `Private alarm with crono: \`${old_c}\` and message: \`${message_stg}\` added!`
                                }]
                            }],
                            ephemeral: true
                        }).catch(async (err) => {
                            logging.logger.info(`Can't send private message to user ${interaction.user.id}. Confirming the alarm ${alarm_id}.`);
                            logging.logger.error(err);
                            if (interaction.channel.type !== 'dm' && gen_utils.can_send_messages_to_ch(interaction, interaction.channel)) {
                                await interaction.reply({
                                    content: `Cannot send you the DM for alarm with id ${alarm_id}. Check your permissions for DMs! The alarm was stored, but with your current preferences the bot will not be able to send the message to you!`
                                    , ephemeral: true
                                });
                            }
                        });
                    })
                    .catch((err) => {
                        logging.logger.info(`Error adding private alarm to the database ${newAlarm}`);
                        logging.logger.error(err);
                    });
            } catch (err) {
                logging.logger.info(`Error adding a private alarm with params:${interaction}`);
                logging.logger.error(err);
                interaction.reply({
                    content: `Error adding the alarm with params: ${crono}, with message ${interaction}. Try verifying if there are enough arguments and if they are correct.`,
                    ephemeral: true
                });
            }
        }
    }
};

