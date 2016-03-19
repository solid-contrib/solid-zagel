var Solid = require('solid.js');
var RDF = $rdf.Namespace("http://www.w3.org/1999/02/22-rdf-syntax-ns#");
var RDFS = $rdf.Namespace("http://www.w3.org/2000/01/rdf-schema#");
var FOAF = $rdf.Namespace("http://xmlns.com/foaf/0.1/");
var XSD = $rdf.Namespace("http://www.w3.org/2001/XMLSchema#");
var WRKSPC = $rdf.Namespace("http://www.w3.org/ns/pim/space#");
var ACL = $rdf.Namespace("http://www.w3.org/ns/auth/acl#");

var PermissionType = {
	Owner: "Owner",
	Read: "Read",
	Write: "Write",
	Append: "Append"
}

function Permissions()
{

};

Permissions.prototype.setPermissions = function(agents , permissions) {

};

Permissions.prototype.getPermissions = function(agent){

};