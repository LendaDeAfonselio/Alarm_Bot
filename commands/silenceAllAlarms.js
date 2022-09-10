'use strict';

const Alarm_model = require('../models/alarm_model');

const logging = require('../Utils/logging');
const { SlashCommandBuilder } = require('@discordjs/builders');
const PUBLIC_COMMAND = 'public';
module.exports = {
    name: 'silenceallalarms',
    description: 'Silences all alarms until reactivation.\n-p to silence all private alarms and -a to silence all regular alarms on the server',
    usage: '`/silenceAllAlarms public` or `/silenceAllAlarms private`\nUse private to silence all private alarms, and public to silence regular alarms',
    data: new SlashCommandBuilder()
        .setName('silenceallalarms')
        .setDescription('Silences all alarms until reactivation')
        .addSubcommand(option => option.setName(PUBLIC_COMMAND).setDescription('Silences all public alarms')),
    async execute(interaction, cron_list) {
        let subcommand = interaction.options.getSubcommand();

        if (subcommand !== null) {
            let alarm_user = interaction.user.id;

            try {
                if (subcommand === PUBLIC_COMMAND) {
                    if (interaction.channel.type === 'dm') {
                        await interaction.reply('Can only silence public alarms in a server, otherwise the bot does not know which alarms to silence.');
                        return;
                    }
                    let x = await Alarm_model.find(
                        { isActive: true, guild: interaction.guild.id, user_id: alarm_user });

                    // TODO: cron_list must be inherited from index.js and not from bot.js
                    // is also needs support concurrency 
                    x.forEach(alarm => {
                        if (cron_list[alarm.alarm_id]) {
                            cron_list[alarm.alarm_id]?.stop();
                        }
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