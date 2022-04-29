'use strict';

const Alarm_model = require('../models/alarm_model');
const Private_alarm_model = require('../models/private_alarm_model');

const logging = require('../Utils/logging');
const { SlashCommandBuilder } = require('@discordjs/builders');
const PUBLIC_COMMAND = 'public';
const PRIVATE_COMMAND = 'private';
module.exports = {
    name: 'silenceallalarms',
    description: 'Silences all alarms until reactivation.\n-p to silence all private alarms and -a to silence all regular alarms on the server',
    usage: '`/silenceAllAlarms public` or `/silenceAllAlarms private`\nUse private to silence all private alarms, and public to silence regular alarms',
    data: new SlashCommandBuilder()
        .setName('silenceallalarms')
        .setDescription('Silences all alarms until reactivation')
        .addSubcommand(option => option.setName(PUBLIC_COMMAND).setDescription('Silences all public alarms'))
        .addSubcommand(option => option.setName(PRIVATE_COMMAND).setDescription('Silences all private alarms')),
    async execute(interaction, cron_list) {
        let subcommand = interaction.options.getSubcommand();

        if (subcommand !== null) {
            let alarm_user = interaction.user.id;

            try {
                if (subcommand === PRIVATE_COMMAND) {
                    let x = await Private_alarm_model.find(
                        { isActive: true, user_id: alarm_user }
                    );

                    // update in memory list
                    x.forEach(alarm => {
                        cron_list[alarm.alarm_id].stop();
                    });

                    await Private_alarm_model.updateMany(
                        { isActive: true, user_id: alarm_user },
                        { isActive: false }
                    );
                    await interaction.reply(`Sucesfully silenced ${x.length} private alarms.`);

                } else if (subcommand === PUBLIC_COMMAND) {
                    if (interaction.channel.type === 'dm') {
                        await interaction.reply('Can only silence public alarms in a server, otherwise the bot does not know which alarms to silence.');
                        return;
                    }
                    let x = await Alarm_model.find(
                        { isActive: true, guild: interaction.guild.id, user_id: alarm_user });

                    x.forEach(alarm => {
                        cron_list[alarm.alarm_id].stop();
                    });

                    await Alarm_model.updateMany(
                        { isActive: true, guild: interaction.guild.id, user_id: alarm_user },
                        { isActive: false }
                    );
                    await interaction.reply(`Sucesfully silenced ${x.length} alarms.`);
                } else {
                    await interaction.reply(`The flag you have provided: ${subcommand} is invalid. Try \`/silenceAllAlarms private\` to silent all of your private alarms or \`/silenceAllAlarms public\` to silent all of your alarms in this server.`);
                }

            } catch (e) {
                logging.logger.info(`Error silencing all alarm ${subcommand}`);
                logging.logger.error(e);
                await interaction.reply('Error silencing all alarms');
            }
        }
        else {
            await interaction.reply('No argument specified');
        }
    }
};