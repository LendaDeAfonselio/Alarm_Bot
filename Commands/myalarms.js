const Discord = require('discord.js');
const auth = require('./../auth.json');

module.exports = {
    name: 'myalarms',
    description: 'Fetches all of your alarms',
    usage: auth.prefix + 'myalarms',
    async execute(msg, args, client, cron, cron_list, mongoose) {

        let fields = [];
        for (let [key, value] of Object.entries(cron_list)) {
            if (key.includes(msg.author.id)) {
                alarm_text = `ID: ${key}\n\tWith params: ${value.cronTime.source}`
                let field = {
                    name: `ID: ${key}`,
                    value: `\tWith params: ${value.cronTime.source}`
                }
                fields.push(field);
            }
        }
        msg.channel.send({
            embed: {
                color: 0xff80d5,
                title: "Your alarms are:",
                fields: fields,
                timestamp: new Date()
            }
        });
    }
}