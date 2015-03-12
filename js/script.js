/**
 * Copyright 2013-2015 Phil Buchanan
 *
 * A calculator iOS web application that supports brackets, backspace and saved
 * calculation history. The app uses HTML5 app caching so it will work offline.
 *
 * @version 3.0.2
 */

"use strict";

var devmode = true;

function Calculator() {
	this.settings = {
		version: '3.0.2',
		history: 100,
		fontsize: 46,
		decimals: 2
	};
	
	this.appstate = {
		input: 0,
		brackets: 0,
		last: null
	};
	
	this.history = [];
	
	this.timer = {
		timerlen: 750,
		timer: null
	};
	
	this.calculator   = document.getElementById('calculator');
	this.result       = document.getElementById('result');
	this.equation     = document.getElementById('equation');
	this.keypad       = document.getElementById('keypad');
	this.historyPanel = document.getElementById('history');
	this.historyList  = document.getElementById('history-list');
	this.historyClose = document.getElementById('history-close');
	
	this.dragging = false;
	this.addEventHandlers();
	
	// Restore previous app state
	this.loadAppState();
	this.loadHistory();
	
	this.updateDisplay();
}



/**
 * Retrieve the application state from local storage
 */
Calculator.prototype.loadAppState = function() {
	var json = localStorage.getItem('appState'),
		savedAppState;
	
	if (json !== null && json !== '') {
		savedAppState = JSON.parse(json);
		
		this.appstate.input = savedAppState.input;
		this.appstate.last = savedAppState.last;
		this.appstate.brackets = savedAppState.brackets;
	}
};



/**
 * Save the application state to local storage
 */
Calculator.prototype.saveAppState = function() {
	var json = JSON.stringify(this.appstate);
	
	localStorage.setItem('appState', json);
};



/**
 * Append digit to equation
 *
 * @param digit int The digit to append
 */
Calculator.prototype.appendDigitToEquation = function(digit) {
	var lastInput = this.appstate.last,
		currentNumber = this.getLastNum();
	
	switch (lastInput) {
		case null:
			this.appendToEquation(digit, true);
			break;
		case '0':
		case '1':
		case '2':
		case '3':
		case '4':
		case '5':
		case '6':
		case '7':
		case '8':
		case '9':
		case '.':
		case '(':
		case '*':
		case '/':
		case '+':
		case '-':
			if (lastInput === '0' && this.appstate.input.length === 1) {
				this.backspace();
				this.appendToEquation(digit);
			}
			else if (this.isValidNum(currentNumber + digit)) {
				this.appendToEquation(digit);
			}
			break;
	}
};



/**
 * Append decimal to equation
 */
Calculator.prototype.appendDecimalToEquation = function() {
	var lastInput = this.appstate.last,
		currentNumber = this.getLastNum();
	
	switch (lastInput) {
		case '0':
		case '1':
		case '2':
		case '3':
		case '4':
		case '5':
		case '6':
		case '7':
		case '8':
		case '9':
			if (this.isValidNum(currentNumber + '.')) {
				this.appendToEquation('.');
			}
			break;
		case null:
			this.appendToEquation('0.', true);
			break;
		case '(':
		case '*':
		case '/':
		case '+':
		case '-':
			this.appendToEquation('0.');
			break;
	}
};



/**
 * Append operator to equation
 *
 * @param operator string The value of the operator
 */
Calculator.prototype.appendOperatorToEquation = function(operator) {
	var lastInput = this.appstate.last;
	
	switch (lastInput) {
		case null:
			this.appendToEquation(operator);
			break;
		case '0':
		case '1':
		case '2':
		case '3':
		case '4':
		case '5':
		case '6':
		case '7':
		case '8':
		case '9':
		case ')':
			this.appendToEquation(operator);
			break;
		case '*':
		case '/':
		case '+':
		case '-':
			this.backspace();
			this.appendToEquation(operator);
			break;
	}
};



/**
 * Append bracket to equation
 *
 * @param bracket string Left of right bracker
 */
Calculator.prototype.appendBracketToEquation = function(bracket) {
	var lastInput = this.appstate.last;
	
	if (bracket === '(') {
		switch (lastInput) {
			case null:
				this.appendToEquation('(', true);
				this.appstate.brackets += 1;
				break;
			case '*':
			case '/':
			case '+':
			case '-':
			case '(':
				this.appendToEquation('(');
				this.appstate.brackets += 1;
				break;
		}
	}
	else if (bracket === ')') {
		switch (lastInput) {
			case '(':
				this.backspace();
				break;
			case ')':
			case '0':
			case '1':
			case '2':
			case '3':
			case '4':
			case '5':
			case '6':
			case '7':
			case '8':
			case '9':
				if (this.appstate.brackets > 0) {
					this.appendToEquation(')');
					this.appstate.brackets -= 1;
				}
				break;
		}
	}
};



/**
 * Append an operator, operand or bracket to the equation string
 * Whenever the equation is updated, the display should also be updated.
 *
 * @param value string The value to add to the equation
 * @param clear bool Should the appstate input be cleared first
 */
Calculator.prototype.appendToEquation = function(value, clear) {
	if (clear) {
		this.appstate.input = value;
	}
	else {
		this.appstate.input += value;	
	}
	
	if (value === '0.') {
		this.appstate.last = '.';
	}
	else {
		this.appstate.last = value;
	}
	
	this.updateDisplay();
};



/**
 * Invert last number (from positive to negative and vise versa)
 */
Calculator.prototype.invertNumber = function() {
	var str = this.appstate.input,
		lastNum = this.getLastNum(),
		len,
		before;
	
	if (lastNum) {
		len = lastNum.length;
		before = str.charAt(str.length - len - 1);
		
		if (/[+*\-\/()]/.test(before) || before === '') {
		
			if (lastNum[0] === '-') {
				lastNum = lastNum.substr(1, len);
			}
			else {
				lastNum = '-' + lastNum;
			}
		
		}
		
		this.appstate.input = str.substr(0, str.length - len) + lastNum;
		
		this.updateDisplay();
	}
};



/**
 * Called when the equals button is pressed
 * Evaluates the current equation string.
 */
Calculator.prototype.equate = function() {
	var result = this.compute(this.appstate.input),
		historyItem = {};
	
	if (result !== null) {
		historyItem.result = result;
		historyItem.equ = this.appstate.input;
		this.addHistoryItem(historyItem);
		this.clearAll(result.toString());
	}
};



/**
 * Remove the last input character
 */
Calculator.prototype.backspace = function() {
	var input = this.appstate.input,
		last = this.appstate.last;
	
	if (last === '(') {
		this.appstate.brackets -= 1;
	}
	else if (last === ')') {
		this.appstate.brackets += 1;
	}
	
	if (input.length > 1 && last !== null) {
		this.appstate.input = input.slice(0, input.length - 1);
		this.appstate.last = input.charAt(input.length - 2);
		
		this.updateDisplay();
	}
	else {
		this.clearAll();
	}
};



/**
 * Called when backspace is long pressed
 */
Calculator.prototype.backspaceLongPress = function() {
	this.clearAll();
	this.flashButton('btn-clear');
};



/**
 * Clear the current state of the calculator
 *
 * @param result string The string to update the display with
 */
Calculator.prototype.clearAll = function(result) {
	if (result) {
		this.appstate.input = result;
	}
	else {
		this.appstate.input = 0;
	}
	
	this.appstate.brackets = 0;
	this.appstate.last = null;
	
	this.updateDisplay();
};



/**
 * Is the given number a valid number (e.g. -12.34)
 *
 * @param num double The number to test
 * return bool True if valid, else false
 */
Calculator.prototype.isValidNum = function(num) {
	/**
	 * Regex eplainaition:
	 * ^             Match at start of string
	 * \-?           Optional negative
	 * 0             Zero, or
	 * 0(?!\.)       Zero if followed by decimal, or
	 * ([1-9]{1}\d*) Exactly one 1-9 and zero or more digits, or
	 * \.(?!\.)\d*   A decimal only if not followed by another decimal plus zero or more digits
	 * (\.\d*){0,1}  Only one grouping of a decimal and zero or more digits
	 * $             Match end of string
	 */
	if (/^\-?(0|0(?!\.)|([1-9]{1}\d*)|\.(?!\.)\d*)(\.\d*){0,1}$/.test(num)) {
		return true;
	}
	
	return false;
};



/**
 * Parses the last full number from the input string (eg. -42.63)
 *
 * return A full number
 */
Calculator.prototype.getLastNum = function() {
	var str = this.appstate.input,
		arr;
	
	if (str.length > 0) {
		arr = str.match(/-?\d*\.?\d*$/);
		
		if (arr !== null) {
			return arr[0];
		}
	}
	
	return false;
};



/**
 * Update the calculator display
 */
Calculator.prototype.updateDisplay = function() {
	var eq = this.appstate.input.toString(),
		result = this.compute(eq);
	
	if (result !== null && !isNaN(result)) {
		if (result > 9E13) {
			this.result.innerHTML = '<span>' + result.toExponential(this.settings.decimals) + '</span>';
		}
		else {
			this.result.innerHTML = '<span>' + this.addCommas(result) + '<span>';
		}
		this.resizeFont();
	}
	
	this.updateDisplayEquation(eq);
	
	this.saveAppState();
};



/**
 * Updates the displays equation string
 * Directly manipulates the DOM.
 *
 * @param equation string The equation string
 */
Calculator.prototype.updateDisplayEquation = function(equation) {
	var ele = document.getElementById('eq'),
		i = equation.length,
		width;
	
	ele.innerHTML = this.replaceOperators(equation);
	width = ele.offsetWidth;
	
	while (width > this.equation.offsetWidth - 24) {
		ele.innerHTML = '...' + this.replaceOperators(equation.substr(equation.length - i, i));
		width = ele.offsetWidth;
		i -= 1;
	}
};



/**
 * Replace operators with display strings
 *
 * @param str string The equation string to replace the operators in
 * return string The new display string
 */
Calculator.prototype.replaceOperators = function(str) {
	str = str.replace(/\//g, '<span class="operator">&divide;</span>');
	str = str.replace(/\*/g, '<span class="operator">&times;</span>');
	str = str.replace(/\+/g, '<span class="operator">+</span>');
	str = str.replace(/\-/g, '<span class="operator">&minus;</span>');
	str = str.replace(/\(/g, '<span class="left-bracket">(</span>');
	str = str.replace(/\)/g, '<span class="right-bracket">)</span>');
	
	return str;
};



/**
 * Resize the result font to fit within the width of it's container
 * Directly manipulates the DOM.
 */
Calculator.prototype.resizeFont = function() {
	var size, displayWidth, textWidth;
	
	size = this.settings.fontsize;
	this.result.style.fontSize = size + 'px';
	displayWidth = window.innerWidth - 24;
	textWidth = this.result.childNodes[0].offsetWidth;
	
	while (textWidth > displayWidth) {
		size -= 1;
		this.result.style.fontSize = size + 'px';
		textWidth = this.result.childNodes[0].offsetWidth;
		
		if (size === 10) {
			break;
		}
	}
};



/**
 * Add commas to a number string
 *
 * @param number double The number to add commas to
 * return string The new number string
 */
Calculator.prototype.addCommas = function(number) {
	var parts, x, y, regx;
	
	parts = number.toString().split('.');
	x = parts[0];
	if (parts.length > 1) {
		y = '.' + parts[1];
	}
	else {
		y = '';
	}
	regx = /(\d+)(\d{3})/;
	
	while (regx.test(x)) {
		x = x.replace(regx, '$1' + ',' + '$2');
	}
	
	return x + y;
};



/**
 * Compute an equation string
 *
 * @param equation string The equation string to compute
 * return double The result of the computation, else null if it cannot be computed 
 */
Calculator.prototype.compute = function(equation) {
	var result,
		round = Math.pow(10, this.settings.decimals);
	
	try {
		result = eval(equation);
	}
	catch(err) {
		return null;
	}
	
	return Math.round(result * round) / round;
};



/**
 * Open history panel
 */
Calculator.prototype.openHistoryPanel = function() {
	this.calculator.classList.add('history--open');
};



/**
 * Open history panel
 */
Calculator.prototype.closeHistoryPanel = function() {
	this.calculator.classList.remove('history--open');
};



/**
 * Append a saved history item to the equation string
 *
 * @param value string The history item string to add to the equation
 */
Calculator.prototype.appendHistoryItemToEquation = function(value) {
	if (this.appstate.last === null) {
		this.appstate.input = value;
	}
	else if (/[(+*\-\/]/.test(this.appstate.last)) {
		this.appstate.input += value;
	}
	
	this.appstate.last = value.charAt(value.length - 1);
	
	this.updateDisplay();
	this.saveAppState();
};



/**
 * Add a history item to the history list
 *
 * @param item object The history item object to add
 */
Calculator.prototype.addHistoryItem = function(item) {
	var i = this.history.length - 1,
		ele;
	
	if (typeof this.history[i] !== 'object' || item.result !== this.history[i].result) {
		while (this.history.length >= this.settings.history) {
			this.history.shift();
			ele = this.historyList.childNodes[i];
			ele.parentNode.removeChild(ele);
			i -= 1;
		}
		
		this.history.push(item);
		
		this.flashButton('btn-history');
		this.appendToHistoryList(item);
		this.saveHistory();
	}
};



/**
 * Updates the history listing
 *
 * @param item object The history item to add to the display
 */
Calculator.prototype.appendToHistoryList = function(item) {
	var li     = document.createElement('li'),
		button = document.createElement('button'),
		span   = document.createElement('span'),
		children = this.historyList.childNodes;
	
	button.value = item.result;
	button.innerText = this.addCommas(item.result);
	
	span.className = 'equ';
	span.innerHTML = this.replaceOperators(item.equ.toString());
	
	button.appendChild(span);
	li.appendChild(button);
	
	this.historyList.insertBefore(li, children[0]);
};



/**
 * Save the calculator history into local storage
 */
Calculator.prototype.saveHistory = function() {
	var json;
	
	json = JSON.stringify(this.history);
	localStorage.setItem('history', json);
};



/**
 * Load the calculator history from local storage
 */
Calculator.prototype.loadHistory = function() {
	var json = localStorage.getItem('history'),
		i;
	
	if (json !== null && json !== '') {
		this.history = JSON.parse(json);
	}
	else {
		this.history = [];
	}
	
	for (i = 0; i < this.history.length; i += 1) {
		this.appendToHistoryList(this.history[i]);
	}
};



/**
 * Clear the entire history
 */
Calculator.prototype.clearHistory = function() {
	while (this.historyList.hasChildNodes()) {
		this.historyList.removeChild(this.historyList.lastChild);
	}
	
	this.history = [];
	this.saveHistory();
};



/**
 * Flash button
 *
 * @param id string The DOM node to flash
 */
Calculator.prototype.flashButton = function(id) {
	var btn = document.getElementById(id);
	
	btn.classList.add('flash');
	
	setTimeout(function() {
		btn.classList.remove('flash');
	}, 200);
};



/**
 * Add Timer
 *
 * @param callback function The function to call on timeout
 */
Calculator.prototype.addTimer = function(callback) {
	this.timer.timer = setTimeout(callback, this.timer.timerlen);
};



/**
 * Remove Timer
 */
Calculator.prototype.removeTimer = function() {
	clearTimeout(this.timer.timer);
};



/**
 * Handles all events
 */
Calculator.prototype.addEventHandlers = function() {
	var buttonModeStart = 'mousedown',
		buttonModeEnd =   'mouseup';
	
	if (window.navigator.hasOwnProperty('standalone') && window.navigator.standalone) {
		buttonModeStart = 'touchstart';
		buttonModeEnd = 'touchend';
	}
	
	// Disable bounce scrolling on main application
	document.getElementById('application').addEventListener(buttonModeStart, function(e) {
		e.preventDefault();
		e.stopPropagation();
	}, false);
	
	// Fix bounce scrolling of whole page at top and bottom of content
	document.getElementById('history-list-scroll').addEventListener('touchstart', function(e) {
		var startTopScroll = this.scrollTop;
		
		if (document.getElementById('history-list').offsetHeight <= this.offsetHeight) {
			e.preventDefault();
			e.stopPropagation();
		}
		else {
			if (startTopScroll <= 0) {
				this.scrollTop = 1;
			}
			
			if (startTopScroll + this.offsetHeight >= this.scrollHeight) {
				this.scrollTop = this.scrollHeight - this.offsetHeight - 1;
			}
		}
	}, false);
	
	// Keypad events
	document.getElementById('btn-backspace').addEventListener(buttonModeStart, function() {
		this.addTimer(this.backspaceLongPress.bind(this));
	}.bind(this), false);
	
	this.keypad.addEventListener(buttonModeEnd, function(event) {
		if (!this.dragging) {
			this.removeTimer();
			this.buttonEvent(event.target.value);
		}
	}.bind(this), false);
	
	// History list events
	this.historyList.addEventListener(buttonModeStart, function() {
		this.dragging = false;
	}.bind(this), false);
	
	this.historyList.addEventListener('touchmove', function() {
		this.dragging = true;
	}.bind(this), false);
	
	this.historyList.addEventListener(buttonModeEnd, function(event) {
		if (!this.dragging) {
			this.appendHistoryItemToEquation(event.target.value);
			this.closeHistoryPanel();
		}
	}.bind(this), false);
	
	// History close events
	this.historyClose.addEventListener(buttonModeStart, function() {
		this.addTimer(this.clearHistory.bind(this));
	}.bind(this), false);
	
	this.historyClose.addEventListener(buttonModeEnd, function() {
		this.removeTimer();
		this.closeHistoryPanel();
		this.dragging = false;
	}.bind(this), false);
};



/**
 * The main function called when a button is pressed
 *
 * @param value string The value of the button pressed
 */
Calculator.prototype.buttonEvent = function(value) {
	switch (value) {
		case '0':
		case '1':
		case '2':
		case '3':
		case '4':
		case '5':
		case '6':
		case '7':
		case '8':
		case '9':
			this.appendDigitToEquation(value);
			break;
		case '+':
		case '*':
		case '-':
		case '/':
			this.appendOperatorToEquation(value);
			break;
		case '.':
			this.appendDecimalToEquation();
			break;
		case '(':
		case ')':
			this.appendBracketToEquation(value);
			break;
		case '=':
			this.equate();
			break;
		case 'b':
			this.backspace();
			break;
		case 'c':
			this.clearAll();
			break;
		case '+-':
			this.invertNumber();
			break;
		case 'h':
			this.openHistoryPanel();
			break;
	}
};



// Is app installed?
if ((window.navigator.hasOwnProperty('standalone') && window.navigator.standalone) || devmode) {
	var calculator = new Calculator();
}
else {
	document.body.setAttribute('class', 'install');
}