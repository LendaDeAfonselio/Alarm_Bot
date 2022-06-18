'use strict';
const custom_timezones = require('../timezones.json');
const time_utils = require('../Utils/time_validation');
const utility_functions = require('../Utils/utility_functions');
const logging = require('../Utils/logging');
const { SlashCommandBuilder } = require('@discordjs/builders');


const TIMEZONE_COMMAND = 'timezone';
const ALL_TIMEZONES_COMMAND = 'all';
const TIMEZONE_NAME_OPT = 'timezone_name';
module.exports = {
    name: 'timezonesinfo',
    description: 'Gets information about timezones',
    usage: '/timezonesinfo\n/timezonesinfo <timezones_name>',
    data: new SlashCommandBuilder()
        .setName('timezonesinfo')
        .setDescription('Gets info about timezone(s)')
        .addSubcommand(option => option.setName(TIMEZONE_COMMAND).setDescription('Information about a specific timezone')
            .addStringOption(option => option.setName(TIMEZONE_NAME_OPT).setDescription('The timezone')))
        .addSubcommand(option => option.setName(ALL_TIMEZONES_COMMAND).setDescription('Information about all timezones')),
    async execute(interaction) {
        if (interaction.options.getSubcommand() === ALL_TIMEZONES_COMMAND) {

            let list_timezones = new Array();

            custom_timezones.forEach((timezone) => {
                let moreexamples = {
                    name: 'Abbreviation: ' + timezone.timezone_abbreviation,
                    value: 'Time diference to UTC: ' + timezone.utc_offset.replace('UTC', '')
                };
                list_timezones.push(moreexamples);
            });

            list_timezones.push({
                name: 'If a certain timezones does not exist or work try using the UTC equivalent',
                value: 'For more information about the timezones visit https://www.timeanddate.com/time/current-number-time-zones.html'
            });

            let chunks = utility_functions.chunkArray(list_timezones, 20);
            let embeds_to_send = [];
            for (let chunk of chunks) {
                let newEmbed = {
                    color: 0x0099ff,
                    title: 'Here are all the timezones supported:',
                    fields: chunk,
                };
                embeds_to_send.push(newEmbed);
            }
            await interaction.reply({
                embeds: embeds_to_send,
                ephemeral: true
            }).catch(async (err) => {
                logging.logger.info(`Can't send timezone message to user ${interaction.user.id}`);
                logging.logger.error(err);
                await interaction.user.send({
                    embeds: embeds_to_send
                });

            });
        } else if (interaction.options.getSubcommand() === TIMEZONE_COMMAND) {
            let timezone_name = interaction.options.getString(TIMEZONE_NAME_OPT);
            if (!timezone_name || timezone_name === null) {
                interaction.reply('Please insert a timezone as a parameter for the command');
                return;
            }
            let timezone_data = time_utils.get_timezone_by_abreviation(timezone_name);
            if (timezone_data === undefined) {
                interaction.reply(`No data was found for ${timezone_name}. Check all timezones with \`/timezonesinfo\` for more information.`);
                return;
            }
            let x = new Array();
            let text_for_embed = {
                name: '\nLocations: ' + timezone_data.locations,
                value: 'You can also use: ' + timezone_data.utc_offset +
                    '\nThis is the timezone of ' + timezone_data.example_location
            };
            x.push(text_for_embed);
            x.push({
                name: 'For more information visit: ',
                value: `https://www.timeanddate.com/time/zones/${timezone_data.timezone_abbreviation}`,
            });
            await interaction.reply({
                embeds: [{
                    color: 0x90ee90,
                    title: 'Details about ' + timezone_data.timezone_abbreviation,
                    fields: x,
                    timestamp: new Date(),
                    footer: {
                        text: 'If this example does not yield the desired results try using ' + timezone_data.utc_offset,
                    },
                }]
            }).catch(async (err) => {
                logging.logger.info(`Can't send private message to user ${interaction.user.id}.`);
                logging.logger.error(err);
                if (interaction.channel.type !== 'dm' && utility_functions.can_send_messages_to_ch(interaction, interaction.channel)) {
                    await interaction.user.send({
                        embeds: [{
                            color: 0x90ee90,
                            title: 'Details about ' + timezone_data.timezone_abbreviation,
                            fields: x,
                            timestamp: new Date(),
                            footer: {
                                text: 'If this example does not yield the desired results try using ' + timezone_data.utc_offset,
                            },
                        }]
                    });
                }
            });
        }
    }
};