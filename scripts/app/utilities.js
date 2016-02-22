var getProfileDocumentLocation = function(webid) {

	if (webid.indexOf('#') >= 0 )
	{
		return webid.substr(0 , webid.lastIndexOf('#'));
	}

	return "";
};