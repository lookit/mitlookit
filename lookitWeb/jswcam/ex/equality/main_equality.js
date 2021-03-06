/*                                                                                                                                                                                                                                    
 * * Copyright (C) MIT Early Childhood Cognition Lab                                                                              
 */

var experiment; // where all information about experiment and events is stored--to send to server

var audiotype = 'none';
var condition; 		// counterbalancing condition
var tested = false; // whether parent has tried the audio 
var attachToDiv = '#maindiv';

experiment.record_whole_study = false; // records entire study, but retains segmentation indicated (just records in between too)--so clip #s doubled

var conditionSet = false;

// The function 'main' must be defined and is called when the consent form is submitted 
function main(mainDivSelector, expt) {
	
	promptBeforeClose();
	setDBID();
	
	experiment = expt;
	initializeExperiment();

	console.log("Starting experiment: ", experiment.name);
	$(mainDivSelector).attr('id', 'maindiv'); // so we can select it in css as #maindiv
	addEvent(  {'type': 'startLoading'});

	// Black out the screen until waitforassets returns	
	var box = bootbox.dialog(
		"Please wait while the experiment loads.", 
		[]); 
		
	if(LOOKIT.sandbox) {
		// Manually set the condition number
		condition = prompt('Please enter a condition number (0-3)', '0');
		startExperiment(condition, box);
	} else {
		// Get the appropriate condition from the server by checking which ones we 
		// already have
		$.getJSON(
			'counterbalance.php',
			{'experiment_id': experiment.id},
			function(jsonresp) {
				console.log(jsonresp);
				startExperiment(jsonresp.condition, box);
			}
		);
	}

}

function startExperiment(condition, box) {
    console.log('Condition: ' + condition);
	
	if (experiment.record_whole_study) {
		jswcam.startRecording();
		addEvent(  {'type': 'startRecording'});
	}
	
	// Parse out the counterbalancing condition:
	experiment.condition = condition;
	experiment.startMatchSound = condition % 2;
	experiment.startMatchLeft  = condition >= 2;
	
	if (experiment.startMatchSound) {
		var soundArray = ['match', 'mismatch_1', 'match', 'mismatch_2'];
	} else {
		var soundArray = ['mismatch_1', 'match', 'mismatch_2',  'match'];
	}
	
	if (experiment.startMatchLeft) {
		var imageArray = ['L_1', 'L_2', 'R_3', 'R_4'];
	} else {
		var imageArray = ['R_1', 'R_2', 'L_3', 'L_4'];
	}

	conditionSet = true;
	// Sequence of sections of the experiment, corresponding to html sections.
	
	experiment.htmlSequence = [['instructions'],
					['positioning'],
					['positioning2'],
					['startfullscreen'],
					['attentiongrabber'],
					['trial', imageArray[0], soundArray[0], 0],
					['attentiongrabber'],
					['trial', imageArray[1], soundArray[1], 1],
					['attentiongrabber'],
					['trial', imageArray[2], soundArray[2], 2],
					['attentiongrabber'],
					['trial', imageArray[3], soundArray[3], 3],
					['endfullscreen'],
					['formPoststudy']];

	// Then remove the dialog box blacking out the screen.
	// Force it to close because ajax call has occurred in between, as per
	// http://stackoverflow.com/questions/11519660/
	box.modal('hide');
	$('body').removeClass('modal-open');
	$('.modal-backdrop').remove();
		
	addEvent(  {'type': 'endLoading'});
	
	// Allow the user to end the experiment by pressing 'Home' or 'End' keys.
	document.addEventListener('keydown', getKeyCode, false);
	
	// Start the experiment
	advanceSegment();
}

	
function generateHtml(segmentName){

	addEvent(  {'type': 'htmlSegmentDisplayed'});
	$(attachToDiv).append('<div id="'+segmentName+'"></div>');
	$('#'+segmentName).load(experiment.path+'html/'+segmentName+'.html', 
	function() {
	
		// Scroll to the top of the page
		if($.browser.safari) bodyelem = $("body")
		else bodyelem = $("html,body")
		bodyelem.scrollTop(0);

		switch(segmentName){			
			case "formPoststudy":

				$(function() {
					
					$('#'+segmentName).submit(function(evt) {
						evt.preventDefault();
						if (experiment.record_whole_study) {
							jswcam.stopRecording();
							addEvent(  {'type': 'endRecording'});
						}	
						var formFields = $('#'+segmentName+' input, #'+segmentName+' select, #'+segmentName+' textarea');
						console.log(segmentName + ':  '+JSON.stringify(formFields.serializeObject()));
						experiment[segmentName] = formFields.serializeObject();
						validArray = validateForm(segmentName, experiment[segmentName]);
						if (validArray) {
							advanceSegment();
						}
						return false;
					});
				});
				
				break;
				
			case "positioning2": // special case to deal with checking audio
				
				var testaudio = $('#testaudio')[0];
				function setTestedTrue(event){
					tested = true;
				}
				testaudio.addEventListener('play', setTestedTrue, false);
				$(function() {
					$('#' + segmentName + ' #next').click(function(evt) {
						evt.preventDefault();
						if(tested){
							advanceSegment();
						}
						else{
							bootbox.alert('Please try playing the sample audio before starting the study.');
						}
						return false;
					});
					$('#' + segmentName + ' #back').click(function(evt) {
						evt.preventDefault();
						previousSegment();
						return false;
					});
				});
				break;		
				
				
			case "positioning":
				show_getting_setup_widget();
			
			case "instructions":
			
				if(segmentName=='instructions') {
					$('#'+segmentName).addClass('instructions');
					}
				$("body").removeClass('playingVideo');
				$(function() {
					$('#' + segmentName + ' #next').click(function(evt) {
						hide_cam("webcamdiv");
						evt.preventDefault();
						advanceSegment();
						return false;
					});
				});
				break;
			
			case "attentiongrabber":
				
				console.log('attentiongrabber segment');
				function keypressHandler(event){
				
					event.preventDefault();
					console.log('click');
					event = event.charCode || event.keyCode;
					console.log(event);
					if (event==32) { // Space bar
				
						addEvent(  {'type': 'click',
									'fn': 'advancetotrial'});
						document.removeEventListener("keydown", keypressHandler, false);
						advanceSegment();
					}
				}
			
				document.addEventListener("keydown", keypressHandler, false);
				
				var videotype = 'none';
				if ($('video')[0].canPlayType("video/webm")) {
					videotype = 'webm';
				} else if ($('video')[0].canPlayType("video/mp4")) {
					videotype = 'mp4';
				} else if($('video')[0].canPlayType("video/ogg")) {
					videotype = 'ogv';
				} 
				console.log(videotype);
			
				var video = $('video')[0];
				video.type = videotype;
				video.load(); // plays upon loading completely ('canplaythrough' listener)
				video.play();
				break;
			
			
			case "trial":
			
				// Check what type of audio file to use, store in global variable
				var audio = $('#trialAudio')[0];
				if (audio.canPlayType('audio/ogg;')) {
					audiotype = 'ogg';
					audioTypeString = 'audio/ogg';
				} else if( audio.canPlayType('audio/mp3')) {
					audiotype = 'mp3'
					audioTypeString = 'audio/mp3';
				} else {
					console.log('no audio');
				}
				
				imgSrc = experiment.path + 'img/' + experiment.htmlSequence[experiment.currentElement][1] + '.png';
				
				if (experiment.record_whole_study) {
					jswcam.stopRecording();
					addEvent({'type': 'endRecording'});
				}
				jswcam.startRecording();
				
				addEvent(  {'type': 'startRecording'});
				var audio = $('#trialAudio')[0];
				
				audioName = experiment.htmlSequence[currentElement][2];
				
				var audioSource = experiment.path + "sounds/" + audioName + '.' + audiotype;
				$('#trialAudio').attr('currentTime', 0);	
				$('#trialAudio').attr('src', audioSource);
				$('#trialAudio').attr('type', audioTypeString);		
				
				$('#trialImage').attr('src', imgSrc);
				
				audio.load();
				setTimeout(function(){audio.play();}, 2000); 		

				audio.addEventListener("ended", function() {jswcam.stopRecording(); addEvent(  {'type': 'stopRecording'});if(experiment.record_whole_study) {jswcam.startRecording(); addEvent({'type': 'startRecording'});} advanceSegment(); }, false);
				
				
				addEvent({'type': 'startPage', 
							  'image': imgSrc,
							  'sound': audioName});
				break;
				
		}
	});
	
	// Enter/exit fullscreen outside of callback function to deal with browser constraints
	if (segmentName=='startfullscreen') {
		$(attachToDiv).append('<div id="fs"></div>');
		addFsButton('#maindiv', '#fs');
		goFullscreen($('#fs')[0]);
		attachToDiv = '#fs';
		advanceSegment();
	} else if (segmentName=='endfullscreen') {
		leaveFullscreen();
		$('#fs').detach();
		$('#fsbutton').detach();
		attachToDiv = '#maindiv';
		//$("#flashplayer").remove();
		$("#widget_holder").css("display","none"); // Removes the widget at the end of the experiment
		advanceSegment();
	}

}


// Function to validate any of the forms (study-specific)
function validateForm(segmentName, formData) {
	valid = true;
	switch(segmentName){
		case 'formBasic':
			return validateFormBasic(formData);
			break;
		case 'formPoststudy':
			// if (formData.birthmonth == '[Month]' ||
				// formData.birthyear == '[Year]'   ||
				// formData.birthday.length == 0) {
				// valid = false;
				// $('#errorBirthdateMissing').removeClass('hidden');} 
			// else {
				// bd = parseInt(formData.birthday);
				// if (isNaN(bd) || bd < 1 || bd > 31){
					// $('#errorBirthdateMissing').removeClass('hidden');
					// valid = false;}
				// else{
					// birthdateObj = new Date(parseInt(formData.birthyear), parseInt(formData.birthmonth), bd);
					// ageInDays = (experiment.tic - birthdateObj)/(24*60*60*1000);
					// formData.ageInDays = ageInDays;
					// Birthdate is in the future
					// if (ageInDays < 0) {
						// valid = false;
						// $('#errorBirthdateMissing').removeClass('hidden');
					// }
					// else {
						// $('#errorBirthdateMissing').addClass('hidden');
					// }
				// }
			// }
			
			return valid;
			break;
		case 'formDemographic':
			return valid;
			break;
	}
}

function generate_debriefing() {

// Used by index.js when generating upload dialog (replace this.html('uploading'))
	DEBRIEFHTML = "<p> Some more information about this study: <p> <br> \
				\
				This study builds on work by \
				<a href='http://pss.sagepub.com/content/18/8/740.short'> \
				McCrink & Wynn, 2009</a> as well as \
				<a href='http://pss.sagepub.com/content/21/6/873.short'> \
				Lourenco & Longo, 2009</a> showing that infants recognize general relationships \
				between magnitudes: for instance, seeing 'twice as big' as similar to \
				'twice as long' and 'twice as many.'  We are interested in whether infants can \
				draw even more general analogies about 'sameness' in different domains, or whether \
				these very abstract connections are special to magnitudes (number, duration, size, \
				etc.). ";
				
	if (conditionSet) {
		DEBRIEFHTML += "<p> <br> Your child was in a 'MAGNITUDE-ONLY' condition, meaning that both the audio clips \
				(short and long tones, vs medium tones only) and the images (large and small squares, \
				vs medium squares only) could be described as magnitudes.  We expect that infants in \
				this condition will spend slightly longer on average looking at the mismatched squares \
				when the mismatched tones are played, and slightly longer looking at the matching squares \
				when the matching tones are played.  Other children were in 'MAGNITUDE-QUALITY' or \
				'QUALITY-ONLY' conditions, which included non-quantifiable differences among the stimuli:\
				for instance, all cat pictures vs. cats and dogs, or all major chords vs. both major and minor.\
				We are interested in whether infants also make analogies among these non-quantifiable \
				differences!";
				}
	
	return DEBRIEFHTML;

}