const mongoose = require('mongoose');
const ttsAlarmSchema = mongoose.Schema({
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

module.exports = mongoose.model("TTS_alarm_model", ttsAlarmSchema);