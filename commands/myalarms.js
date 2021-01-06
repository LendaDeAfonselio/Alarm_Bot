const Discord = require('discord.js');
const auth = require('./../auth.json');
const utility = require('./../Utils/utility_functions');
const Alarm_model = require('../models/alarm_model');
const Private_alarm_model = require('../models/private_alarm_model');

module.exports = {
    name: 'myAlarms',
    description: 'Fetches all of your alarms',
    usage: auth.prefix + 'myAlarms',
    async execute(msg, args, client, cron, cron_list, mongoose) {

        let general_alarms = [];
        let private_alarms = [];
        var results_pub = await Alarm_model.find({ "alarm_id": { $regex: `.*${msg.author.id}.*` } });
        var results_priv = await Private_alarm_model.find({ "user_id": msg.author.id });


        for (let alarm of results_pub) {
            let alarm_id = alarm.alarm_id;
            let alarm_params = alarm.alarm_args;
            let alarm_preview = alarm.message.substring(0, 50);
            let active_alarm = alarm.isActive ? "Active" : "Silenced";
            let field = {
                name: `ID: ${alarm_id}`,
                value: `\tWith params: ${alarm_params}\nMessage: ${alarm_preview}\n${active_alarm}`
            };
            general_alarms.push(field);
        }

        for (let p_alarm of results_priv) {
            let alarm_id = p_alarm.alarm_id;
            let alarm_params = p_alarm.alarm_args;
            let alarm_preview = p_alarm.message.substring(0, 50);
            let field = {
                name: `ID: ${alarm_id}`,
                value: `\tWith params: ${alarm_params}\nMessage: ${alarm_preview}`
            };
            private_alarms.push(field);
        }

        // chunk it because of the max size for discord messages
        var public_chunks = utility.chunkArray(general_alarms, 20);
        var private_chunks = utility.chunkArray(private_alarms, 20);


        if (general_alarms.length <= 0) {
            msg.channel.send('You do not have any alarm in any server!');
        }

        for (let chunk of public_chunks) {
            msg.channel.send({
                embed: {
                    color: 0xff80d5,
                    title: "Your public alarms are:",
                    fields: chunk,
                    timestamp: new Date()
                }
            });
        }

        if (private_alarms.length > 0) {
            for (let chunk of private_chunks) {
                msg.author.send({
                    embed: {
                        color: 0xff80d5,
                        title: "Your private alarms are:",
                        fields: chunk,
                        timestamp: new Date()
                    }
                });
            }
        }
    }
}