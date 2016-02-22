var Solid = require('solid.js');
const CHAT_NAMESPACE = "<http://w3c.org/linkeddata/chat/ns#>";


var NotificationType = {
	handshake: "handshake",

};

var PostType = {
	text: "Text",
	image: "Image",
	video: "Video",
	audio: "Audio",
	link: "Link",
	contact: "Contact"
};

function ChatHandler(entity)
{
	this.entity = entity;
	
	this.setupWebsocket();
	this.subscribeToContainer("Chat/Notifications");
};

ChatHandler.prototype.setupWebsocket = function ()
{
	if (this.websocket && this.WebSocket.readyState === 1)	//websocket is already open
		return; 

	this.websocket = new WebSocket(this.entity.websocket);
	var that = this;

	this.websocket.onclose = function (event) {
        var reason;
        // See http://tools.ietf.org/html/rfc6455#section-7.4.1
        if (event.code == 1000)
            reason = "Normal closure, meaning that the purpose for which the connection was established has been fulfilled.";
        else if(event.code == 1001)
            reason = "An endpoint is \"going away\", such as a server going down or a browser having navigated away from a page.";
        else if(event.code == 1002)
            reason = "An endpoint is terminating the connection due to a protocol error";
        else if(event.code == 1003)
            reason = "An endpoint is terminating the connection because it has received a type of data it cannot accept (e.g., an endpoint that understands only text data MAY send this if it receives a binary message).";
        else if(event.code == 1004)
            reason = "Reserved. The specific meaning might be defined in the future.";
        else if(event.code == 1005)
            reason = "No status code was actually present.";
        else if(event.code == 1006)
           reason = "The connection was closed abnormally, e.g., without sending or receiving a Close control frame";
        else if(event.code == 1007)
            reason = "An endpoint is terminating the connection because it has received data within a message that was not consistent with the type of the message (e.g., non-UTF-8 [http://tools.ietf.org/html/rfc3629] data within a text message).";
        else if(event.code == 1008)
            reason = "An endpoint is terminating the connection because it has received a message that \"violates its policy\". This reason is given either if there is no other sutible reason, or if there is a need to hide specific details about the policy.";
        else if(event.code == 1009)
           reason = "An endpoint is terminating the connection because it has received a message that is too big for it to process.";
        else if(event.code == 1010) // Note that this status code is not used by the server, because it can fail the WebSocket handshake instead.
            reason = "An endpoint (client) is terminating the connection because it has expected the server to negotiate one or more extension, but the server didn't return them in the response message of the WebSocket handshake. <br /> Specifically, the extensions that are needed are: " + event.reason;
        else if(event.code == 1011)
            reason = "A server is terminating the connection because it encountered an unexpected condition that prevented it from fulfilling the request.";
        else if(event.code == 1015)
            reason = "The connection was closed due to a failure to perform a TLS handshake (e.g., the server certificate can't be verified).";
        else
            reason = "Unknown reason";

        console.log("The connection was closed for reason: " + reason);
    };

	this.websocket.onopen = function() {
	    // this.send('sub https://ghanemabdo.databox.me/Public/Chat/');
	    console.log("on open");
	};

	this.websocket.onmessage = function(msg) {
		console.log("msg receieved " + msg.data);
	    if (msg.data && msg.data.slice(0, 3) === 'pub') {
	        console.log("pub event: " + msg.data);
	        var container = msg.data.slice(4 , msg.data.length+1);
	        that.containerChanged(container);
	    }
	};
};

ChatHandler.prototype.subscribeToContainer = function(containerName)
{
	// websocket is not opened yet or closed for some reason
	if ( !this.websocket ||
		 this.websocket.readyState === 2 ||
		 this.websocket.readyState === 3 )
	{
		this.setupWebsocket();
	}

	if (this.websocket.readyState === 1)	//websocket is open and ready to communicate
	{
		this.websocket.send("pub " + this.entity.storage + storagePath + containerName);
	}
	else if (this.websocket.readyState === 0)	//connecting
	{
		var that = this;
		setTimeout(function() { that.subscribeToContainer(containerName); }, 1000);
	}
}

ChatHandler.prototype.containerChanged = function(container)
{
	//fetch all resources in this container
	Solid.web.get(container + "*").then(
		function(response) {
			console.log(response.raw());
		}

	).catch(function(err){

	});
};

ChatHandler.prototype.getContainerNameForChat = function (participants)
{
	participants.sort();
	return "" + CryptoJS.SHA256(participants.join("\n"));
};

ChatHandler.prototype.startChatWith = function(friend , successCallback , failedCallback , timeout)
{
	//ensure the websocket to my pod is open
	this.subscribeToContainer("Chat/Notifications");

	//first check whether container for the thread exists
	var that = this;
	var participants = [this.entity.webid , friend.webid];
	var containerName = this.getContainerNameForChat(participants);
	var parentDir = this.entity.storage + storagePath + "Chat/Threads/";
	var friendsParentDir = friend.storage + storagePath + "Chat/Notifications";

	podHandler.resourceExists(parentDir , containerName , function(parentDir , resPath , status) {
		//resource exists which means an old chat. So, send text directly to the other participants
		//check resource exists at other parties
		podHandler.resourceExists(friendsParentDir , containerName , function(parentDir , resPath , status) {
			//no need for handshake. Ready to send messages
			console.log("no need for handshaking. Ready for messaging");
		} , function (parentDir , resPath , status) {
			that.sendNotification(friendsParentDir , NotificationType.handshake + "_start" , NotificationType.handshake , containerName);			
		});
	} , function(parentDir , resPath , status) {
		//chat thread container does not exist. So, create it and handshake with the other participants
		Solid.web.post(parentDir, "", containerName , true).then(
		  function(solidResponse) {
		    console.log("res " + solidResponse.url + " created successfully");

		    
		    that.sendNotification(friendsParentDir , NotificationType.handshake + "_start" , NotificationType.handshake , containerName);
		  }
		).catch(function(err){
		  console.log(err.status) // contains the error status
		});
	});
};


ChatHandler.prototype.sendNotification = function(container , name , type , data)
{
	var timestamp = Date.now();
	var data = '@prefix ldchat: ' + CHAT_NAMESPACE + ".\n\n" +
				'<> a ldchat:Notification;\n' +
		    	'ldchat:notType ldchat:handshake ;\n' +
		    	'ldchat:sender <' + this.entity.webid + '>;\n'+
		    	'ldchat:threadContainer \"' + data + '\";\n' +
				'ldchat:time \"' + timestamp + '\";';



	Solid.web.create(container , data , name).then(
		function(meta) {
			console.log("resource created " + meta.url);
		}).catch(function(err) {

		});
};

ChatHandler.prototype.notificationRecieved = function(container , name)
{

};

ChatHandler.prototype.sendPost = function(friend , thread , data , type)
{

};



ChatHandler.prototype.readPosts = function(thread , lastPostRead)
{

};

