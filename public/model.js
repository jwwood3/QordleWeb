let DATA = {
	"WORDLENGTH": 5,
	"MAXATTEMPTS": 8,
	"ENDPOINT": "http://localhost:3000/api",
	"signals":{
		"guessWord": "GUESS_WORD"
	}
}
var makeSignaller = function() {
    var _subscribers = [];
    return {
	add: function(handlerFunction) { _subscribers.push(handlerFunction); },
	notify: function(args) {
	    for (var i = 0; i < _subscribers.length; i++) {
		_subscribers[i](args);
	    }
	}
    };
};
var makeModel = function(){
	var _attempts = [];
	var _attemptsLeft = DATA.MAXATTEMPTS;
	var _correctAnswers = [];
	var _hasGuessed = [0,0,0,0];
	var _letters = [[],[],[],[]];
	var _observers = makeSignaller();
	var _canLose = false;
	var _recentError = "";
	for(var i=0;i<4;i++){
		for(var j=0;j<26;j++){
			_letters[i].push('.');
		}
	}
	var _accuracy = [];
	return{
		"register": function(observerFunction){
			_observers.add(observerFunction);
		},
		
		"guess": async function(newGuess){
			await this.checkWord(newGuess)
				.then(response=>response.json())
				.then(jsonVal=>this.guessEnd(jsonVal,newGuess));
		},
		
		"guessEnd": function(jVal, word){
			if(jVal[0]==0){
				var newGuess = word.toUpperCase();
				_attempts.push(newGuess);
				_accuracy.push([this.compare(newGuess,_correctAnswers[0]),this.compare(newGuess,_correctAnswers[1]),
				this.compare(newGuess,_correctAnswers[2]),this.compare(newGuess,_correctAnswers[3])]);
				this.setLetters();
				this.checkCorrect();
				_recentError = "";
			} else if(jVal[0]==1){
				_recentError = ""+word+" is not a recognized word";
			} else if(jVal[0]==2){
				_recentError = ""+word+" contains bad characters";
			} else if(jVal[0]==3){
				_recentError = ""+word+" is too long";
			}
			_observers.notify();
		},
		
		"compare": function(guessWord,correctWord){
			let UCGuess = guessWord.trim().toUpperCase();
			let UCWord = correctWord.trim().toUpperCase();
			let UCGuessAr = UCGuess.split('');
			let UCWordAr = UCWord.split('');
			let comps = [];
			for(var i=0;i<DATA.WORDLENGTH;i++){
				comps.push('.');
				if(UCGuess[i]==UCWord[i]){
					comps[i]='+';
					UCGuessAr[i]='.';
					UCWordAr[i]='.';
				}
			}
			for(var i=0;i<DATA.WORDLENGTH;i++){
				for(var j=0;j<DATA.WORDLENGTH;j++){
					if(UCGuessAr[i]!='.' && UCGuessAr[i]==UCWordAr[j]){
						comps[i] = '-';
						UCGuessAr[i] = '.';
						UCWordAr[j] = '.';
					}
				}
			}
			return comps;
		},
		
		//Accuracy is an array with one entry per guess
		//Each entry is an array of length four. One for each word.
		//These entries are all 5 letters long and have + for correct letters,
		//- for correct letters in the wrong place, and . for incorrect letters
		//
		//letters is an array with 4 entries. One for each word
		//Each entry contains 26 values. '+' for a correctly guessed letter,
		//'.' for a not guessed letter, and '-' for an incorrectly guessed letter
		"setLetters": function(){
			for(var i=0;i<_accuracy.length;i++){
				for(var j=0;j<4;j++){
					for(var k=0;k<DATA.WORDLENGTH;k++){
						if(_accuracy[i][j][k]=='+'){
							_letters[j][_attempts[i].charCodeAt(k)-65]='+';
						}
						else if(_accuracy[i][j][k]=='-' && _letters[j][_attempts[i].charCodeAt(k)-65]!='+'){
							_letters[j][_attempts[i].charCodeAt(k)-65]='-';
						} else if(_letters[j][_attempts[i].charCodeAt(k)-65]!='+' && _letters[j][_attempts[i].charCodeAt(k)-65]!='-'){
							_letters[j][_attempts[i].charCodeAt(k)-65]='_';
						}
					}
				}
			}
		},
		
		"checkCorrect": function(){
			for(var i=0;i<4;i++){
				let isCorrect = 1;
				for(var j=0;j<DATA.WORDLENGTH;j++){
					if(_accuracy[_accuracy.length-1][i][j]!='+'){
						isCorrect = 0;
					}
				}
				if(isCorrect==1){
					_hasGuessed[i]=1;
				}
			}
		},
		
		"checkWord": async function(word){
			return fetch(new Request(DATA.ENDPOINT+"?ask=check&word="+word))
		},
		
		"getRandomWord": async function(num){
			return fetch(new Request(DATA.ENDPOINT+"?ask=request&count="+num))
		},
		
		"setAnswerWords": async function(){
			await this.getRandomWord(4)
				.then(response=>response.json())
				.then(jval=>{_correctAnswers = jval; console.log(jval);});
		},
		
		"resetData": function(){
			_attempts = [];
			_recentError = "";
			_attemptsLeft = DATA.MAXATTEMPTS;
			_correctAnswers = [];
			_hasGuessed = [0,0,0,0];
			_letters = [[],[],[],[]];
			for(var i=0;i<4;i++){
				for(var j=0;j<26;j++){
					_letters[i].push('.');
				}
			}
			_accuracy = [];
			_observers.notify();
		},
		
		"getAnswer": function(){
			return _correctAnswers;
		},
		
		"getAccuracy": function(){
			return _accuracy;
		},
		
		"getLetters": function(){
			return _letters;
		},
		
		"getAttempts": function(){
			return _attempts;
		},
		
		"getError": function(){
			return _recentError;
		},
		
		"hasWon": function(){
			if(_canLose && _attemptsLeft==0){
				return -1;
			}
			if(_hasGuessed[0]+_hasGuessed[1]+_hasGuessed[2]+_hasGuessed[3]==4){
				return 1;
			}
			return 0;
		}
	}
}

var makeController = function(model){
	var _model = model;
	
	return{
		"dispatch": async function(evt){
			switch(evt.type){
				case (DATA.signals.guessWord):
					_model.guess(evt.word);
					break;
				case (DATA.signals.restart):
					_model.resetData();
					await _model.setAnswerWords();
					break;
				default:
					console.log("Unrecognized event", evt);
					break;
			}
		}
	}
}

var makeWordLine = function(word,classVal,format){
	var d = document.createElement("div");
	d.setAttribute("class",classVal);
	for(var i=0;i<word.length;i++){
		var s = document.createElement("span");
		s.setAttribute("class","letterBox");
		s.innerHTML = word[i];
		if(format[i]=="+"){
			s.classList.add("correct");
		}
		if(format[i]=="-"){
			s.classList.add("close");
		}
		if(format[i]=="_"){
			s.classList.add("wrong");
		}
		d.appendChild(s);
	}
	return d;
}

var makeLetters = function(divId,format){
	var d = document.getElementById(divId);
	var word = "ABCDEFGHIJKLMNOPQRSTUVWXYZ";
	for(var i=0;i<word.length;i++){
		var s = document.createElement("span");
		s.setAttribute("class","letterBox");
		s.innerHTML = word[i];
		if(format[i]=="+"){
			s.classList.add("correct");
		}
		if(format[i]=="-"){
			s.classList.add("close");
		}
		if(format[i]=="_"){
			s.classList.add("wrong");
		}
		d.appendChild(s);
	}
}

var makeGuessView = function(model,divId,num){
	var _model = model;
	var _attempts = model.getAttempts();
	var _observers = makeSignaller();
	var _index = num;
	var _lettersTyped = "";
	var _id = divId;
	var _accuracy = model.getAccuracy();
	return{
		"register": function(observer_function){
			_observers.add(observer_function);
		},
		"render": function(){
			_attempts = model.getAttempts();
			_accuracy = model.getAccuracy();
			var box = document.getElementById(_id);
			while(box.firstChild){
				box.firstChild.remove();
			}
			for(var i=0;i<_attempts.length;i++){
				box.appendChild(makeWordLine(_attempts[i],"guessLine",_accuracy[i][_index]));
			}
			if(_model.hasWon()==0){
				box.appendChild(makeWordLine(_lettersTyped.padEnd(5,"_"),"guessLine","....."));
			}
		},
		"addLetter": function(l){
			if(_lettersTyped.length<5){
				_lettersTyped = _lettersTyped+l;
			}
			this.render();
		},
		"getLetters": function(){
			return _lettersTyped;
		},
		"clearLetters": function(){
			_lettersTyped = "";
		},
		"removeLetter": function(){
			_lettersTyped = _lettersTyped.substring(0,_lettersTyped.length-1);
			this.render();
		}
	}
}

var makeLetterView = function(model,divId,num){
	var _model = model;
	var _observers = makeSignaller();
	var _index = num;
	var _id = divId;
	var _letterFormat = model.getLetters();
	return{
		"register": function(observer_function){
			_observers.add(observer_function);
		},
		"render": function(){
			_letterFormat = _model.getLetters();
			var box = document.getElementById(_id);
			while(box.firstChild){
				box.firstChild.remove();
			}
			makeLetters(_id,_letterFormat[_index]);
		},
		"getIndex": function(){
			return _index;
		}
	}
}

var makeGuessButton = function(model,divId,g1,g2,g3,g4){
	var _model = model;
	var _id = divId;
	var _observers = makeSignaller();
	var _guessViews = [g1,g2,g3,g4];
	var _btn = document.createElement("input");
	_btn.setAttribute("id","submitButton");
	_btn.setAttribute("type","button");
	_btn.setAttribute("value","Guess");
	var _guessFunc = function(){
		var guess = g1.getLetters();
		for(var i=0;i<4;i++){
			_guessViews[i].clearLetters();
		}
		_observers.notify({
			"type": DATA.signals.guessWord,
			"word": guess
		});
	}
	var _restartFunc = function(){
		for(var i=0;i<4;i++){
			_guessViews[i].clearLetters();
		}
		_observers.notify({
			"type": DATA.signals.restart
		});
	}
	_btn.addEventListener("click", _guessFunc);
	document.getElementById(divId).appendChild(_btn);
	return {
		"register": function(observer_function){
			_observers.add(observer_function);
		},
		"render": function(){
			if(_model.hasWon()!=0){
				_btn.setAttribute("value","Play Again");
				_btn.removeEventListener("click",_guessFunc);
				_btn.addEventListener("click",_restartFunc);
			} else {
				_btn.setAttribute("value","Guess");
				_btn.removeEventListener("click",_restartFunc);
				_btn.addEventListener("click",_guessFunc);
			}
		}
	}
}

var makeErrorBox = function(model,divId){
	var _model = model;
	var _id = divId;
	var _box = document.createElement("span");
	_box.innerHTML = _model.getError();
	document.getElementById(_id).appendChild(_box);
	return {
		"render": function(){
			_box.innerHTML = _model.getError();
		}
	}
}

document.addEventListener("DOMContentLoaded", async function(event) {
	var model = makeModel();
	var controller = makeController(model);
	model.setAnswerWords();
	var guess1 = makeGuessView(model,"guess1",0);
	var guess2 = makeGuessView(model,"guess2",1);
	var guess3 = makeGuessView(model,"guess3",2);
	var guess4 = makeGuessView(model,"guess4",3);
	
	guess1.render();
	guess2.render();
	guess3.render();
	guess4.render();
	
	var letter1 = makeLetterView(model,"letter1",0);
	var letter2 = makeLetterView(model,"letter2",1);
	var letter3 = makeLetterView(model,"letter3",2);
	var letter4 = makeLetterView(model,"letter4",3);
	
	letter1.render();
	letter2.render();
	letter3.render();
	letter4.render();
	
	var btn = makeGuessButton(model,"btnDiv",guess1,guess2,guess3,guess4);
	
	var Ebox = makeErrorBox(model,"errBox");
	
	btn.register(controller.dispatch);
	
	model.register(btn.render);
	
	model.register(Ebox.render);
	
	model.register(guess1.render);
	model.register(guess2.render);
	model.register(guess3.render);
	model.register(guess4.render);
	
	model.register(letter1.render);
	model.register(letter2.render);
	model.register(letter3.render);
	model.register(letter4.render);
	
	document.onkeydown = function(evt) {
		evt = evt || window.event;
		if (evt.keyCode >= 65 && evt.keyCode <= 90) {
			guess1.addLetter(String.fromCharCode(evt.keyCode));
			guess2.addLetter(String.fromCharCode(evt.keyCode));
			guess3.addLetter(String.fromCharCode(evt.keyCode));
			guess4.addLetter(String.fromCharCode(evt.keyCode));
		}
		if (evt.keyCode >= 97 && evt.keyCode <= 122) {
			guess1.addLetter(String.fromCharCode(evt.keyCode-32));
			guess2.addLetter(String.fromCharCode(evt.keyCode-32));
			guess3.addLetter(String.fromCharCode(evt.keyCode-32));
			guess4.addLetter(String.fromCharCode(evt.keyCode-32));
		}
		if (evt.keyCode == 8) {
			guess1.removeLetter();
			guess2.removeLetter();
			guess3.removeLetter();
			guess4.removeLetter();
		}
	};
});