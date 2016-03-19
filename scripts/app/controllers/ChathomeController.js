var defaultContainers = {};
var conCreationStatus = {};
var alreadyDone = false;
var me = {};
var other = {};
var messagesArray = [];
var messagesObject = {};
var storagePath = "Public/";
const MAX_TRIALS = 6;
const NOTIFICATION_UPDATE_INTERVAL = 10000;
var postsChanged = false;
var friendsListChanged = false;
var podHandler;
var chatHandler;

app.controller('ChathomeController', function($scope, $location , $window , sharedProperties) {
  
  	if ( !me.webid )
  	{
  		alreadyDone = false;
  		me.webid = sharedProperties.getUserInfo().webid || sessionStorage.getItem("userWebid");
		podHandler = new PodHandler(me.webid);
  	}
	
	$scope.posts = [];

	$scope.safeApply = function(fn) {
	  var phase = this.$root.$$phase;
	  if(phase == '$apply' || phase == '$digest') {
	    if(fn && (typeof(fn) === 'function')) {
	      fn();
	    }
	  } else {
	    this.$apply(fn);
	  }
	};

	var createContainers = function() {
		$.getJSON('containers.json', function(response){
	       defaultContainers = response;
	       
		 })
		 .success(function() { 
		 	//containers definition is loaded. Now time to ensure containers exists
		 	for (var key in defaultContainers)
		 	{
		 		(function(k) {
		 		// if (!defaultContainers.hasOwnProperty(k)) continue;
		 		var value = defaultContainers[k];
		 		var resType = (typeof value === "object")? "resource" : "container";
		 		
		 		var resPath = "";
		 		var resData = "";

		 		if ( resType === "container" )
		 			resPath = value;
		 		else {
		 			resPath = value.path;
		 			resData = value.data;
		 		}

		 		var parentDir = me.storage + storagePath;

		 		// console.log("key = " + key + " value = " + resource);
		 	 	podHandler.resourceExists(parentDir , resPath)
		 	 	.then( function(response){
		 	 		console.log("success: status is " + response.status);
		 	 		conCreationStatus[response.parentDir + response.resName] = "Created";
		 	 	})
		 	 	.catch( function(response) {
		 	 		console.log("failure: status is " + response.status);

		 	 		var isCreated = conCreationStatus[response.parentDir+response.resName] === "Created" ||
		 	 						conCreationStatus[response.parentDir+response.resName] === "Creating";

		 	 		if (response.status === 404 && isCreated === false)	//not found
		 	 		{
		 	 			conCreationStatus[response.parentDir+response.resName] = "Creating";
		 	 			podHandler.createContainer(response.parentDir , response.resName, function(meta){
		 	 				console.log("container created: " + meta.url);
		 	 				conCreationStatus[response.parentDir + response.resName] = "Created";
		 	 			}, function (error) {
		 	 				console.log("error creating container " + error);
		 	 			}, resData);
		 	 		}
		 	 	});
		 		})(key);
		 	}
		  })
		 .error(function(obj , err) { console.log(err); });
	};

	var fetchProfInfoRetrials = 0;

	var fetchMyInfo = function(retry) {

		podHandler.getProfileInfo(me.webid)
		.then(function(myInfo) {

			
			$scope.safeApply(function(){
				me.profileInfo = myInfo;
				$scope.profileInfo = myInfo;
			});

		})
		.catch(function(status) {

			if (retry)
			{
				fetchMyInfo(fetchProfInfoRetrials++ < MAX_TRIALS);
			}

		});
	};

	var fetchFriendsretrials = 0;

	var fetchFriendsList = function(retry) {

		podHandler.getFriends(me.webid)
		.then( function(friendsList) {

			me.friends = {};

			for(var i in friendsList)
			{
				friend = friendsList[i];
				friend.notifications = getRandomIntInclusive(0 , 15);
				friend.status = "online";

				me.friends[friend.webid] = friend;

				console.log(friend.name);
			}

			if ( !me.friends[me.webid] && me.profileInfo )
			{
				me.friends[me.webid] = {
						avatar: me.profileInfo.avatar,
						name: me.profileInfo.name,
						notifications: getRandomIntInclusive(0 , 15),
						status: 'online',
						storage: me.profileInfo.storage,
						webid: me.webid
					};
			}
			
			// $scope.safeApply(function() {
			// 	$scope.friends = friendsList;
			// 	$scope.me = me;
			// });
			friendsListChanged = true;

		})
		.catch(function(status) {

			if (retry)
			{
				setTimeout(function(){
					fetchFriendsList(fetchFriendsretrials++ < MAX_TRIALS);
				} , fetchFriendsretrials * 200);
			}

		});
	};

	var showFriendsList = function() {
		$scope.me = me;

		var friends = [];

		for (var key in me.friends)
		{
			var friend = me.friends[key];
			friends.push(friend);
		}

		friends.sort( function (friend1 , friend2) {
			return friend1.name.localeCompare(friend2.name);
		});

		$scope.safeApply(function() {
			$scope.friends = friends;
		});

		setTimeout(function() { $('#loadingFriendsList').hide(); }, 1000);
	};

	var openPodConnection = function() {
		podHandler.getWebsocket(function(websocket) {
			me.websocket = websocket;
			$scope.me = me;
			$scope.me.websocket = websocket;
			chatHandler = new ChatHandler($scope);
		}, function(status) {

		});
	};

	var updateNotifications = function() {
		if ( chatHandler )
		{
			setInterval(function(){
				chatHandler.updateNotifications(me.friends).then(
					function(notifications){
						for (var key in me.friends)
						{
							var friendNotifications = notifications[key];
							var friend = me.friends[key];
							friend.notifications = friendNotifications;
						}

						friendsListChanged = true;
				})
				.catch(function(err){

				});

			} , NOTIFICATION_UPDATE_INTERVAL);
		}
	};

	var logout = function() {
        
        // if ( $window.crypto )
        // 	$window.crypto.logout();

        //reset user data
        me = {};
        $scope.me = {};
        $scope.profileInfo = {};
        $scope.friends = {};
        sessionStorage.removeItem("userWebid");
        
        //redirect to the login page
        setTimeout( function() {
	      	$scope.safeApply(function() {
		        $location.path("/signin");
		      });
	      } , 1000);
    };

    $scope.logout = logout;

	$('#loadingFriendsList').show();

	podHandler.getStorageLocation(me.webid)
		.then(function(storage)
		{
			me.storage = storage;

			if (!alreadyDone)
			{
				fetchFriendsretrials = 0;
				fetchProfInfoRetrials = 0;

				openPodConnection();
				createContainers();
				fetchFriendsList(fetchFriendsretrials++ < MAX_TRIALS);

				fetchMyInfo(fetchProfInfoRetrials++ < MAX_TRIALS);

				alreadyDone = true;
			}

			// periodically check whether posts are changed to display them.
			setInterval( renderChanges , 1000);
		})
		.catch(function (errorCode) {	//failure
			console.log("Error retrieveing storage code " + errorCode);
		});

	var renderChanges = function () {

		if ( postsChanged )
		{
			orderMessages();
			$scope.$apply();
			postsChanged = false ;

			$window.scrollTo(0,document.body.scrollHeight);
		}

		if( friendsListChanged )
		{
			showFriendsList();
			friendsListChanged = false;
		}
	};

	var startChat = function (webid) {

		if ( webid === $scope.currentChatWebid )
			return;

		startChatUIUpdate(webid);

		other = me.friends[webid];
		$scope.currentChatWebid = webid;

		$scope.safeApply(function() {
			$scope.other = other;
			$scope.posts = [];
		});

		//send chat init request
		showMessageLoading(true);

		chatHandler.startChatWith(other , 10000).then( function(response) {

			setTimeout(function () {
				showMessageLoading(false);
			} , 1000);

			other.notifications = 0;
			$scope.$apply();
			// chatHandler.wipeContainer(me.storage + "Public/Chat/Threads/" + response.resName + "/");
			// chatHandler.wipeContainer(other.storage + "Public/Chat/Threads/" + response.resName + "/");


			// chatHandler.sendPostToCurrentChat("hello this is a test message" , PostType.text).then(function(meta){

				
			// });
		})
		.catch( function (error) {
			showMessageLoading(false);
		});
	};

	$scope.startChat = startChat;

	var startChatUIUpdate = function (webid) {

		$('#chat_window').show();
		$('.friendLinkContainer').css('background-color' , 'transparent');
		var fwebid = friendlyWebid(webid)
		$('#' + fwebid).css('background-color', 'blue');
	};

	var bindMessages = function(postsList) {

		// if the number of posts retrieved from the server is the same as the ones already bound,
		// this means no need to rebind as this update because of pushing my own message into my pod.
		// this message is already added before sending it to the pod
		if ( postsList.length <= $scope.posts.length )
			return ;

		for ( var i in postsList)
		{
			var post = postsList[i];
			var participant = me.friends[post.sender] || me.profileInfo;

			if ( participant )
			{
				post.avatar = participant.avatar || "http://www.bitrebels.com/wp-content/uploads/2011/02/Original-Facebook-Geek-Profile-Avatar-1.jpg";
				post.name = participant.name;

				addMessage(post , post.time);
			}
		}

		postsChanged = true;
	};

	var setLastSeenPost = function(timestamp)
	{
		chatHandler.setLastSeen($scope.currentChatWebid , timestamp);
	}

	$scope.bindMessages = bindMessages;

	var sendMessage = function(e) {

		var msg = $('#input-chat').val();

		if ( msg.length > 0 )
		{
			var type = PostType.text;
			var timestamp = Date.now();
			chatHandler.sendPostToCurrentChat(msg , type , timestamp).then(function(timestamp){


			});

			var post = {
				sender: me.webid,
				type: type,
				time: timestamp,
				content: msg,
				avatar: me.profileInfo.avatar
			}

			$scope.safeApply(function() {

				addMessage(post , "" + timestamp);

				setTimeout(function() {$window.scrollTo(0,document.body.scrollHeight);	} , 50);
			});

			//clear the text field
			$("#input-chat").val("");
		}
	};

	$scope.sendMessage = sendMessage;

	var showMessageLoading = function(show) {

		if (show)
		{
			$('#loadingMessages').show();
			$('#input-chat').prop('disabled' , true);
			$('#btn-send-chat').prop('disabled' , true);
		}
		else
		{
			$('#loadingMessages').hide();
			$('#input-chat').prop('disabled' , false);
			$('#btn-send-chat').prop('disabled' , false);
			$('#input-chat').focus();
		}
	};

	var addMessage = function(post , timestamp) {

		if ( timestamp !== "undefined" && messagesArray.indexOf(timestamp) === -1 )
		{
			if ( post.sender === me.webid )
			{
				post.whoisthis = "me";
				post.baseClass = "base_sent";
				post.msgClass = "msg_sent";
			}
			else
			{
				post.whoisthis = "someoneelse";
				post.baseClass = "base_receive";
				post.msgClass = "msg_recei";
			}

			post.formattedTime = timestampToDate(timestamp);

			messagesArray.push(timestamp);
			messagesObject[timestamp] = post;

			$scope.posts.push(post);
		}
	};

	var orderMessages = function() {

		messagesArray.sort();

		var posts = [];

		for ( var i in messagesArray)
		{
			var timestamp = messagesArray[i];
			var post = messagesObject[timestamp];

			posts.push(post);
		}

		$scope.posts = posts;
	};

	var getFriendObject = function(webid) {

		return me.friends[webid];
	};

	$scope.getFriendObject = getFriendObject;

	//show/hide the side menu
	$("#menu-toggle").off('click').on( 'click' , function(e) {

        e.preventDefault();
        $("#wrapper").toggleClass("toggled");

        if ( $('#menu-toggle').find(".glyphicon").hasClass("glyphicon-menu-left"))
        {
        	$("#menu-toggle").find(".glyphicon").removeClass("glyphicon-menu-left").addClass("glyphicon-menu-right");
        }
        else
        {
        	$("#menu-toggle").find(".glyphicon").removeClass("glyphicon-menu-right").addClass("glyphicon-menu-left");
        }
        
    });

    $("#input-chat").keyup(function(event){
	    if(event.keyCode == 13){
	        $("#btn-send-chat").click();
	    }
	});

	// $("#btn-send-chat").off('click').on('click', function(e) {

 //    	//send message logic goes here

 //    	$("#input-chat").val("");
 //    });

    $('#chat_window').hide();
    $('#loadingMessages').hide();
    $('#input-chat').prop('disabled' , true);
	$('#btn-send-chat').prop('disabled' , true);
	$('.msg_container_base').css('min-height' , $window.innerHeight + "px;");
});