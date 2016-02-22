app.service('sharedProperties' , function() {
	var userInfo = {
		webid: "",
		selectedContainer: "Public",
		allContainers: [],
	};

	return {
		getUserInfo: function () { return userInfo;},
	};
});