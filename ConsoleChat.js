/* Helper Functions for Chat
	mostly from qbchat example - helper.js
----------------------------------------------------------*/
function changeInputFileBehavior() {
	$('input:file').change(function() {
		var file = $(this).val();
		$('.attach').show().html('<span class="file">' + file + '<button type="button" class="close">&times;</button></span>');
	});
}

function updateTime() {
	$('.message time').timeago().removeAttr('title');
	setTimeout(updateTime, 60 * 1000);
}

function closeFile() {
	$('.attach').hide();
	$('input:file').val('');
}

function changeHeightChatBlock() {
	var outerHeightWrapHeader = 56;
	var outerHeightControls = $('#container').is('.wrap-rooms') ? 65 : 42;
	var outerHeightWell = 79;
	$('.panel-body').height(window.innerHeight - outerHeightWrapHeader);
	$('.messages, .col-content').height(window.innerHeight - outerHeightWrapHeader - outerHeightControls);
	$('.users').height(window.innerHeight - outerHeightWrapHeader - outerHeightControls - outerHeightWell);
}

function chooseOpponents(currentLogin) {
	return currentLogin == 'Quick' ? 'Blox' : 'Quick';
}

function trim(str) {
	if (str.charAt(0) == ' ')
		str = trim(str.substring(1, str.length));
	if (str.charAt(str.length-1) == ' ')
		str = trim(str.substring(0, str.length-1));
	return str;
}

function alertErrors(err) {
	alert(JSON.stringify($.parseJSON(err.detail).errors));
}

/* The simple chat functions, modified from 
	qbchat example -- chat.js
	Insert your QB application credentials here
-----------------------------------------------*/
var params, chatUser, chatService, recipientID;
var QBAPP = {
	/* Refer to QB Chat document
	appID: 8445,
	authKey: 'yyRRFJMjRqYVdgT',
	authSecret: 'zRmYWAr5djh48fu',
	publicRoom: 'public'
	*/
};

//Hard coded chat users here
// note that in reality, this should be integrated to 
// existing account system / SSO, etc
var chatUsers = [
	{
		id:'005xx000001Sv2hAAC',
		name:'Agent One',
		chatId: '158078699' //id for chat system
	},
	{
		id:'005xx000001Sv2mAAC',
		name:'Agent Two',
		chatId: '158078799'
	},
	{
		id:'005xx000001Sv2NAAS',
		name:'Manager',
		chatId: '160132499'
	}
];

$(document).ready(function() {
	// Web SDK initialization
	QB.init(QBAPP.appID, QBAPP.authKey, QBAPP.authSecret);
	
	// QuickBlox session creation
	QB.createSession(function(err, result) {
		if (err) {
			console.log(err.detail);
		} else {
			$('#loginForm').modal({
				backdrop: 'static',
				keyboard: false
			});
			
			$('.tooltip-title').tooltip();
			changeInputFileBehavior();
			updateTime();
			
			// events
			$('#logout').click(logout);
			$('.attach').on('click', '.close', closeFile);
			$('.chat input:text').keydown(startTyping);
			$('.sendMessage').click(makeMessage);
			login();
		}
	});
	
	window.onresize = function() {
		changeHeightChatBlock();
	};
});

function login() {
	$('#loginForm .progress').show();
	
	params = {
		login: sfdcUserId,
		password: 'test1234' // my password
	};
	
	// chat user authentication
	QB.login(params, function(err, result) {
		if (err) {
			onConnectFailed();
			console.log(err.detail);
		} else {
			chatUser = {
				id: result.id,
				login: params.login,
				pass: params.password
			};
			
			connectChat();
		}
	});
}

function connectChat() {
	// set parameters of Chat object
	params = {
		onConnectFailed: onConnectFailed,
		onConnectSuccess: onConnectSuccess,
		onConnectClosed: onConnectClosed,
		onChatMessage: onChatMessage,
		onChatState: onChatState,

		debug: false
	};
	
	chatService = new QBChat(params);
	
	// connect to QB chat service
	chatService.connect(chatUser);
}

function getChatUserName() {
	return (chatUser.backup && chatUser.backup.name) ? chatUser.backup.name :
		chatUser.login;
}

function startTyping() {
	if (chatUser.isTyping) return true;
	
	var message = {
		state: 'composing',
		type: 'chat',
		extension: {
			nick: getChatUserName()
		}
	};
	
	// send 'composing' as chat state notification
	chatService.sendMessage(recipientID, message);
	
	chatUser.isTyping = true;
	setTimeout(stopTyping, 5 * 1000);
}

function stopTyping() {
	if (!chatUser.isTyping) return true;
	
	var message = {
		state: 'paused',
		type: 'chat',
		extension: {
			nick: getChatUserName()
		}
	};
	
	// send 'paused' as chat state notification
	chatService.sendMessage(recipientID, message);
	
	chatUser.isTyping = false;
}

function makeMessage(event) {
	event.preventDefault();
	var file, text;
	
	file = $('input:file')[0].files[0];
	text = $('.chat input:text').val();
	
	// check if user did not leave the empty field
	if (trim(text)) {
		
		// check if user has uploaded file
		if (file) {
			$('.chat .input-group').hide();
			$('.file-loading').show();
			closeFile();
			
			QB.content.createAndUpload({file: file, 'public': true}, function(err, result) {
				if (err) {
					console.log(err.detail);
				} else {
					$('.file-loading').hide();
					$('.chat .input-group').show();
					sendMessage(text, result.name, result.uid);
				}
			});
		} else {
			sendMessage(text);
		}
	}
}

function sendMessage(text, fileName, fileUID) {
	stopTyping();
	
	var message = {
		body: text,
		type: 'chat',
		extension: {
			nick: getChatUserName()
		}
	};
	
	if (fileName && fileUID) {
		message.extension.fileName = fileName;
		message.extension.fileUID = fileUID;
	}
	
	// send user message
	chatService.sendMessage(recipientID, message);
	
	showMessage(message.body, new Date().toISOString(), message.extension, recipientID);
	$('.chat input:text').val('');
}

function showMessage(body, time, extension, chatToId) {
	var html, url, selector = $('.chat .messages');
	
	html = '<section class="message chatTo' + chatToId+ '">';
	html += '<header><b>' + (extension.nick || getNameFromChatId(chatToId)) + '</b>';
	html += '<time datetime="' + time + '">' + $.timeago(time) + '</time></header>';
	//parse for console message
	html += '<div class="message-description">' + parseConsoleMessage(body) + '</div>';
	
	// get attached file
	if (extension.fileName && extension.fileUID) {
		url = QBChatHelpers.getLinkOnFile(extension.fileUID);
		html += '<footer class="message-attach"><span class="glyphicon glyphicon-paperclip"></span> ';
		html += '<a href="' + url + '" target="_blank">' + extension.fileName + '</a></footer>';
	}
	
	html += '</section>';
	
	if ($('.typing-message')[0])
		$('.typing-message').before(html);
	else
		selector.append(html);
	
	selector.find('.message:even').addClass('white');
	selector.scrollTo('*:last', 0);
}

function logout() {
	// close the connection
	chatService.disconnect();
}

/* Callbacks
----------------------------------------------------------*/
function onConnectFailed() {
	$('#loginForm .progress').hide();
	$('#loginForm button').show();
}

function onConnectSuccess() {
	setThisUser(chatUser.login);
	fillUserList();
	chatTo(0);

	$('#loginForm').modal('hide');
	$('#container').show();
	$('.chat .messages').empty();
	$('.chat input:text').focus().val('');
	changeHeightChatBlock();
		
	// create a timer that will send presence each 60 seconds
	chatService.startAutoSendPresence(60);
}

function setThisUser(curUserLogin) {
	//remove this user from list
	for(var i=0,len=chatUsers.length;i<len;i++) {
		if(chatUsers[i].id === curUserLogin) {
			chatUser.backup = chatUsers.splice(i,1)[0];
			return;
		}
	}
	console.error("did not find a user, should not happen. check the 'hardcoded' chatUsers array");
}

function chatTo(index) {
	changeChatPanelTitle(chatUsers[index].name);
	recipientID = chatUsers[index].chatId;
	$('section.message').hide();
	$('section.chatTo' + chatUsers[index].chatId).show();
	$('.chat input:text').focus();
}

function getNameFromChatId(chatId) {
	//remove this user from list
	for(var i=0,len=chatUsers.length;i<len;i++) {
		if(chatUsers[i].chatId === chatId.toString()) {
			return chatUsers[i].name;
		}
	}
	return "Unknown User";
}

function fillUserList() {
	var chatListHtml = '';
	for(var i=0,len=chatUsers.length;i<len;i++) {
		chatListHtml += '<li class="list-group-item" onclick="chatTo(' + i 
			+')"><span class="glyphicon glyphicon-user"></span> ' + chatUsers[i].name + '</li>\n';		
	}

	$('.chat .chat-user-list').html(chatListHtml);
}

function changeChatPanelTitle(opponent)
{
	$('.panel-title .opponent').text(opponent);
}

function onConnectClosed() {
	$('#container').hide();
	$('#loginForm').modal('show');
	$('#loginForm .progress').hide();
	$('#loginForm button').show();
	if(chatUser && chatUser.backup) {
		chatUsers = chatUsers.push(chatUser.backup);
	}
	
	chatUser = null;
	chatService = null;
}

function onChatMessage(senderID, message) {
	showMessage(message.body, message.time, message.extension, senderID);
}

function onChatState(senderID, message) {
	switch (message.state) {
	case 'composing':
		$('.chat .messages').append('<div class="typing-message">' + message.extension.nick + ' ...</div>');
		$('.chat .messages').scrollTo('*:last', 0);
		break;
	case 'paused':
		QBChatHelpers.removeTypingMessage($('.typing-message'), message.extension.nick);
		break;
	}
}
