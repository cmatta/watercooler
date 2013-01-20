var mongoose = require('mongoose')
    , Schema = mongoose.Schema;

var UsersSchema = new Schema({
        "provider": {type: String, required: true },
        "provider_id": {type: String, required: true},
        "displayName": {type: String, requred: true},
        "username": {type: String, required: true},
        "user_images": [
            { 
                "value": {type: String }
            }
        ],
        "nickname": {type: String},
        "location": {type: String},
        "join_date": {type: Date, required: true},
        "name" : {
            "familyName": {type: String},
            "givenName": {type: String},
            "middleName": {type: String}
        },
        "emails":[
            {
                "value": {type: String},
                "type": {type: String}
            }
        ]
    },
    {collection: 'Users'}
);

var Users = mongoose.model('Users', UsersSchema);
module.exports.Users = Users;