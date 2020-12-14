const fs = require("fs");
const auth = require('./../auth.json');
const Discord = require('discord.js');

module.exports = {
    name: 'alarmHelp',
    description: 'Sends a message with a set of examples on how to use the parameters',
    usage: auth.prefix + 'alarmHelp',

    execute(message, args, client, cron_list) {
        let msg_fields = [];
        let paramsOrder = {
            name: 'Parameter order',
            value: 'minute (0 - 59)\n' +
                'hour (0 - 23)\n' +
                'day of month (1 - 31)\n' +
                'month (1 - 12)\n' +
                'day of week(0 - 7)(Sunday = 0 or 7)\n' +
                '<minutes> <hour> <month> <day of week> <insert message here>\n' +
                'Some examples are described below:'
        }
        msg_fields.push(paramsOrder);

        let example1 = {
            name: 'Sending `hello` everyday at 19:35',
            value: '`$alarm 35 19 * * * Hello!`'
        }

        msg_fields.push(example1);

        let example3 = {
            name: 'Sending `I am here` every wednesday at 19:35',
            value: '`$alarm 35 19 * * 3 I am here!`'
        }

        msg_fields.push(example3);

        let example2 = {
            name: 'Sending `Goodbye` every Monday, Wednesday and Friday at 19:00',
            value: '`$alarm  00 19 * * 1,3,5`'
        }
        msg_fields.push(example2);

        let example4 = {
            name: 'Send `aaa` every 30 minutes from 9 to 19(excluding) everyday',
            value: '`$alarm */30 9-18 * * * aaa`'
        }

        msg_fields.push(example4);


        let moreexamples = {
            name: 'More examples available in the project readme on github!',
            value: 'https://github.com/LendaDeAfonselio/Alarm_Bot/blob/master/README.md'
        }
        msg_fields.push(moreexamples);

        // sends the message
        try {
            message.channel.send({
                embed: {
                    color: 0xff80d5,
                    title: 'A list of my commands',
                    fields: msg_fields,
                    timestamp: new Date()
                }
            });
        } catch (e) {
            console.err(e);
        }
    },
};
