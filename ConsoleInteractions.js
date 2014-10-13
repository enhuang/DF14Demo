
/* Console api interactions
----------------------------------------------------------*/

//First define a list of "special message" commands
var CONSOLE_COMMANDS = {
	ObjectId: '[ConsoleObjectId]',
	TabLink: '[ConsoleTabLink]'
}

//Parse for console message
// if a general message, use the chat helper
function parseConsoleMessage(msg) {
	var parsedMsg;

	if(msg.indexOf(CONSOLE_COMMANDS.ObjectId) === 0) {
	 	parsedMsg = "<a href='javascript:sforce.console.openPrimaryTab(null, \"/"
	 		+ msg.replace(CONSOLE_COMMANDS.ObjectId, '')
	 		+ "\", true)'>Open Tab</a>";
	} else if(msg.indexOf(CONSOLE_COMMANDS.TabLink) === 0) {
		parsedMsg = "<a href='javascript:sforce.console.openConsoleUrl(null, \"/"
	 		+ msg.replace(CONSOLE_COMMANDS.TabLink, '')
	 		+ "\", true)'>Open Workspace</a>";
	} else {
		parsedMsg = QBChatHelpers ? QBChatHelpers.parser(msg) : msg;
	}

	return parsedMsg;
}

//Call console api, pass in a callback that 
// gets the object id and send the result via chat
function sendTabLink() {
    sforce.console.getFocusedSubtabObjectId(function(result) {
        sendMessage(CONSOLE_COMMANDS.ObjectId + result.id);
    });
}

//Call console api, pass in a callback that 
// gets the workspace link and send the result via chat
function sendWorkspaceLink() {
	sforce.console.getTabLink(sforce.console.TabLink.PARENT_AND_CHILDREN, null, function(result){
		sendMessage(CONSOLE_COMMANDS.TabLink + result.tabLink);
	});
}
