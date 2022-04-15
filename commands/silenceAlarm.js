"use strict";

const Alarm_model = require('../models/alarm_model');
const Private_alarm_model = require('../models/private_alarm_model');

const logging = require('../Utils/logging');
const { SlashCommandBuilder } = require('@discordjs/builders');

const utility_functions = require('../Utils/utility_functions');
const ALARM_ID_FLAG = 'alarm-id';
const TIMEOUT = 'reactivate-date';

module.exports = {
    name: 'silenceAlarm',
    description: 'Silences the alarm with a given id. If you also pass a date it will activate automatically once that day arrives otherwise it will be silenced until you turn it back on using /activateAlarm <id>',
    usage: '/silenceAlarm <id> <date_to_active_again?>',
    data: new SlashCommandBuilder()
        .setName("silencealarm")
        .setDescription("Silences the alarm with a given id")
        .addStringOption(option => option.setName(ALARM_ID_FLAG).setDescription('The id of the alarm'))
        .addStringOption(option => option.setName(TIMEOUT).setDescription('Date when the alarm will reactivate')),
    async execute(interaction, cron_list) {
        let alarm_to_silence = interaction.options.getString(ALARM_ID_FLAG);
        let timeout = interaction.options.getString(TIMEOUT);


        if (alarm_to_silence && alarm_to_silence != null) {

            if (utility_functions.isOtaAlarm(alarm_to_silence)) {
                await interaction.reply('Silence feature is not available for oneTimeAlarms, if you wish to silence a oneTimeAlarm just delete it with `$deleteAlarm ' + alarm_to_silence + '`');
                return;
            }

            if (!(await utility_functions.can_change_alarm(interaction, alarm_to_silence))) {
                await interaction.reply(`The alarm you selected isn't yours or you aren't administrator on this server therefore you cannot silence it!`);
                return;
            }

            if (!utility_functions.isPublicAlarm(alarm_to_silence) && interaction.channel.type === 'dm') {
                await interaction.reply('Impossible to silence a public alarm in DMs');
                return;
            }
            else {
                if (cron_list[alarm_to_silence] !== undefined) {
                    if (utility_functions.isPublicAlarm(alarm_to_silence)) {
                        let b = await can_be_silenced(alarm_to_silence, interaction);
                        if (!b) {
                            await interaction.reply('Alarm cannot be silenced. Check if it is setup in this server...');
                            return;
                        }
                    }
                    if (cron_list[alarm_to_silence].running) {
                        if (timeout && timeout !== null) {
                            let timeout_date = parseDate(timeout);
                            if (isValidDate(timeout_date)) {
                                let current_date = new Date();
                                if (timeout_date > current_date) {
                                    let c = new cron(timeout_date, async () => {
                                        if (!cron_list[alarm_to_silence].running) {
                                            cron_list[alarm_to_silence].start();
                                            await silenceAlarmWithID(alarm_to_silence, true);
                                            interaction.reply(`Alarm with id ${alarm_to_silence} is now active again!`);
                                        }
                                    });
                                    c.start();
                                    await interaction.reply(`Alarm will be activated again in ${timeout}`);
                                }
                                else {
                                    await interaction.reply('The date you have provided has already happened...');
                                    return;
                                }
                            } else {
                                await interaction.reply('The date you entered is invalid');
                                return;
                            }
                        }
                        try {
                            await silenceAlarmWithID(alarm_to_silence, false);
                            cron_list[alarm_to_silence].stop();
                            await interaction.reply(`${alarm_to_silence} is now silent.`);
                        } catch (e) {
                            logging.logger.info(`Error silencing alarm with id:${alarm_to_silence}... Please try again later!`);
                            logging.logger.error(e);
                            await interaction.reply(`Error silencing alarm with id:${alarm_to_silence}... Please try again later!`);
                        }
                    } else {
                        await interaction.reply(`Alarm with id ${alarm_to_silence} has already been silenced.\nTo see the status your alarms type: \`/myalarms\``);
                    }
                }
                else {
                    await interaction.reply(`Impossible to silence alarm with id ${alarm_to_silence}.\nPlease try again later.`);
                }
            }
        } else {
            await interaction.reply('No alarm id received');
        }

    }
};


function isValidDate(d) {
    return d instanceof Date && !isNaN(d);
}

function parseDate(date_args) {
    let date_tokens = date_args.split('/');
    if (date_tokens.length === 2 || date_tokens.length === 3) {
        let day = date_tokens[0];
        let month = date_tokens[1];
        let year = new Date().getFullYear();

        if (date_tokens.length === 3) {
            year = date_tokens[2];
        }

        let date_stg = `${year}-${month}-${day}`;
        let d = new Date(date_stg);
        return d;
    }
    return undefined;
}

async function silenceAlarmWithID(alarm_to_silence, activate) {
    if (utility_functions.isPrivateAlarm(alarm_to_silence)) {
        await Private_alarm_model.updateOne(
            { alarm_id: alarm_to_silence },
            {
                isActive: activate
            }
        );
    } else if (utility_functions.isPublicAlarm(alarm_to_silence)) {
        await Alarm_model.updateOne(
            { alarm_id: alarm_to_silence },
            {
                isActive: activate
            }
        );
    }
}

async function can_be_silenced(alarm_id, msg) {
    let guild_id = msg.guild?.id;
    let alarm = await Alarm_model.findOne({ alarm_id: alarm_id });
    return alarm.guild == guild_id;
}