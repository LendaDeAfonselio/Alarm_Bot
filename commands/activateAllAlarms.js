const { SlashCommandBuilder } = require('@discordjs/builders');

const Alarm_model = require('../models/alarm_model');
const Private_alarm_model = require('../models/private_alarm_model');

const logging = require('../Utils/logging');
const PUBLIC_COMMAND = 'public';
const PRIVATE_COMMAND = 'private';
module.exports = {
    data: new SlashCommandBuilder()
        .setName('activateallalarms')
        .setDescription('Activates all alarms that are currently silent')
        .addSubcommand(option => option.setName(PUBLIC_COMMAND).setDescription('Activates all public alarms'))
        .addSubcommand(option => option.setName(PRIVATE_COMMAND).setDescription('Activates all private alarms')),
    name: 'activateallalarms',
    description: 'Activates all alarms that are currently silent.',
    usage: `\`/activateAllAlarms public\` or \`/activateAllAlarms private\`\nUse private to activate all private alarms, and public to activate regular alarms`,
    async execute(interaction, cron_list) {
        let subcommand = interaction.options.getSubcommand();
        if (subcommand !== null) {
            let alarm_user = interaction.user.id;

            try {
                if (subcommand === PRIVATE_COMMAND) {
                    let privateAlarms = await Private_alarm_model.find(
                        { isActive: false, user_id: alarm_user }
                    );

                    // update in memory list
                    privateAlarms.forEach(alarm => {
                        cron_list[alarm.alarm_id].start();
                    });

                    await Private_alarm_model.updateMany(
                        { isActive: false, user_id: alarm_user },
                        { isActive: true }
                    );
                    await interaction.reply(`Sucesfully re-activated ${privateAlarms.length} private alarms.`);

                } else if (subcommand === PUBLIC_COMMAND) {
                    if (interaction.channel.type === 'dm') {
                        await interaction.reply('Can only activate public alarms in a server, otherwise the bot does not know which alarms to activate.');
                        return;
                    }

                    let alarms = await Alarm_model.find(
                        { isActive: false, guild: interaction.guild.id, user_id: alarm_user });

                    alarms.forEach(alarm => {
                        cron_list[alarm.alarm_id].start();
                    });

                    await Alarm_model.updateMany(
                        { isActive: false, guild: interaction.guild.id, user_id: alarm_user },
                        { isActive: true }
                    );
                    await interaction.reply(`Sucesfully re-activated ${alarms.length} alarms.`);
                } else {
                    await interaction.reply(`The flag you have provided: ${flag} is invalid. Try silenceAllAlarms -p to silent all of your private alarms or -a to silent all of your alarms in this server.`);
                }

            } catch (e) {
                logging.logger.info(`Error activating all alarm. ${flag}`);
                logging.logger.error(e);
                await interaction.reply(`Error activating all alarms`);
            }
        }
        else {
            await interaction.reply('No argument specified');
        }
    }
};