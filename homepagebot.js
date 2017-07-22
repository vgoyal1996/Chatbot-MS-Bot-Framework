var restify = require('restify');
var builder = require('botbuilder');
var mysql = require('mysql');

var server = restify.createServer();
server.listen(process.env.port||process.env.PORT||3978, function(){
	console.log('%s listening to %s',server.name,server.url);
});
var sqlcon = mysql.createConnection({
	multipleStatements: true,
	host: "127.0.0.1",
	user: "root",
	password: "",
	database: "questions_db"
});
var connector = new builder.ChatConnector({
	appId:'c0d04a2a-1fff-4b28-a724-a77a10789dd3',
	appPassword:'efjyA92PJq60EeciKT5AuY5'
});
/*var connector = new builder.ChatConnector({
	appId:process.env.MICROSOFT_APP_ID,
	appPassword:process.env.MICROSOFT_APP_PASSWORD
});*/
var op=[];
var op_ques_id=[];
var body_type;
var vehicle_type;
var nextquestionid=-1;
var user_id;
server.post('/api/messages',connector.listen());
var bot = new builder.UniversalBot(connector);
bot.on('conversationUpdate',function(message){
	if (message.membersAdded) {
        message.membersAdded.forEach(function (identity) { 
            if (identity.id === message.address.bot.id) {
                bot.beginDialog(message.address, '/');
            }
        });
    }
});
//Main Dialog
bot.dialog('/',[
    function(session){
        getFirstQuesFromDB(session);
    },
    function(session,results){
        var res=results.response.entity;
        session.sendTyping();
        setTimeout(function(){
            var q="INSERT INTO order_table (assist_type) VALUES (\'"+res+"\')";
            insertOrUpdateOrder(q);
		    sqlcon.query("SELECT LAST_INSERT_ID() AS 'uid'",function(err,result){
			    if(err) throw err;
			    console.log(result[0].uid);
			    user_id = result[0].uid;
		    });
            if(res=='I want to buy')
                session.beginDialog('/buyDialog');
            else if(res=='I want to sell')
                session.beginDialog('/sellDialog');
            else    
                session.beginDialog('/otherQueryDialog');
        },2000);
    }
]);
//Buy Dialog
bot.dialog('/buyDialog',[
    //what do you want to buy? 2 wheeler/4 wheeler
    function(session){
        var q = "SELECT * FROM questions_table WHERE id=2";
        getResultsFromDB(session,q);
    },
    //what do you want to buy- car/bike/scooter
    function(session,results){
        var res=results.response.entity;
        var q="UPDATE order_table SET 2wheel_4wheel=\'"+res+"\'WHERE user_id="+user_id;
        session.sendTyping();
        setTimeout(function(){
            insertOrUpdateOrder(q);
            var index=op.indexOf(res);
            var nextq_id=op_ques_id[index];
            console.log(nextq_id);
            q="SELECT * FROM questions_table WHERE id="+nextq_id;
            getResultsFromDB(session,q);
        },2000);
    },
    //what is the condition of your vehicle?
    function(session,results){
        var res=results.response.entity;
        var q="UPDATE order_table SET vehicle_type=\'"+res+"\'WHERE user_id="+user_id;
        vehicle_type=res;
        session.sendTyping();
        setTimeout(function(){
            insertOrUpdateOrder(q);
            var index=op.indexOf(res);
            var nextq_id=op_ques_id[index];
            console.log(nextq_id);
            q="SELECT * FROM questions_table WHERE id="+nextq_id;
            getResultsFromDB(session,q);
        },2000);
    },
    //select body type/transmission type
    function(session,results){
        var res=results.response.entity;
        var q="UPDATE order_table SET vehicle_condition=\'"+res+"\'WHERE user_id="+user_id;
        session.sendTyping();
        setTimeout(function(){
            insertOrUpdateOrder(q);
            var index=op.indexOf(res);
            var nextq_id=op_ques_id[index];
            q="SELECT * FROM questions_table WHERE id="+nextq_id;
            getResultsFromDB(session,q);
        },2000);
    },
    //select brand
    function(session,results){
        var res=results.response.entity;
        var q="UPDATE order_table SET bodyortransmission_type=\'"+res+"\'WHERE user_id="+user_id;
        session.sendTyping();
        setTimeout(function(){
            insertOrUpdateOrder(q);
        body_type=res;
        var index=op.indexOf(res);
        var nextq_id=op_ques_id[index];
        q="SELECT * FROM questions_table WHERE id="+nextq_id;
        sqlcon.query(q,function(err,result){
            if(err) throw err;
            console.log(result);
            var first_brac_index=result[0].question.indexOf('(');
            var last_brac_index=result[0].question.indexOf(')');
            var substr = result[0].question.substring(first_brac_index,last_brac_index+1);
            var updated_question = result[0].question.replace(substr,res);
            if(result[0].type=="option"){
                var opsq="SELECT * FROM options_table WHERE qid="+result[0].id;
                sqlcon.query(opsq,function(err2,result2){
                    if(err2) throw err2;
                    console.log(result2);
                    op=[];
                    op_ques_id=[];
                    var i=0,j=0;
                    if(res=="hatchback"){
                        i=2;
                        j=4;
                    }
                    else{
                        i=0;
                        j=2;
                    }
                    for(;i<j;i++){
                        op.push(result2[i].value);
                        op_ques_id.push(result2[i].ref_id);
                    }
                    console.log(op);
                    builder.Prompts.choice(session,updated_question,op,{listStyle: builder.ListStyle.list});
                });
            }
        });
        },2000);
    },
    //select model
    function(session,results){
        var res=results.response.entity;
        var q="UPDATE order_table SET brand=\'"+res+"\'WHERE user_id="+user_id;
        //session.sendTyping(function(){
            sqlcon.query(q,function(err,result){
		    if(err) throw err;
	    });
        var index=op.indexOf(res);
        var nextq_id=op_ques_id[index];
        q="SELECT * FROM questions_table WHERE id="+nextq_id;
        sqlcon.query(q,function(err,result){
            if(err) throw err;
            console.log(result);
            var first_brac_index=result[0].question.indexOf('(');
            var last_brac_index=result[0].question.indexOf(')');
            var substr = result[0].question.substring(first_brac_index,last_brac_index+1);
            var updated_question = result[0].question.replace(substr,res);
            if(result[0].type=="option"){
                var opsq="SELECT * FROM options_table WHERE qid="+result[0].id;
                sqlcon.query(opsq,function(err2,result2){
                    if(err2) throw err2;
                    console.log(result2);
                    op=[];
                    op_ques_id=[];
                    var i=0,j=0;
                    if(vehicle_type=="car"){
                        if(res=="Ford"){
                            i=4;
                            j=5;
                        }
                        else if(res=="Toyota"){
                            i=0;
                            j=2;
                        }
                        else if(res=="Honda"&&body_type=="hatchback"){
                            i=2;
                            j=4;
                        }
                        else{
                            i=5;
                            j=6;
                        }
                    }
                    else if(vehicle_type=="bike"){
                        if(res=="Yamaha"){
                            i=0;
                            j=2;
                        }
                        else{
                            i=2;j=4;
                        }
                    }
                    else if(vehicle_type=="scooter"){
                        if(res=="Hero"){
                            i=0;
                            j=2;
                        }
                        else{
                            i=2;j=4;
                        }
                    }   
                    for(;i<j;i++){
                        op.push(result2[i].value);
                        op_ques_id.push(result2[i].ref_id);
                    }
                    console.log(op);
                    builder.Prompts.choice(session,updated_question,op,{listStyle: builder.ListStyle.list});
                });
            }
        });
        //},2000);
    },
    //get budget
    function(session,results){
        var res=results.response.entity;
        var q="UPDATE order_table SET model=\'"+res+"\'WHERE user_id="+user_id;
        session.sendTyping();
        setTimeout(function(){
            insertOrUpdateOrder(q);
            var index=op.indexOf(res);
            var nextq_id=op_ques_id[index];
            q="SELECT * FROM questions_table WHERE id="+nextq_id;
            getResultsFromDB(session,q);
        },2000);
    },
    //get phone number
    function(session,results){
        var res=results.response.entity;
        var q="UPDATE order_table SET budget=\'"+res+"\'WHERE user_id="+user_id;
        session.sendTyping();
        setTimeout(function(){
            insertOrUpdateOrder(q);
            var index=op.indexOf(res);
            var nextq_id=op_ques_id[index];
            q="SELECT * FROM questions_table WHERE id="+nextq_id;
            getResultsFromDB(session,q);
        },2000);
    },
    //get name
    function(session,results){
        console.log(results.response);
        var q="UPDATE order_table SET phone_number=\'"+results.response+"\'WHERE user_id="+user_id;
        session.sendTyping();
        setTimeout(function(){
            insertOrUpdateOrder(q);
            q="SELECT * FROM questions_table WHERE id="+nextquestionid;
            getResultsFromDB(session,q);
        },2000);
    },
    //get city name
    function(session,results){
        var q="UPDATE order_table SET user_name=\'"+results.response+"\'WHERE user_id="+user_id;
        session.sendTyping();
        setTimeout(function(){
            insertOrUpdateOrder(q);
            q="SELECT * FROM questions_table WHERE id="+nextquestionid;
            getResultsFromDB(session,q);
        },2000);
    },
    //display thank you message
    function(session,results){
        var q="UPDATE order_table SET city_name=\'"+results.response+"\'WHERE user_id="+user_id;
        session.sendTyping();
        setTimeout(function(){
            insertOrUpdateOrder(q);
            session.send("Our auto expert will call you shortly. You may dial 1800-4070-70707 to speak to our auto expert.<br>Thanks for contacting Droom!!");
            session.endDialog();
        },2000);
    }
]);
//sell Dialog
bot.dialog('/sellDialog',[
    function(session){
        var q = "SELECT * FROM questions_table WHERE id=3";
        getResultsFromDB(session,q);
    },
    function(session,results){
        var res=results.response.entity;
        var index=op.indexOf(res);
        var nextq_id=op_ques_id[index];
        var q="SELECT * FROM questions_table WHERE id="+nextq_id;
        session.sendTyping();
        setTimeout(function(){
            sqlcon.query(q,function(err,result){
            if(err) throw err;
            console.log(result);
            session.send(result[0].question);
            session.send("Thank you for contacting Droom. Have a great time!!!!");
            session.endDialog();
        });
        },2000);
    }
]);
//Other query Dialog
bot.dialog('/otherQueryDialog',[
    function(session){
        var q = "SELECT * FROM questions_table WHERE id=6";
        getResultsFromDB(session,q);
    },
    function(session,results){
        session.sendTyping();
        setTimeout(function(){
            session.send("Our executive will contact you shortly.<br>Thank you for using Droom!!!");
            session.endDialog();
        },2000);
        
    }
]);

function getFirstQuesFromDB(session){
    op=[];
    op_ques_id=[];
    session.send("Welcome to Droom");
    var q="SELECT * FROM questions_table WHERE id=1";
    sqlcon.query(q,function(err,result){
        if(err) throw err;
        console.log(result);
        if(result[0].type=="option"){
            var opsq="SELECT * FROM options_table WHERE qid="+result[0].id;
            sqlcon.query(opsq,function(err2,result2){
                if(err2) throw err2;
                console.log(result2);
                for(var i=0;i<result2.length;i++){
                    op[i]=result2[i].value;
                    op_ques_id[i]=result2[i].ref_id;
                }
                console.log(op);
                builder.Prompts.choice(session,result[0].question,op,{listStyle: builder.ListStyle.list});
            });
        }
    });
}

function insertOrUpdateOrder(q){
    sqlcon.query(q,function(err,result){
		if(err) throw err;
	});
}

function getResultsFromDB(session,q){
    sqlcon.query(q,function(err,result){
            if(err) throw err;
            console.log(result);
            if(result[0].type=="option"){
                var opsq="SELECT * FROM options_table WHERE qid="+result[0].id;
                sqlcon.query(opsq,function(err2,result2){
                    if(err2) throw err2;
                    console.log(result2);
                    op=[];
                    op_ques_id=[];
                    for(var i=0;i<result2.length;i++){
                        op.push(result2[i].value);
                        op_ques_id.push(result2[i].ref_id);
                    }
                    console.log(op);
                    builder.Prompts.choice(session,result[0].question,op,{listStyle: builder.ListStyle.list});
                });
            }
            else{
                nextquestionid=result[0].ref_id;
                builder.Prompts.text(session,result[0].question);
            }
        });
}