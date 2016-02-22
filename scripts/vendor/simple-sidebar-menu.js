app.service('sharedProperties' , function() {
	var webid = "";

	return {
		getWebid: function () { return webid;},
		setWebid: function (value) { webid = value;}
	};
});