const Discord = require('discord.js');
module.exports = {
    name: 'myalarms',
    description: 'Fetches all of your alarms',
    usage: '<prefix>myalarms',
    async execute(msg, args, client, cron, cron_list, mongoose) {
        const embed = new Discord.MessageEmbed()
            .setTitle("Your alarms are:")
            .setColor(0xff80d5);
        for (let [key, value] of Object.entries(cron_list)) {
            if (key.includes(msg.author.id)) {
                alarm_text = `ID: ${key}\n\tWith params: ${value.cronTime.source}`
                embed.addField(alarm_text);
            }
        }
        msg.channel.send({ embed });
    }
}