const AWS = require('aws-sdk');

const docClient = new.DynamoDB.DocumentClient({region: us-east-1})

exports.handle = function(event, context, callback){

    var params ={
        TableName: 'events',
        Item: {
            event: Georgia_State_University_Hackathon, //not sure yet how it's structure in DynamoDB
            start_date: "November 25",
            end_date: "November 27"
        }
    }

    docClient.put(params, function(err, data){
        if(err){
            callback(err, null);
        }else{
            callback(null, data)
        }
    })
}