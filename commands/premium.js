"use strict";
module.exports = {
    name: 'premium',
    description: 'Information about premium membership',
    usage: '$premium',
    execute(msg, args, client, cron, cron_list, mongoose) {
        msg.channel.send('Get access to 75 alarms by adquiring premium here: https://www.buymeacoffee.com/Afonselio');
    },
};