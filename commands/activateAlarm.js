const { SlashCommandBuilder } = require('@discordjs/builders');

const Alarm_model = require('../models/alarm_model');
const Private_alarm_model = require('../models/private_alarm_model');
const utility_functions = require('../Utils/utility_functions');

const logging = require('../Utils/logging');
const alarm_id_flag = 'alarm-id';

module.exports = {
    data: new SlashCommandBuilder()
        .setName('activatealarm')
        .setDescription('Activates a silenced alarm')
        .addStringOption(option => option.setName(alarm_id_flag).setDescription('The id of the alarm')),
    name: 'activateAlarm',
    description: 'Activates an alarm with a given id that was silenced previously',
    usage: '/activatealarm <id>',
    async execute(interaction, cron_list) {
        let alarm_to_activate = interaction.options.getString(alarm_id_flag);

        if (alarm_to_activate !== null) {

            if (utility_functions.isOtaAlarm(alarm_to_activate)) {
                await interaction.reply('You cannot activate a oneTimeAlarm because they cannot be silenced...');
                return;
            }

            if (!(await utility_functions.can_change_alarm(interaction, alarm_to_activate))) {
                await interaction.reply(`The alarm you selected isn't yours or you aren't administrator on this server therefore you cannot silence it!`)
            }
            else {
                if (cron_list[alarm_to_activate] !== undefined) {
                    if (!cron_list[alarm_to_activate].running) {
                        // add verification for DMs and guild id
                        try {
                            if (utility_functions.isPrivateAlarm(alarm_to_activate)) {
                                await Private_alarm_model.updateOne(
                                    { alarm_id: alarm_to_activate },
                                    {
                                        isActive: true
                                    }
                                )
                            } else if (utility_functions.isPublicAlarm(alarm_to_activate)) {
                                await Alarm_model.updateOne(
                                    { alarm_id: alarm_to_activate },
                                    {
                                        isActive: true
                                    }
                                )
                            }
                            cron_list[alarm_to_activate].start();
                            await interaction.reply(`${alarm_to_activate} is now active again.`);
                        } catch (e) {
                            logging.logger.info(`Error re-activating alarm with id:${alarm_to_activate}... Please try again later!`);
                            logging.logger.error(e);
                            await interaction.reply(`Error re-activating alarm with id:${alarm_to_activate}... Please try again later!`);
                        }
                    } else {
                        await interaction.reply(`Alarm with id ${alarm_to_activate} has already been silenced.\nTo see the status of your alarms type: /myalarms`);

                    }
                }
                else {
                    await interaction.reply(`Impossible to silence alarm with id ${alarm_to_activate}.\nPlease try again later.`);
                }
            }
        } else {
            await interaction.reply('No alarm id received');
        }

    }
};