var defaultContainers = {};
var conCreationStatus = {};
var alreadyDone = false;
var me = {};
var other = {};
var messages = {};
var storagePath = "/Public/";
const MAX_TRIALS = 3;
var podHandler;
var chatHandler;

app.controller('ChathomeController', function($scope, sharedProperties) {
  
	me.webid = sharedProperties.getUserInfo().webid;
	podHandler = new PodHandler(me.webid);
	

	// $scope.me = me;

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
		 	 	podHandler.resourceExists(parentDir , resPath , function(parentDir , resPath, status){
		 	 		console.log("success: status is " + status);
		 	 		conCreationStatus[parentDir + resPath] = "Created";
		 	 	}, function(parentDir , resPath, status) {
		 	 		console.log("failure: status is " + status);

		 	 		var isCreated = conCreationStatus[parentDir+resPath] === "Created" || conCreationStatus[parentDir+resPath] === "Creating";
		 	 		console.log(conCreationStatus);
		 	 		console.log("isCreated = " + isCreated);

		 	 		if (status === 404 && isCreated === false)	//not found
		 	 		{
		 	 			conCreationStatus[parentDir+resPath] = "Creating";
		 	 			podHandler.createContainer(parentDir , resPath, function(meta){
		 	 				console.log("container created: " + meta.url);
		 	 				conCreationStatus[parentDir + resPath] = "Created";
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

		podHandler.getProfileInfo(me.webid , function(myInfo) {

			me.profileInfo = myInfo;
			$scope.profileInfo = myInfo;
			$scope.$apply();

		} , function(status) {

			if (retry)
			{
				fetchMyInfo(fetchProfInfoRetrials++ < MAX_TRIALS);
			}

		});
	};

	var fetchFriendsretrials = 0;

	var fetchFriendsList = function(retry) {
		podHandler.getFriends(me.webid , function(friendsList) {

			me.friends = {};

			for(var i in friendsList)
			{
				friend = friendsList[i];
				friend.notifications = 14;
				friend.status = "online";

				me.friends[friend.webid] = friend;

				console.log(friend.name);
			}

			$scope.friends = friendsList;
			$scope.me = me;
			$scope.$apply();

		} , function(status) {

			if (retry)
			{
				fetchFriendsList(fetchFriendsretrials++ < MAX_TRIALS);
			}

		});
	};

	var showFriendsList = function() {
		$scope.me = me;

		// $(".friendName").bigText({
  //           horizontalAlign: "left",
  //           maximumFontSize: 10,
  //       });

		// $(".friendStatus").bigText({
  //           horizontalAlign: "left",
  //           maximumFontSize: 10,
  //       });
		setTimeout(function() { $('#loadingFriendsList').hide(); }, 1000);
	};

	var openPodConnection = function() {
		podHandler.getWebsocket(function(websocket) {
			me.websocket = websocket;
			$scope.me.websocket = websocket;
			chatHandler = new ChatHandler($scope.me);
		}, function(status) {

		});
	};

	$('#loadingFriendsList').show();

	podHandler.getStorageLocation(me.webid , function(storage) {	// success
		me.storage = storage;

		if (!alreadyDone)
		{
			fetchFriendsretrials = 0;
			fetchProfInfoRetrials = 0;

			openPodConnection();
			createContainers();
			fetchFriendsList(fetchFriendsretrials++ < MAX_TRIALS);

			fetchMyInfo(fetchProfInfoRetrials++ < MAX_TRIALS);

			showFriendsList();

			alreadyDone = true;
		}

		console.log("user's pod is " + storage);
	} ,
	function (errorCode) {	//failure
		console.log("Error retrieveing storage code " + errorCode);
	});

	 

	console.log(me.webid);


	var startChat = function (webid) {
		console.log("Start Chat with " + webid);

		$('#chat_window').show();
		other = me.friends[webid];

		$scope.other = other;
		$scope.$apply();

		//send chat init request
		chatHandler.startChatWith(other , function() {

		} , function () {

		} , 10000);
	};

	$scope.startChat = startChat;

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

	$("#btn-send-chat").off('click').on('click', function(e) {

    	//send message logic goes here

    	$("#input-chat").val("");
    });

    $('#chat_window').hide();
});