/**
 * AppleScript Syntax Highlighter.
 * Version 0.2.3
 * Copyright (C) 2007-2009 chocolife <noriyasu@gmail.com>
 * http://chocolife.blog80.fc2.com/
 *
 * require Zero Clipboard
 * http://code.google.com/p/zeroclipboard/
 */
 
var ash = {
		highlighted_srcs	: [],
		plain_srcs			: [],
		original_srcs		: [],
		ZC					: [], // Zero Clipboard instances
		as_reserved_kwds	: [ 'and', 'as', 'contains', 'error', 'else', 'end', 'ends', 'get', 'given', 'global', 'is', 'in', 'if', 'me', 'not', 'of', 'on', 'or', 'property', 'return', 'repeat', 'set', 'starts', 'tell', 'thru', 'then', 'to', 'try', 'whose', 'with', 'without'],
		reserved_kwds		: [ 'name', 'url' ],
		irregular_kwds		: [ 'AppleScript\'s', 'error', 'open', 'end', 'this', 'the', 'of', 'list', 'on', 'application',  'write', 'eof', 'position', 'text', 'quit'],
		symbol_chrs			: [ 8800, 187, 172, 171, 165, 126, 125, 124, 123, 96, 94, 93, 92, 91, 64, 63, 62, 61, 60, 59, 58, 47, 45, 44, 43, 42, 41, 40, 38, 37, 36, 35, 34, 33 ],
		variable_kwds		: [],
		handler_kwds		: [],
		kwds_arr			: [],
		kwd_classes			: [ 'ash_reserved', 'ash_variable', 'ash_handler', 'ash_symbol' ],
		quoted				: false,
		cmt_lv				: 0,
		sl					: '¥\\',
		highlighted			: false,
		replace_tab			: '&nbsp;&nbsp;&nbsp;&nbsp;'
}


ash.$ = function(id){
	return document.getElementById(id)
}


ash.getTargetElements = function () {
	var targetElems = [];
	var p = document.getElementsByTagName('pre');
	for (var i=0; i<p.length; i++) {
		if (p[i].className == 'applescript') { targetElems.push(p[i]); }
	}
	return targetElems;
}


ash.getIndentLevel = function(line) { 
	var tabCnt = 0;
	for (var i=0; i<line.length; i++) {
		if (line.slice(i, i+1) == '\t') { 
			tabCnt++;
		} else {
			break;
		}
	}
	return tabCnt;
}


ash.removeIndentTab = function(line) {
	//var tabchr = (line.slice(0,1) == '\t') ? '\t' : ' ';
	for (var i=0; i<line.length; i++) {
		if (line.slice(i, i+1) != '\t') return line.slice(i, line.length+1);   
	}
	return line;
}


ash.replaceInequal = function(str) {
	return str.replace(/</g, '&lt;').replace(/>/g, '&gt;');
}


ash.processLine = function(line) {
	var quot_span 	= '';
	var pre_w		= '';
	var tmp_w 		= '';
	var result_line	= '';
	var class_name	= '';
	if (line == '') return line;
	var words 		= line.split(' ');
	//
	// process for each words of the line
	//
	for (var i=0; i<words.length; i++) {
		w = words[i].replace('\r', '');
		// var 'w' contains the single line comment
		if (w.indexOf('--') == 0 && this.quoted == false) {
			result_line += '<span class="ash_comment">' 
						+ this.replaceInequal(w) + '&nbsp;' 
						+ this.replaceInequal(words.slice(i+1).join('&nbsp;')) 
						+ '<\/span>';
			return result_line;
		}
		//
		// var 'w' is NOT contains comment symbols (* *)
		//
		if ((this.quoted == true && w.indexOf('\*)') != -1) || 
			(i != 0 && w.indexOf('(\*') != -1) || 
			(w.indexOf('(\*') == -1 && w.indexOf('\*)') == -1)) {
			// still in comments?
			if (this.cmt_lv > 0 && w !='') {
				result_line += '<span class="ash_comment">' 
							+ this.replaceInequal(w) 
							+'<\/span>&nbsp;';
			} else {
				//
				// normal string
				//
				var pr_w = words[i-1];
				// is variable name?
				var v_flg = false;
				if (pr_w == 'to' && words[i-3] == 'from') { v_flg = true; }
				if (pr_w == 'set' && words[i+1] == 'to') { v_flg = true; }
				if (pr_w == 'with' && words[i-2] == 'repeat') { v_flg = true; }
				if (pr_w == 'dialog' && words[i-2] == words[i-2].match(/.*display/) && w.indexOf('"') == -1) { v_flg = true; }
				if (pr_w == 'error' && words[i-2] == 'on' && w != 'number') { v_flg = true; }
				if (pr_w == 'global' || pr_w == 'local') { this.scanVarNames(words.slice(i)); }
				if (pr_w == 'property' ||
					pr_w == 'on' ||
					pr_w == 'from' ||
					pr_w == 'the') v_flg = true;
				if (v_flg) {
					// check the reserved keywords
					if (!this.isIrregular(w)) { this.variable_kwds.push(w); }
				}
				result_line += this.processNormalStr(w.replace(/&amp;/g, '&')) + '&nbsp;';
			}
		} else {
			//
			// var 'w' contains comment symbol (* *)
			//
			var sep_w = [];
			var ww = ''; 
			for (var j=0; j<w.length; j++) {
				s = w.slice(j,j+2);
				if (s == '(\*' || s == '\*)') {
					if (ww != '') { sep_w.push(ww); } 
					sep_w.push(s);
					ww = '';
					j++;
				} else {
				    ww += w.slice(j,j+1);
				} 
			}
			if (ww != '')  { sep_w.push(ww); }
			var tmp_w = '';
			for (var k=0; k<sep_w.length; k++) {
				if (sep_w[k] == '(\*' && this.quoted == false) { this.cmt_lv++; }
				if (this.cmt_lv < 1) {
					tmp_w += this.processNormalStr(sep_w[k]);
				} else {
					tmp_w 	+= '<span class="ash_comment">'
							+ this.replaceInequal(sep_w[k]) + '<\/span>';
				}
				if (sep_w[k] == '\*)' && this.quoted == false) { this.cmt_lv--; }
			}
			result_line += tmp_w + '&nbsp;';
		}
		class_name = '';
	}
	return result_line.replace(/&nbsp;$/, '');
}


ash.scanHandler = function(source) {
	var lines = source.split('\n');
	for (var i=0; i<lines.length; i++) {
		var l = this.removeIndentTab(lines[i]);
		var words = l.split(' ');
		if (l.slice(-1) == '¬') {
			i++;
			l += this.removeIndentTab(lines[i]);
		}
		
		//is event handler?
		if (words[0] == 'on') {
			 if (this.isAE(words[2])) { this.variable_kwds.push(words[3]); }
			 //if (words[words.length-1].indexOf('»:') != -1) { this.variable_kwds.push(words[words.length-1].replace( /«.*»/, '')); }
		}
		
		if (words[1] != 'error' && 	// reserved handler
			words[1] != 'run' &&	//
			words[1] != 'idle' &&	//
			words[0] == 'on' || 
			words[0] == 'to') {
			var h_name = words[1].slice(0,words[1].indexOf('('));
			args = l.replace(h_name, '').replace(/ /g, '');
			var h_vals = args.slice(args.indexOf('(')+1, args.lastIndexOf(')')).split(',');
			for (var j=0; j<h_vals.length; j++) {
				this.variable_kwds.push(h_vals[j].replace('¬',''));
			}
			if (words[0] == 'to') { this.handler_kwds.push(words[1]); }
			
			for (var k=0; k<words.length; k++) {
				if (words[k] == 'of' || words[k] == 'for') this.variable_kwds.push(words[k+1]);
				if (words[k]+words[k+1] == 'onopen') this.variable_kwds.push(words[k+2]);
			}
			this.handler_kwds.push(h_name);
		}
	}
}


ash.scanVarNames = function(varNames) {
    /*for (var i=0; i<words.length; i++) {
        if (words[i] == 'local' || words[i] == 'global') {
            var varNames = words.slice(i+1);
            break;
        }
    }*/
    for (var j=0; j<varNames.length; j++) {
        this.variable_kwds.push(varNames[j].replace(',', ''));
    }
    return;
}


ash.processNormalStr = function(w) {
    if (w == '') { return w; }
	var tmp_w = '';
	var chars = []; //splitted by symbol chars
	var ret = '';
	for (var i=0; i<w.length; i++) {
		if (this.isSymbol(w.slice(i, i+1))) {
			if (tmp_w) { chars.push(tmp_w); }
			chars.push(w.slice(i, i+1));
			tmp_w = '';
		} else {
		tmp_w += w.slice(i, i+1)
		}
	}
	if (tmp_w) chars.push(tmp_w);
	for (var i=0; i<chars.length; i++) {
		var esc1 = (i > 0) ? chars[i-1] : null;
		var esc2 = (i > 1) ? chars[i-2] : null;
		var esc_flg = (this.sl.indexOf(esc1) != -1 && this.sl.indexOf(esc2) == -1) ? true : false;
		if (chars[i] == '"' && esc_flg == false) { 
			if (this.quoted == false) {
				ret += '<span class="ash_symbol">&quot;<\/span>';
			} else {
				ret += '<span class="ash_symbol">&quot;<\/span>';
			}
			this.quoted = !this.quoted;
		} else if (this.quoted == true) {
			ret += '<span class="ash_quoted">' + this.replaceInequal(chars[i]) + '<\/span>';
		} else if (!isNaN(chars[i]) || this.isAE(chars[i+1])) {
			ret += '<span class="ash_normal">' + this.replaceInequal(chars[i]) + '<\/span>';
		} else {
			if (chars[i+1] == ":") { // is label?
				if ((this.isVariable(chars[i+2]) || chars[i+2] =='"') && !this.isAE(w) && !this.isReserved(chars[i])) { this.variable_kwds.push(chars[i]); }
			}
			if (this.isAE(w) && chars[i-1] == ":" && !this.isSymbol(chars[i])) { this.variable_kwds.push(chars[i]); }
			ret += '<span class="' + this.getSpanClass(chars[i]) + '">' + this.replaceInequal(chars[i]) + '<\/span>';
		}
	}
	return ret;
}

ash.isAE = function(w) {
	if (!w) { return false; }
	for (var i=0; i<w.length; i++) {
		if ((w.charAt(i)).charCodeAt(0) == 187) { return true;}
	}
	return false;
}

ash.isSymbol = function(chr) {
	for (var i=0; i<this.symbol_chrs.length; i++) {
		//if (str == this.symbol_chrs[i]) return true;
		if (chr.charCodeAt(0) == this.symbol_chrs[i]) return true;
	}
	return false;
}

ash.isReserved = function(w) {
	for (var i=0; i<this.reserved_kwds.length; i++) {
		if (w == this.reserved_kwds[i]) return true;
	}
	return false;
}

ash.isVariable = function(w) {
	for (var i=0; i<this.variable_kwds.length; i++) {
		if (w == this.variable_kwds[i]) return true;
	}
	return false;
}

ash.isIrregular = function(str) {
	for (var i=0; i<this.irregular_kwds.length; i++) {
		if (str == this.irregular_kwds[i]) return true;
	}
	return false;
}


ash.getSpanClass = function(str) {
	var span_class ='';
	for (var i=0; i<this.kwds_arr.length; i++) {
		for (var j=0; j<this.kwds_arr[i].length; j++) {
			if (str == this.kwds_arr[i][j]) { 
				span_class = this.kwd_classes[i]; 
				break;
			}
		}
	}
	if (span_class != 'ash_reserved' && span_class != '') { return span_class; }
	for (var i=0; i<this.as_reserved_kwds.length; i++) {
		if (str == this.as_reserved_kwds[i]) { return 'ash_as_reserved'; }
	}
	return (this.isSymbol(str)) ? 'ash_symbol' : 'ash_reserved';
}


ash.toggleShowPlain = function(cnt) {
	var tgt = this.getTargetElements()[cnt];
	var clipBtn = '<button id="ash_clip' + cnt + '" class="ash_button">copy to clipboard</button>';
	var toggleBtn = '<button class="ash_button" id="ash_toggle' + cnt 
			+ '" onclick="ash.toggleShowPlain(' + cnt + ')"><\/button>\n'; 
	if (this.highlighted) {
		tgt.innerHTML = '<div class="ash_bar">' + clipBtn + toggleBtn + '</div>' + this.highlighted_srcs[cnt];
		this.$('ash_toggle'+cnt).innerHTML = 'view plain';
	} else {
		tgt.innerHTML = '<div class="ash_bar_plain">' + clipBtn + toggleBtn + '</div>' + this.plain_srcs[cnt];
		this.$('ash_toggle'+cnt).innerHTML = 'view highlighted';
		if (!this.ZC[cnt].div) { this.ZC[cnt].glue(document.getElementById('ash_clip' + cnt)); }
	}
	this.highlighted = !this.highlighted;
}


//
// main routine
//
ash.highlight = function() {
	var show_linenum = 0;
	var AS = this.getTargetElements();
	var line_head 	= [ 'li', 'span' ];
  	var line_tail 	= [ '<\/li>\n', '<\/span><br>' ];
	var result_head	= [ '<ol class="ash_highlighted" start="1">\n', '<div class="ash_highlighted">\n' ];
	var result_tail = [ '\n<\/ol>', '\n<\/div>' ];

	for (var cnt=0; cnt<AS.length; cnt++) {
		this.highlighted_srcs[cnt] = '';
		this.variable_kwds 	= [];
		this.kwds_arr		= [ this.irregular_kwds, this.variable_kwds, this.handler_kwds, this.symbol_chrs ];

		var plain_source = AS[cnt].innerHTML.replace(/&lt;/g, '<').replace(/&gt;/g, '>')
		this.scanHandler(plain_source);
		var lines = plain_source.split('\n');

		// for NON IE
		if (!document.uniqueID) {
		    if (lines[-1] == null) { lines.pop(); }
		}
		
		//plain_source = lines.join('\n');
		this.original_srcs[cnt] = plain_source.replace(/&amp;/g, '&');
		this.plain_srcs[cnt] = '<pre class="ash_plain">' + this.replaceInequal(plain_source) + '<\/pre>';
		
		if (lines.length < 500) {
			var result_line = '';
			for (var i=0; i<lines.length; i++) {
				var l = lines[i];
				var idt = this.getIndentLevel(l);
				var spc = '';
				for (var j=0; j<idt; j++) { spc += this.replace_tab; }
				result_line = spc + this.processLine(this.removeIndentTab(l));
				var odd_line = ((i+1) % 2 == 1) ? ' class="ash_odd"' : '';
				this.highlighted_srcs[cnt]  += '<' + line_head[show_linenum] + odd_line + '>' + result_line + line_tail[show_linenum];
			}
			
			//
			// finish
			//
			this.highlighted_srcs[cnt] = result_head[show_linenum] + this.highlighted_srcs[cnt] + result_tail[show_linenum];
			
			var clipBtn = '<button id="ash_clip' + cnt + '" class="ash_button">copy to clipboard</button>';
			var toggleBtn = '<button class="ash_button" id="ash_toggle' + cnt 
					+ '" onclick="ash.toggleShowPlain(' + cnt 
					+ ')">view plain<\/button>\n';
					
			AS[cnt].innerHTML = '<div class="ash_bar">' + clipBtn + toggleBtn + '</div>'
								+ this.highlighted_srcs[cnt];

			this.ZC[cnt] = new ZeroClipboard.Client();
			this.ZC[cnt].setText(this.original_srcs[cnt]);
			
		} else {
			AS[cnt].innerHTML = '<p class="ash_warn">This code is too long. Syntax highlighting is disabled.</p>' + this.plain_srcs[cnt];
		}
   	}
}


ash.glueZeroClipboardClient = function() {
	for (var i=0; i<this.ZC.length; i++) {
		if (!this.ZC[i].div) { this.ZC[i].glue(document.getElementById('ash_clip' + i)); }
	}
}