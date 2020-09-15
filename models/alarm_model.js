const mongoose = require('mongoose');
const alarmSchema = mongoose.Schema({
    _id: mongoose.Schema.Types.ObjectId,
    alarm_id: String,
    alarm_args: String,
    message: String,
    target: String,
    timestamp: Date
});

module.exports= mongoose.model("Alarm_model", alarmSchema);