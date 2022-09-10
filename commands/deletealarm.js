'use strict';
const Alarm_model = require('../models/alarm_model');

const utility_functions = require('../Utils/utility_functions');
const { SlashCommandBuilder } = require('@discordjs/builders');

const logging = require('../Utils/logging');
const db_alarms = require('../data_access/alarm_index');
const ALARM_ID_FLAG = 'alarm-id';

module.exports = {
    name: 'deleteAlarm',
    description: 'Deletes the alarm with a given id CANNOT',
    usage: '/deleteAlarm <id>',
    data: new SlashCommandBuilder()
        .setName('deletealarm')
        .setDescription('Deletes the alarm with a given id - **THIS ACTION CANNOT BE REVERTED**')
        .addStringOption(option => option.setName(ALARM_ID_FLAG).setDescription('The id of the alarm')),
    async execute(interaction, cron_list) {
        let alarm_to_delete = interaction.options.getString(ALARM_ID_FLAG);

        if (alarm_to_delete && alarm_to_delete !== null) {
            if (!(await utility_functions.can_change_alarm(interaction, alarm_to_delete))) {
                await interaction.reply({
                    content: 'The alarm you selected is not yours or you aren\'t administrator on this server therefore you cannot delete it!\nIf you are the admin try checking the permissions of the bot.',
                    ephemeral: true
                });
            }
            else {
                if (cron_list[alarm_to_delete] !== undefined) {
                    try {
                        if (utility_functions.isPublicAlarm(alarm_to_delete)) {
                            await Alarm_model.deleteOne({ alarm_id: alarm_to_delete });
                        } else if (utility_functions.isOtaAlarm(alarm_to_delete)) {
                            await db_alarms.delete_oneTimeAlarm_with_id(alarm_to_delete);
                        } else if (utility_functions.isTTSAlarm(alarm_to_delete)) {
                            await db_alarms.delete_ttsAlarm_with_id(alarm_to_delete);
                        }
                        cron_list[alarm_to_delete].stop();
                        delete cron_list[alarm_to_delete];
                        await interaction.reply({
                            content: `Sucessfully deleted alarm: ${alarm_to_delete}.`,
                        });
                    } catch (e) {
                        logging.logger.info(`Error deleting alarm with id:${alarm_to_delete}... Please try again later!`);
                        logging.logger.error(e);
                        await interaction.reply({
                            content: `Error deleting alarm with id:${alarm_to_delete}... Please try again later!`,
                            ephemeral: true
                        });
                    }
                }
                else {
                    await interaction.reply(
                        {
                            content: `Impossible to delete alarm with id ${alarm_to_delete}.\nTry again later. If the problem persist use the bot support server`,
                            ephemeral: true
                        }
                    );
                }
            }
        } else {
            await interaction.reply(`No arguments were passed to execute this command.\nUsage: ${this.usage}`);
        }

    }
};