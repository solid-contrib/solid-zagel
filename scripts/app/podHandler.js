var Solid = require('solid.js');
var RDF = $rdf.Namespace("http://www.w3.org/1999/02/22-rdf-syntax-ns#");
var RDFS = $rdf.Namespace("http://www.w3.org/2000/01/rdf-schema#");
var FOAF = $rdf.Namespace("http://xmlns.com/foaf/0.1/");
var XSD = $rdf.Namespace("http://www.w3.org/2001/XMLSchema#");
var WRKSPC = $rdf.Namespace("http://www.w3.org/ns/pim/space#");



function PodHandler(webid)
{
	this.webid = webid;
	this.profileDoc = getProfileDocumentLocation(webid);
	
};



PodHandler.prototype.getWebsocket = function(successCAllback , failedCallback)
{
	Solid.web.head(this.profileDoc).then(
	  function(solidResponse) {
	    console.log(solidResponse.acl);

	    if ( solidResponse.xhr.status === 200 )
	    	successCAllback(solidResponse.websocket);
	    else
	    	failedCallback(solidResponse.xhr.status);
	  }
	);
};


PodHandler.prototype.resourceExists = function(parentDir , resPath , successCAllback , failedCallback)
{
	console.log("Checking reousrce " + parentDir + resPath );
	return Solid.web.head(parentDir + resPath).then(
	  function(meta) {
	    if (meta.xhr.status === 200) {
	    	console.log("resource " + parentDir + resPath + " exists");
	    	successCAllback(parentDir , resPath , 200);
	    }
	    else if (meta.xhr.status === 403) {
	      console.log("You don't have access to the resource");
	      failedCallback(parentDir , resPath , 403);
	    } else if (meta.xhr.status === 404) {
	      console.log(parentDir + resPath + " resource doesn't exist");
	      failedCallback(parentDir , resPath, 404);
	    }
	  }
	);
};




PodHandler.prototype.getStorageLocation = function(webid , successCAllback, failedCallback)
{
	var store = $rdf.graph();
	var timeout = 5000; // 5000 ms timeout
	var fetcher = new $rdf.Fetcher(store);
	var profileDoc = getProfileDocumentLocation(webid);

	fetcher.nowOrWhenFetched(profileDoc, undefined , function(ok, body, xhr) {
	    if (!ok) {
	        console.log("Oops, something happened and couldn't fetch data");
	        failedCallback(xhr.status);
	    } else {
	        var me = $rdf.sym(webid);
			var storage = $rdf.sym('http://www.w3.org/ns/pim/space#storage');
			var strg = store.any(me, storage);

            successCAllback(strg.uri);         }     
        }); 
};





PodHandler.prototype.getProfileInfo = function(webid , successCAllback , failedCallback)
{
	var profileDoc = getProfileDocumentLocation(webid);

	var store = $rdf.graph();
	var fetcher = new $rdf.Fetcher(store , 5000);

	fetcher.nowOrWhenFetched(profileDoc , undefined , function(ok , body , xhr) {
		if (!ok)
		{
			console.log("failed to bring friend's info for " + webid + " status: " + xhr.status);

			failedCallback(xhr.status);
		}
		else
		{
			console.log("firnd info loaded successfully for " + webid);

			var entity = $rdf.sym(webid);
			var entityObj = {};
			entityObj.webid = webid;
			entityObj.name = store.any(entity , FOAF("name") , undefined);
			if (typeof entityObj.name === 'object') entityObj.name = entityObj.name.value;
			entityObj.avatar = store.any(entity , FOAF("img") , undefined);
			if (typeof entityObj.avatar === 'object') entityObj.avatar = entityObj.avatar.uri;
			entityObj.storage = store.any(entity , WRKSPC("storage") , undefined);
			if (typeof entityObj.storage === 'object') entityObj.storage = entityObj.storage.uri;
			//load more parameters from the profile doc.
			successCAllback(entityObj);
		}
	});
};




PodHandler.prototype.createContainer = function(parentDir , resPath, successCAllback, failedCallback , data)
{
	var isContainer = (data.length === 0);
	Solid.web.create(parentDir , data , resPath , isContainer).then(
	  function(meta) {
	    console.log("resource " + meta.url + " created. exists = " + meta.exists );
	    // The resulting object has several useful properties. Refer to the solid.js docs for more information/examples
	    // meta.url - value of the Location header
	    // meta.acl - url of acl resource
	    // meta.meta - url of meta resource
	    successCAllback(meta);
	  }
	).catch(function(err){
	  console.log(err); // error object
	  console.log(err.status); // contains the error status
	  console.log(err.xhr); // contains the xhr object

	  failedCallback(err);
	});
};




PodHandler.prototype.getFriends = function(webid , successCAllback , failedCallback)
{
	var store = $rdf.graph();
	var fetcher = new $rdf.Fetcher(store , 5000);
	var profileCard = getProfileDocumentLocation(webid);
	var that = this;

	fetcher.nowOrWhenFetched(profileCard , undefined , function(ok , body , xhr) {
		if (!ok)
		{
			console.log("failed to bring friends for " + webid);
			failedCallback(xhr.status);
		}
		else
		{
			console.log("friends list obtained for " + webid);

			var me = $rdf.sym(webid);
			var friends = store.each(me , FOAF("knows") , undefined);

			var totalFriends = friends.length;
			var friendsList = [];

			for (var i = 0 ; i < friends.length ; i++ )
			{
				var friend = friends[i];

				that.getProfileInfo(friend.uri , function(friendObj) {
					friendsList.push(friendObj);
					totalFriends--;

					if (totalFriends === 0)
					{
						successCAllback(friendsList);
					}
				}, function(status){
					console.log("Can't get friend " + friend + " data");
					totalFriends--;
				});
			}
		}
	});
};