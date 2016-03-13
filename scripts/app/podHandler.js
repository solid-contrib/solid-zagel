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


PodHandler.prototype.resourceExists = function(parentDir , resName )
{
	var promise = new Promise(function(resolve , reject) {
		Solid.web.head(parentDir + resName).then(
		  function(meta) {
		    if (meta.xhr.status === 200)
		    {
		    	resolve({parentDir: parentDir , resName: resName , status: 200});
		    }
		    else if (meta.xhr.status === 403)
		      	reject({parentDir: parentDir , resName: resName , status: 403});
		    else if (meta.xhr.status === 404)
		      	reject({parentDir: parentDir , resName: resName , status: 404});
		  }
		);
	});

	return promise;
};




PodHandler.prototype.getStorageLocation = function(webid)
{
	var promise = new Promise(function(resolve , reject){

		var store = $rdf.graph();
		var timeout = 5000; // 5000 ms timeout
		var fetcher = new $rdf.Fetcher(store);
		var profileDoc = getProfileDocumentLocation(webid);

		fetcher.nowOrWhenFetched(profileDoc, undefined , function(ok, body, xhr) {
		    if (!ok) {
		        console.log("Oops, something happened and couldn't fetch data");
		        reject(xhr.status);
		    } else {
		        var me = $rdf.sym(webid);
				var storage = $rdf.sym('http://www.w3.org/ns/pim/space#storage');
				var strg = store.any(me, storage);

	            resolve(strg.uri);         }     
	        }); 
	});
	
	return promise;
};





PodHandler.prototype.getProfileInfo = function(webid)
{
	var promise = new Promise(function(resolve , reject) {

		var profileDoc = getProfileDocumentLocation(webid);

		var store = $rdf.graph();
		var fetcher = new $rdf.Fetcher(store , 5000);

		fetcher.nowOrWhenFetched(profileDoc , undefined , function(ok , body , xhr) {
			if (!ok)
			{
				console.log("failed to bring friend's info for " + webid + " status: " + xhr.status);

				reject(xhr.status);
			}
			else
			{
				console.log("firnd info loaded successfully for " + webid);

				var entity = $rdf.sym(webid);
				var entityObj = {};
				entityObj.webid = webid;
				entityObj.friendlyWebid = friendlyWebid(webid);
				entityObj.name = store.any(entity , FOAF("name") , undefined);
				if (typeof entityObj.name === 'object') entityObj.name = entityObj.name.value;
				entityObj.avatar = store.any(entity , FOAF("img") , undefined);
				if (typeof entityObj.avatar === 'object') entityObj.avatar = entityObj.avatar.uri;
				entityObj.storage = store.any(entity , WRKSPC("storage") , undefined);
				if (typeof entityObj.storage === 'object') entityObj.storage = entityObj.storage.uri;
				//load more parameters from the profile doc.
				resolve(entityObj);
			}
		});
	});

	return promise;
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




PodHandler.prototype.getFriends = function(webid)
{
	var store = $rdf.graph();
	var fetcher = new $rdf.Fetcher(store , 5000);
	var profileCard = getProfileDocumentLocation(webid);
	var that = this;

	var promise = new Promise( function(resolve , reject) {

		fetcher.nowOrWhenFetched(profileCard , undefined , function(ok , body , xhr) {
			if (!ok)
			{
				console.log("failed to bring friends for " + webid);
				reject(xhr.status);
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

					that.getProfileInfo(friend.uri)
					.then(function(friendObj) {
						friendsList.push(friendObj);
						totalFriends--;

						if (totalFriends === 0)
						{
							resolve(friendsList);
						}
					})
					.catch(function(status){
						console.log("Can't get friend " + friend + " data");
						totalFriends--;
						reject(status);
					});
				}
			}
		});
	});

	return promise;
};