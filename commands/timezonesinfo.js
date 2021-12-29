"use strict";
const custom_timezones = require('../timezones.json');
const time_utils = require('../Utils/time_validation');
const auth = require('./../auth.json');
const utility_functions = require('../Utils/utility_functions');
const logging = require('../Utils/logging');


module.exports = {
    name: 'timezonesinfo',
    description: 'Gets information about all timezones, or about a specific timezone if an argument is passed',
    usage: auth.prefix + 'timezonesinfo\nor, ' + auth.prefix + 'timezonesinfo <timezones_name>',
    async execute(msg, args, client, cron, cron_list, mongoose) {
        if (args.length == 0) {

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

            for (let chunk of chunks) {
                msg.author.send({
                    embed: {
                        color: 0x0099ff,
                        title: 'Here are all the timezones supported:',
                        fields: chunk,
                        timestamp: new Date(),
                    }
                }).catch((err) => {
                    logging.logger.info(`Can't send timezone message to user ${msg.author.id}`);
                    logging.logger.error(err);
                    if (msg.channel.type !== 'dm' && utility_functions.can_send_messages_to_ch(msg, msg.channel)) {
                        msg.channel.send({
                            embed: {
                                color: 0x0099ff,
                                title: 'Here are all the timezones supported:',
                                fields: chunk,
                                timestamp: new Date(),
                            }
                        });
                    }
                });
            }
        } else {
            let timezone_name = args[0];
            let timezone_data = time_utils.get_timezone_by_abreviation(timezone_name);
            if (timezone_data == undefined) {
                msg.author.send(`No data was found for ${timezone_name}. Check all timezones with ${auth.prefix + 'timezonesinfo'} for more information.`)
                    .catch((err) => {
                        logging.logger.info(`Can't send private message to user ${msg.author.id}.`);
                        logging.logger.error(err);
                        if (msg.channel.type !== 'dm' && utility_functions.can_send_messages_to_ch(msg, msg.channel)) {
                            msg.channel.send(`No data was found for ${timezone_name}. Check all timezones with ${auth.prefix + 'timezonesinfo'} for more information.`)
                        }
                    });
                return;
            }
            let x = new Array();
            let text_for_embed = {
                name: '\nLocations: ' + timezone_data.locations,
                value: 'You can also use: ' + timezone_data.utc_offset
                    + '\nThis is the timezone of ' + timezone_data.example_location
            };
            x.push(text_for_embed);
            x.push({
                name: 'For more information visit: ',
                value: `https://www.timeanddate.com/time/zones/${timezone_data.timezone_abbreviation}`,
            })
            msg.author.send({
                embed: {
                    color: 0x90ee90,
                    title: 'Details about ' + timezone_data.timezone_abbreviation,
                    fields: x,
                    timestamp: new Date(),
                    footer: {
                        text: 'If this example does not yield the desired results try using ' + timezone_data.utc_offset,
                    },
                }
            }).catch((err) => {
                logging.logger.info(`Can't send private message to user ${msg.author.id}.`);
                logging.logger.error(err);
                if (msg.channel.type !== 'dm' && utility_functions.can_send_messages_to_ch(msg, msg.channel)) {
                    msg.channel.send({
                        embed: {
                            color: 0x90ee90,
                            title: 'Details about ' + timezone_data.timezone_abbreviation,
                            fields: x,
                            timestamp: new Date(),
                            footer: {
                                text: 'If this example does not yield the desired results try using ' + timezone_data.utc_offset,
                            },
                        }
                    });
                }
            });
        }
    }
}