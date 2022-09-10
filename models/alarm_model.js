'use strict';

const mongoose = require('mongoose');
const alarmSchema = mongoose.Schema({
    alarm_id: String,
    alarm_args: String,
    user_id: String,
    message: String,
    guild: String,
    server_name: String,
    channel: String,
    isActive: Boolean,
    timestamp: Date
});

module.exports = mongoose.model('Alarm_model', alarmSchema);