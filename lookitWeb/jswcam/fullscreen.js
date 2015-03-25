// Fullscreen functions

function goFullscreen(element){

	addEvent(  {'type': 'goFullscreen'});
	$('#fsbutton').hide();
	
	if (screenfull.enabled) {
		screenfull.request(element);
	} else {
		// for IE or other non-supported ...
		// Unfortunately this does make it hard to tell when we leave fs--need to remove whole element.
		addEvent({'type': 'alternative Fullscreen'});
		bootbox.alert("It looks like your browser doesn't support full-screen requests.  Please maximize your browser window or enter fullscreen manually (try pressing F11).  Thanks!");
		element.style.height = screen.availHeight + 'px';
		// Just for IE: to avoid horizontal scroll bar
		element.style.width  = screen.availWidth-20  + 'px';
	}	
	
}

function leaveFullscreen(){
	addEvent(  {'type': 'endFullscreen'});
	if (screenfull.enabled) {
		screenfull.exit();
	}
}


function addFsButton(mainDivSelector, elementSelector) {
	// Make a 'return to full screen' button (will only be visible if the user leaves fs)
	var button = $('<button/>', {
		'id': 'fsbutton', 
		'value': 'Please return to full screen! (click here)', 
		'text': 'Please return to full screen! (click here)'});
	
	button.click(function(evt) {
		addEvent(  {'type': 'click',
					'fn': 'fullscreen'});
		goFullscreen($(elementSelector)[0]);
		return false;
	});

	$(mainDivSelector).append(button);
	$('#fsbutton').hide();
}