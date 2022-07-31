'use strict';
const utility_functions = require('../Utils/utility_functions');
const auth = require('./../auth.json');
const { SlashCommandBuilder } = require('@discordjs/builders');

module.exports = {
    name: 'alarmHelp',
    description: 'Sends a message with a set of examples on how to use the parameters',
    usage: auth.prefix + 'alarmHelp',
    data: new SlashCommandBuilder()
        .setName('alarmhelp')
        .setDescription('Sends a message with a set of examples on how to use the parameters'),
    async execute(interaction) {
        let msg_fields = [];
        let paramsOrder = {
            name: 'Parameter order',
            value: 'minute (0 - 59)\n' +
                'hour (0 - 23)\n' +
                'day of month (1 - 31)\n' +
                'month (0 - 11)\n' +
                'day of week(0 - 6, where Sunday = 0 and Caturday = 6)\n' +
                '`<minutes> <hour> <day of month> <month> <day of week> <insert message here>`\n' +
                'Some examples are described below:'
        };
        msg_fields.push(paramsOrder);

        let example1 = {
            name: 'Sending `hello` everyday at 19:35',
            value: '`/alarm timezone:GMT minute:35 hour:19 day_of_the_month:* month:* weekday:* message:Hello!`'
        };

        msg_fields.push(example1);

        let example3 = {
            name: 'Sending `I am here` every wednesday at 19:35',
            value: '`/alarm timezone:GMT minute:35 hour:19 day_of_the_month:* month:* weekday:3 message:I am here!`'
        };

        msg_fields.push(example3);

        let example2 = {
            name: 'Sending `Goodbye` every Monday, Wednesday and Friday at 19:00',
            value: '`/alarm timezone:UTC+0 minute:0 hour:19 day_of_the_month:* month:* weekday:1,3,5 message:Goodbye`'
        };
        msg_fields.push(example2);

        let example4 = {
            name: 'Send `aaa` every 30 minutes from 9 to 19(excluding) everyday',
            value: '`/alarm timezone:UTC+0 minute:*/30 hour:9-18 day_of_the_month:* month:* weekday:* message:aaa`'
        };

        msg_fields.push(example4);

        let channel_example = {
            name: 'Sending `I am here` everyday at 19:35 in #general channel',
            value: '`/alarm timezone:UTC+0 minute:35 hour:9-18 day_of_the_month:* month:* weekday:* message:aaa channel:#general`'
        };

        msg_fields.push(channel_example);


        let moreexamples = {
            name: 'More examples available in the project readme on github!',
            value: 'https://github.com/LendaDeAfonselio/Alarm_Bot/blob/master/README.md'
        };
        msg_fields.push(moreexamples);

        // sends the message
        if (interaction.channel.type !== 'dm' && utility_functions.can_send_messages_to_ch(interaction, interaction.channel)) {
            await interaction.reply({
                embeds: [{
                    color: 0xff80d5,
                    title: 'Examples of usage',
                    fields: msg_fields,
                    timestamp: new Date()
                }],
                ephemeral: true
            });
        }

    },
};
