var Solid = require('solid.js');
const CHAT_NAMESPACE = "<http://w3c.org/linkeddata/chat/ns#>";
var CHAT = $rdf.Namespace("http://w3c.org/linkeddata/chat/ns#");


var NotificationType = {
	handshakestart: "handshakestart",
	handshakeack: "handshakeack",
	handshakereply: "handshakereply"
};

var PostType = {
	text: "Text",
	image: "Image",
	video: "Video",
	audio: "Audio",
	link: "Link",
	contact: "Contact"
};

function ChatHandler(scopeObject)
{
	this.scope = scopeObject;
	this.entity = scopeObject.me;
	this.webSockets = {};
	this.activeContainers = {};
	this.activeContainers.notifications = "Chat/Notifications";
	this.notifications = [];
	this.currentChat = {};
	
	this.setupWebsocket();
	// this.connectToSocket(this.entity.websocket , this.entity.storage + "Public/Chat/Notifications/");
	this.subscribeToContainer(this.activeContainers.notifications);

};

ChatHandler.prototype.resetCurrentChat = function() {

	this.currentChat = {};
};

// Websocket
ChatHandler.prototype.connectToSocket = function(wss, uri) {

	var oldSocket = this.webSockets[wss];

    if (!oldSocket || (oldSocket.readyState !== 1 && oldSocket.readyState !== 0)) {
        var socket = new WebSocket(wss);
        socket.onopen = function(){
            this.send('sub ' + uri);
        }
        socket.onmessage = function(msg){
            if (msg.data && msg.data.slice(0, 3) === 'pub') {
                // resource updated
                var res = trim(msg.data.slice(3, msg.data.length));
                
            }
        }
        socket.onclose = function() {
            console.log("Websocket connection closed. Restarting...");
            this.connectToSocket(wss, uri);
        }

        this.webSockets[wss] = socket;
    }
};

ChatHandler.prototype.setupWebsocket = function ()
{
	if (this.websocket && this.websocket.readyState === 1)	//websocket is already open
		return; 

	this.websocket = new WebSocket(this.entity.websocket);
	var that = this;

	this.websocket.onopen = function() {
	    // this.send('sub https://ghanemabdo.databox.me/Public/Chat/');
	    console.log("on open");
	};

	this.websocket.onmessage = function(msg) {
		console.log("msg receieved " + msg.data);
	    if (msg.data )
	    {
	    	var container = msg.data.slice(4 , msg.data.length+1);

	    	if ( msg.data.slice(0, 3) === 'pub')
	    	{
		        that.containerChanged(container);
		    }
		    else if ( msg.data.slice(0, 3) === 'ack')
		    {
		    	that.getContainerResources(container);
		    }
	    }
	};

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
        that.setupWebsocket();
        //subscribte to containers
        for ( key in this.activeContainers)
        {
        	var value = this.activeContainers[key];
        	that.subscribeToContainer(value);
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
		var container = removeDuplicateSlashInURL( this.entity.storage + storagePath + containerName ) + "/";
		this.websocket.send("sub " + container);
	}
	else if (this.websocket.readyState === 0)	//connecting
	{
		var that = this;
		setTimeout(function() { that.subscribeToContainer(containerName); }, 1000);
	}
}

ChatHandler.prototype.containerChanged = function(container)
{
	var that = this;
	//fetch all resources in this container
	Solid.web.get(container + "*").then(
		function(graph) {

            var notificationStmts = graph.statementsMatching(undefined, RDF('type'), CHAT('Notification'));

            if ( notificationStmts.length > 0 )
            	that.parseNotifications(notificationStmts);

            var postStmts = graph.statementsMatching(undefined, RDF('type'), CHAT('Post'));

            if ( postStmts.length > 0 )
            	that.parsePosts(postStmts);
		}

	).catch(function(err){

	});
};

ChatHandler.prototype.getContainerResources = function(container)
{
	this.containerChanged(container);
};

ChatHandler.prototype.getContainerNameForChat = function (participants)
{
	participants.sort();
	return "" + CryptoJS.SHA256(participants.join("\n"));
};

ChatHandler.prototype.parseNotifications = function(notifStmts)
{
	var that = this;

	notifStmts.forEach(function(item) {
		that.loadNotification(removeDuplicateSlashInURL(item.subject.uri)).then(
			function( notif )
			{
				that.notifications.push(notif);
				that.digestNotification(notif).then(function(response){
					that.deleteNotification(notif)
					.then(function(notification){console.log(notification);})
					.catch(function(notification){console.log(notification);});
				})
				.catch(function(err){

				});

			})
		.catch( function(err)
		{
			console.log("can't load notification");
		});
	});
};

ChatHandler.prototype.loadNotification = function(notifUrl)
{
	var promise = new Promise(function(resolve , reject) {
		Solid.web.get(notifUrl).then(
			function(graph){

				var notSubject = graph.any(undefined , RDF('type') , CHAT('Notification') );

				if (notSubject)
				{
					var notif = {};
					notif.uri = notSubject.uri

					var type = graph.any(notSubject , CHAT('notificationType') , undefined);

					if (type)
						notif.type = type.value.substr(type.value.indexOf('#') + 1);

					var sender = graph.any(notSubject , CHAT('sender') , undefined);

					if (sender)
						notif.sender = sender.value;

					var threadContainer = graph.any(notSubject , CHAT('threadContainer') , undefined);

					if (threadContainer)
						notif.threadContainer = threadContainer.value;

					var time = graph.any(notSubject , CHAT('time') , undefined);

					if (threadContainer)
						notif.time = time.value;

					resolve(notif);
				}

				reject("no notifications found");
			})
		.catch(function(err) {
			reject(err);
		});
	});

	return promise;
};

ChatHandler.prototype.sendNotification = function(container , type , data)
{
	var that = this;
	var promise = new Promise(function ( resolve , reject ) {

		var timestamp = Date.now();
		// var content = '@prefix ldchat: ' + CHAT_NAMESPACE + '.\n\n' +
		// 			'<> a ldchat:Notification;\n' +
		// 	    	'ldchat:notificationType ldchat:' + type + ' ;\n' +
		// 	    	'ldchat:sender <' + that.entity.webid + '>;\n'+
		// 	    	'ldchat:threadContainer \"' + data + '\";\n' +
		// 			'ldchat:time \"' + timestamp + '\".';
		var content ='<> a <http://w3c.org/linkeddata/chat/ns#Notification>;\n' +
			    	'<http://w3c.org/linkeddata/chat/ns#notificationType> <http://w3c.org/linkeddata/chat/ns#' + type + '>;\n' +
			    	'<http://w3c.org/linkeddata/chat/ns#sender> <' + that.entity.webid + '>;\n'+
			    	'<http://w3c.org/linkeddata/chat/ns#threadContainer> \"' + data + '\";\n' +
					'<http://w3c.org/linkeddata/chat/ns#time> \"' + timestamp + '\".';



		Solid.web.put(container , content , type).then(
			function(meta) {
				console.log("resource created " + meta.url);
				resolve(meta);
			}).catch(function(err) {
				reject(err);
			});
	});

	return promise;
};

ChatHandler.prototype.notificationRecieved = function(container , name , type)
{

};

ChatHandler.prototype.digestNotification = function(notif)
{
	var that = this;

	var promise = new Promise(function ( resolve , reject) {

		podHandler.getStorageLocation(notif.sender).then(
		function(storage)
		{
			var containerName = notif.threadContainer;
			var parentDir = that.entity.storage + storagePath + "Chat/Threads/";
			var friendsParentDir = storage + storagePath + "Chat/Threads/";
			var friendsNotificationDir = storage + storagePath + "Chat/Notifications/";

			if ( notif.type === NotificationType.handshakestart )
			{
				podHandler.resourceExists(parentDir , containerName)
				.then( function(response) {
					//resource exists which means an old chat. So, send text directly to the other participants
					//check resource exists at other parties
					podHandler.resourceExists(friendsParentDir , containerName)
					.then( function(response) {
						//no need for handshake. Ready to send messages
						console.log("reply to invite from: " + notif.sender);
						that.sendNotification(friendsNotificationDir , NotificationType.handshakereply , containerName).then(
							function(meta) {
								resolve(notif);
						})
						.catch(function(err) {
							reject(err);
						});
					})
					.catch( function (response) {
						//got invitation from someone who didn't create a container for this thread on his pod!
						reject(response);
					});
				}) 
				.catch( function(response) {
					//chat thread container does not exist. So, create it and handshake with the other participants
					Solid.web.create(parentDir, "", containerName , true).then(
					  function(solidResponse) {
					    console.log("res " + solidResponse.url + " created successfully");

					    // that.subscribeToContainer("Chat/Threads/" + containerName);
					    
					    that.sendNotification(friendsNotificationDir , NotificationType.handshakereply , containerName).then(
					    	function(meta){
					    		resolve(meta);
					    })
					    .catch(function(err){
					    	reject(err);
					    });
					  }
					).catch(function(err){
					  console.log(err.status) // contains the error status
					  reject(err);
					});
				});
			}
			else if ( notif.type === NotificationType.handshakereply )
			{
				that.sendNotification(friendsNotificationDir , NotificationType.handshakeack , containerName).then(
					function(meta){
						resolve(meta);
					})
				.catch(function(err)
				{
					reject(err);
				});
			}
			else if (notif.type === NotificationType.handshakeack )
			{
				resolve(notif);
			}
		})
		.catch(function(error) {
			reject(error);
		});
	});

	return promise;
};

ChatHandler.prototype.deleteNotification = function(notification)
{
	var that = this;

	var promise = new Promise(function( resolve , reject) {

		Solid.web.del(notification.uri)
		.then(
			function(success)
			{
				that.notifications.filter(function(element){ return element.uri !== notification.uri;});
				resolve(notification);
			})
		.catch(function(err)
		{
			reject(notification);
		});
	});

	return promise;
};

ChatHandler.prototype.initChatWith = function(friends , containerName) {

	this.currentChat.friends = friends;
	this.currentChat.container = containerName;
	this.currentChat.messages = [];

	this.subscribeToContainer("Chat/Threads/" + containerName);
};

ChatHandler.prototype.startChatWith = function(friend , timeout)
{
	//ensure the websocket to my pod is open
	this.subscribeToContainer("Chat/Notifications");
	var that = this;

	var promise = new Promise(function ( resolve , reject ) {

		setTimeout(function() {reject() ;} , timeout);

		//first check whether container for the thread exists
		var participants = [that.entity.webid , friend.webid];
		var containerName = that.getContainerNameForChat(participants);
		var parentDir = that.entity.storage + storagePath + "Chat/Threads/";
		var friendsParentDir = friend.storage + storagePath + "Chat/Threads/";
		var friendsNotificationsDir = friend.storage + storagePath + "Chat/Notifications/";

		podHandler.resourceExists(parentDir , containerName)
		.then( function(response) {
			//resource exists which means an old chat. So, send text directly to the other participants
			//check resource exists at other parties
			podHandler.resourceExists(friendsParentDir , containerName)
			.then( function(response) {
				//no need for handshake. Ready to send messages
				console.log("no need for handshaking. Ready for messaging");

				resolve(response);
			})
			.catch( function (response) {
				if ( response.status === 404 )
				{
					that.sendNotification(friendsNotificationsDir , NotificationType.handshakestart , containerName).then(
						function(meta){
							resolve(meta);
						})
					.catch(function(error){
						reject(error);
					});
				}
				else
				{
					console.log("friend's container can't be found with status: " + response.status);
				}
			});
		}) 
		.catch( function(response) {
			//chat thread container does not exist. So, create it and handshake with the other participants
			Solid.web.create(response.parentDir, "", response.resName , true).then(
			  function(solidResponse) {
			    
			    that.sendNotification(friendsNotificationsDir , NotificationType.handshakestart , containerName).then(
			    	function(meta){
			    		resolve(meta);
		    	})
			    .catch(function(error){
			    	reject(error);
			    });
			  }
			).catch(function(err){
			  reject(err);
			});
		});

		//listen to changes in this container to update messages recieved.
		that.initChatWith([friend] , containerName);
	});

	return promise;
};


ChatHandler.prototype.sendPost = function(friends , thread , content , type , timestamp)
{
	var that = this;
	var promise = new Promise(function ( resolve , reject ) {

		var data = '@prefix ldchat: ' + CHAT_NAMESPACE + '.\n\n' +
					'<> a ldchat:Post;\n' +
			    	'ldchat:postType ldchat:' + type + ' ;\n' +
			    	'ldchat:sender <' + that.entity.webid + '>;\n'+
			    	'ldchat:content \"' + content + '\";\n' +
					'ldchat:time \"' + timestamp + '\";';

		var participants = friends.slice();
		participants.push(that.entity);

		that.sentToCount = participants.length;

		for ( var i in participants)
		{
			var participant = participants[i];
			var parentDir = participant.storage + storagePath + "Chat/Threads/" + thread + "/";

			Solid.web.create(parentDir , data , timestamp).then(
			function(meta) {
				if ( --(that.sentToCount) === 0 )
					resolve(timestamp);
			}).catch(function(err) {
				// if ( --(that.sentToCount) === 0 )
					reject(err);
			});	
		}
	});

	return promise;
};

ChatHandler.prototype.sendPostToCurrentChat = function(data , type , timestamp)
{
	return this.sendPost(this.currentChat.friends , this.currentChat.container , data , type , timestamp);
}

ChatHandler.prototype.readCurrentChat = function(lastPostRead) {

	return this.readPosts(this.currentChat.container , lastPostRead);
};

ChatHandler.prototype.readPosts = function(thread , lastPostRead)
{
	var promise = new Promise(function (resolve , reject) {

		Solid.web.get(thread + "*").then(function(graph){

			var posts = graph.statementsMatching(undefined, RDF('type'), CHAT('Post'));


            if ( stmts.length > 0 )
            	that.parsePosts(stmts);
		})
		.catch(function(err){

		});
	});

	return promise;
};

ChatHandler.prototype.parsePosts = function(stmts) {

	var that = this;

	that.currentChat.messages = [];
	that.postsCount = stmts.length;

	stmts.forEach(function(item) {
		that.loadPost(removeDuplicateSlashInURL(item.subject.uri)).then(
			function( post )
			{
				that.currentChat.messages.push(post);
				if ( --(that.postsCount) === 0 )
					that.scope.bindMessages(that.currentChat.messages);
			})
		.catch( function(err)
		{
			console.log("can't load posts");
		});
	});
};

ChatHandler.prototype.loadPost = function(postURL) {

	var promise = new Promise(function(resolve , reject) {
		Solid.web.get(postURL).then(
			function(graph){

				var postSubject = graph.any(undefined , RDF('type') , CHAT('Post') );

				if (postSubject)
				{
					var post = {};
					post.uri = postSubject.uri

					var type = graph.any(postSubject , CHAT('postType') , undefined);

					if (type)
						post.type = type.value.substr(type.value.indexOf('#') + 1);

					var sender = graph.any(postSubject , CHAT('sender') , undefined);

					if (sender)
						post.sender = sender.value;

					var content = graph.any(postSubject , CHAT('content') , undefined);

					if (content)
						post.content = content.value;

					var time = graph.any(postSubject , CHAT('time') , undefined);

					if (time)
						post.time = time.value;

					if ( post.sender && post.content)
						resolve(post);
				}

				reject("no posts found");
			})
		.catch(function(err) {
			reject(err);
		});
	});

	return promise;
};

ChatHandler.prototype.wipeContainer = function(container) {

	var that = this;
	var con = this.entity.storage + "Chat/" + container + "/";
	//fetch all resources in this container
	Solid.web.get(container).then(
		function(graph) {

            var contentFilesStmts = graph.statementsMatching( $rdf.sym(container) , $rdf.sym("http://www.w3.org/ns/ldp#contains"), undefined);

            if ( contentFilesStmts.length > 0 )
            {
            	contentFilesStmts.forEach(function(item) {
				Solid.web.del(item.object.uri).then(
					function( response )
					{
						console.log("resource " + item.object.uri + " deleted");
					})
				.catch( function(err)
				{
					console.log("can't delete resource");
				});
			});
            }
		}

	).catch(function(err){
		console.log("can't get container" + con);
	});	
}