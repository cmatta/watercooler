var mongoose = require('mongoose')
    , Schema = mongoose.Schema
    , Users = require('./Users').Users;

var MessageSchema = new Schema({
        "user": {type: Schema.Types.ObjectId, ref:'Users', required: true },
        "datetime": {type: Date, required: true},
        "message": {type: String, required: true},
        "room_id": {type: String }
    },
    {collection: 'Messages'}
);

var Message = mongoose.model('Message', MessageSchema);
module.exports.Message = Message;