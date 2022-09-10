'use strict';
const Alarm_model = require('../models/alarm_model');
const alarm_db = require('../data_access/alarm_index');
const auth = require('./../auth.json');
const logging = require('../Utils/logging');
const utility_functions = require('../Utils/utility_functions');
const { SlashCommandBuilder } = require('@discordjs/builders');
const PUBLIC_COMMAND = 'public';
const ONE_TIME_PUBLIC_COMMAND = 'ota';
const TTS_COMMAND = 'tts';


module.exports = {
    name: 'deleteAllAlarms',
    description: 'Deletes all of YOUR alarms in the server - **THIS ACTION CANNOT BE REVERTED**\n' +
        '-a for public alarms of that server; -p for private alarms; -oa for public one time alarms; -op for private one time alarms',
    usage: `\`${auth.prefix}deleteAllAlarms -a\`; or \`${auth.prefix}deleteAllAlarms -p\`; or \`${auth.prefix}deleteAllAlarms -oa\`; or \`${auth.prefix}deleteAllAlarms -op\`\nUse -a to silence all private alarms,
     -p for private alarms; -oa for public one time alarms; -op for private one time alarms`,
    data: new SlashCommandBuilder()
        .setName('deleteallalarms')
        .setDescription('Deletes all of YOUR alarms in the server')
        .addSubcommand(option => option.setName(PUBLIC_COMMAND).setDescription('Deletes all public alarms in this server'))
        .addSubcommand(option => option.setName(ONE_TIME_PUBLIC_COMMAND).setDescription('Deletes all public one time alarms in this server'))
        .addSubcommand(option => option.setName(TTS_COMMAND).setDescription('Deletes all one time private alarms')),

    async execute(interaction, cron_list) {
        let subcommand = interaction.options.getSubcommand();

        let alarm_user = interaction.user.id;
        if (subcommand && subcommand !== null) {

            if (subcommand === PUBLIC_COMMAND) {
                try {
                    let to_be_removed = await Alarm_model.find({
                        $and: [
                            { user_id: alarm_user },
                            { guild: interaction.guild?.id },
                        ]
                    });
                    if (to_be_removed.length > 0) {
                        //delete regular alarms
                        let y = await Alarm_model.deleteMany({
                            $and: [
                                { user_id: alarm_user },
                                { guild: interaction.guild.id },
                            ]
                        });
                        to_be_removed.find(function (i) {
                            if (cron_list[i.alarm_id] !== undefined) {
                                cron_list[i.alarm_id]?.stop();
                                delete cron_list[i.alarm_id];
                            }
                        });
                        interaction.reply(`Sucessfully deleted ${y?.deletedCount} alarms.`);
                    } else {
                        interaction.reply({ content: 'No alarm found for you in this server. Try `myAlarms` to check your alarms', ephemeral: true });
                    }
                } catch (e) {
                    logging.logger.info(`Error deleting alarms for user:${alarm_user} with params ${subcommand}`);
                    logging.logger.error(e);
                    interaction.reply({ content: 'Error deleting your alarms... Try again later', ephemeral: true });
                }
            }
            else if (subcommand === ONE_TIME_PUBLIC_COMMAND) {
                let private_ota = await alarm_db.get_all_oneTimeAlarm_from_user(alarm_user, '');
                private_ota.find(function (i) {
                    if (cron_list[i.alarm_id] !== undefined) {
                        cron_list[i.alarm_id]?.stop();
                        delete cron_list[i.alarm_id];
                    }
                });
                let f = await alarm_db.delete_all_public_oneTimeAlarm_from_user(alarm_user, interaction.guild?.id);
                interaction.reply(`Sucessfully deleted ${f?.deletedCount} alarms.`);

            }
            else if (subcommand === TTS_COMMAND) {
                let tts_alarms = await alarm_db.get_all_ttsalarms_from_user_and_guild(alarm_user, interaction.guild?.id);
                tts_alarms.find(i => utility_functions.deleteFromCronList(cron_list, i));
                let num_del_tts = await alarm_db.delete_all_ttsAlarm_from_user(alarm_user, interaction.guild?.id);
                interaction.reply(`Sucessfully deleted ${num_del_tts.deletedCount} tts alarms.`);
            }
        } else {
            let stg = 'You did not specify what alarms you wish to delete. Check the options for this command';
            interaction.reply({ content: stg, ephemeral: true });
        }
    }
};