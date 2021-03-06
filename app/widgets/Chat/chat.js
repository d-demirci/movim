var Chat = {
    left : null,
    right: null,
    date: null,
    currentDate: null,
    lastScroll: null,
    lastHeight: null,
    edit: false,

    // Chat state
    state: null,
    since: null,
    sended: false,

    // Autocomplete vars.
    // What user want to autocomplete?
    toAutocomplete: null,
    // What was previously in autocomplete?
    previouslyAutocompleted: null,
    previouslyAutocompletedSeqID: null,

    autocomplete: function(event, jid) {
        event.preventDefault();
        Rooms_ajaxMucUsersAutocomplete(jid);
    },
    onAutocomplete: function(usersList) {
        var textarea = Chat.getTextarea();
        var text = textarea.value.toLowerCase();

        // If user have deleted text from textarea - reinitialize
        // autocompletion.
        if (text == '' && Chat.previouslyAutocompleted !== null) {
            Chat.previouslyAutocompleted = null;
            Chat.previouslyAutocompletedSeqID = null;
        }

        // Assume that this is what we want to autocomplete if
        // Chat.toAutocomplete is null.
        if (Chat.toAutocomplete === null
            || (
                Chat.toAutocomplete != text
                && text.indexOf(',') === -1)
            ) {
            Chat.toAutocomplete = text;
        }

        // If it is a first autocomplete attempt and there was no
        // substring to search found in input field - just add
        // first element from users list to input field.
        if (Chat.previouslyAutocompleted === null
            && Chat.toAutocomplete == '') {
            var autocompleted = usersList[0]['resource'];
            Chat.quoteMUC(autocompleted);
            Chat.previouslyAutocompleted = autocompleted;
        } else {
            // Otherwise we should autocomplete next to
            // previouslyAutocompleted.
            var autocompletedOk = false;

            for (var i = 0; i < usersList.length; i++) {
                var autocompleted = '';

                // If we have substring to autocomplete.
                var user_substr = usersList[i]['resource'].substring(0, Chat.toAutocomplete.length);

                // If we want to just-scroll through all people in MUC.
                if (usersList[i]['resource'] == Chat.previouslyAutocompleted
                    && i !== usersList.length - 1
                    && Chat.toAutocomplete == '') {
                    autocompleted = usersList[i+1]['resource'];
                    autocompletedOk = true;
                } else if (i > Chat.previouslyAutocompletedSeqID
                    && user_substr.toLowerCase().indexOf(Chat.toAutocomplete) !== -1
                    && usersList[i]['resource'] != Chat.previouslyAutocompleted) {
                    autocompleted = usersList[i]['resource'];
                    autocompletedOk = true;
                }

                if (autocompletedOk) {
                    Chat.quoteMUC(autocompleted);
                    Chat.previouslyAutocompleted = autocompleted;
                    Chat.previouslyAutocompletedSeqID = i;
                    break;
                }
            }

            // If autocompletion failed - emptify input field.
            if (!autocompletedOk) {
                textarea.value = '';
                Chat.previouslyAutocompleted = null;
                Chat.previouslyAutocompletedSeqID = null;
            }
        }
    },
    quoteMUC: function(nickname, add)
    {
        var textarea = Chat.getTextarea();
        if(add) {
            if(textarea.value.search(nickname) === -1) {
                textarea.value = nickname + ', ' + textarea.value;
            }
        } else {
            textarea.value = nickname + ', ';
        }

        textarea.focus();
    },
    sendMessage: function()
    {
        var textarea = Chat.getTextarea();

        var text = textarea.value;
        var muc = Boolean(textarea.dataset.muc);
        var jid = textarea.dataset.jid;

        textarea.focus();

        if(!Chat.sended) {
            Chat.sended = true;

            if(Chat.edit) {
                Chat.edit = false;
                Chat_ajaxCorrect(jid, text);
            } else {
                Chat_ajaxSendMessage(jid, text, muc);
            }
        }

        // Emptify autocomplete data on message sending.
        if (Chat.previouslyAutocompleted !== null) {
            Chat.previouslyAutocompleted = null;
            Chat.previouslyAutocompletedSeqID = null;
            Chat.toAutocomplete = null;
        }
    },
    sendedMessage: function()
    {
        Chat.sended = false;
        Chat.clearReplace();
        var textarea = Chat.getTextarea();
        localStorage.removeItem(textarea.dataset.jid + '_message');
    },
    clearReplace: function()
    {
        Chat.edit = false;
        var textarea = Chat.getTextarea();
        textarea.value = '';
        MovimUtils.textareaAutoheight(textarea);
    },
    editPrevious: function()
    {
        var textarea = Chat.getTextarea();
        if(textarea.value == '') {
            Chat_ajaxLast(textarea.dataset.jid);
        }
    },
    focus: function()
    {
        Chat.sended = false;

        var textarea = Chat.getTextarea();

        setTimeout(function() {
            var textarea = Chat.getTextarea();
            textarea.value = localStorage.getItem(textarea.dataset.jid + '_message');

            MovimUtils.textareaAutoheight(textarea);
        }, 0); // Fix Me

        textarea.onkeydown = function(event) {
            if (this.dataset.muc && event.keyCode == 9) {
                Chat.autocomplete(event, this.dataset.jid);
                return;
            }

            if(event.keyCode == 38) {
                Chat.editPrevious();
            } else if(event.keyCode == 40
            && (this.value == '' || Chat.edit == true)) {
                Chat.clearReplace();
            }
        };

        textarea.onkeypress = function(event) {
            if(event.keyCode == 13) {
                if(window.matchMedia("(max-width: 1024px)").matches
                || event.shiftKey) {
                    return;
                }
                Chat.state = 0;
                Chat.sendMessage();

                return false;
            } else if(!Boolean(this.dataset.muc)) {
                if(Chat.state == 0 || Chat.state == 2) {
                    Chat.state = 1;
                    Chat_ajaxSendComposing(this.dataset.jid);
                    Chat.since = new Date().getTime();
                }
            }
        };

        textarea.onkeyup = function(event) {
            localStorage.setItem(this.dataset.jid + '_message', this.value);

            setTimeout(function()
            {
                var textarea = document.querySelector('#chat_textarea');

                if(textarea
                && !Boolean(textarea.dataset.muc)
                && Chat.state == 1
                && Chat.since + 5000 < new Date().getTime()) {
                    Chat.state = 2;
                    Chat_ajaxSendPaused(textarea.dataset.jid);
                }
            },5000);

            Chat.toggleAction(this.value.length);
        };

        textarea.oninput = function() {
            MovimUtils.textareaAutoheight(this);
        };

        if(document.documentElement.clientWidth > 1024) {
            textarea.focus();
        }
    },
    setTextarea: function(value)
    {
        Chat.edit = true;
        var textarea = Chat.getTextarea();
        textarea.value = value;
        MovimUtils.textareaAutoheight(textarea);
        textarea.focus();
    },
    notify : function(title, body, image)
    {
        if(document_focus == false) {
            movim_title_inc();
            movim_desktop_notification(title, body, image);
        }
    },
    empty : function()
    {
        Chat_ajaxGet();
    },
    setBubbles : function(left, right, date) {
        var div = document.createElement('div');

        Chat.currentDate = null;

        div.innerHTML = left;
        Chat.left = div.firstChild.cloneNode(true);
        div.innerHTML = right;
        Chat.right = div.firstChild.cloneNode(true);
        div.innerHTML = date;
        Chat.date = div.firstChild.cloneNode(true);

        Chat.setScrollBehaviour();
    },
    setScrollBehaviour : function() {
        var discussion = document.querySelector('#chat_widget div.contained');
        discussion.onscroll = function() {
            if(this.scrollTop < 1
            && discussion.querySelectorAll('ul li p').length >= Chat.pagination) {
                Chat_ajaxGetHistory(Chat.getTextarea().dataset.jid, Chat.currentDate);
            }

            Chat.lastHeight = this.clientHeight;
        };
    },
    checkDiscussion : function(page) {
        for (var firstKey in page) break;
        if(page[firstKey] == null) return false;

        for (var firstMessageKey in page[firstKey]) break;
        var firstMessage = page[firstKey][firstMessageKey];
        if(firstMessage == null) return false;

        var contactJid = firstMessage.session == firstMessage.jidfrom
            ? firstMessage.jidto
            : firstMessage.jidfrom;

        if(document.getElementById(MovimUtils.cleanupId(contactJid + '-discussion'))
        == null) return false;

        return true;
    },
    appendMessagesWrapper : function(page, prepend) {
        if(page && Chat.checkDiscussion(page)) {
            var scrolled = MovimTpl.isPanelScrolled();

            var discussion = document.querySelector('#chat_widget div.contained');

            if(discussion == null) return;

            Chat.lastScroll = discussion.scrollHeight;

            for(date in page) {
                if(prepend === undefined) {
                    Chat.appendDate(date, prepend);
                }

                for(speakertime in page[date]) {
                    if(!Chat.currentDate) {
                        Chat.currentDate = page[date][speakertime].published;
                    }

                    Chat.appendMessage(speakertime, page[date][speakertime], prepend);
                }

                if(prepend && date) {
                    Chat.appendDate(date, prepend);
                }
            }

            // Only scroll down if scroll was at the bottom before the new msg
            // => don't scroll if the user was reading previous messages
            if(scrolled && prepend !== true) {
                setTimeout(function() {
                    MovimTpl.scrollPanel();
                }, 20);
            }

            if(prepend) {
                // And we scroll where we were
                var scrollDiff = discussion.scrollHeight - Chat.lastScroll;
                discussion.scrollTop += scrollDiff;
                Chat.lastScroll = discussion.scrollHeight;
            }

            var chat = document.querySelector('#chat_widget');
            var lastMessage = chat.querySelector('ul li:not(.oppose):last-child div.bubble > div:last-child');
            var textarea = Chat.getTextarea();

            if(textarea && lastMessage) {
                Chat_ajaxDisplayed(
                    textarea.dataset.jid,
                    lastMessage.id
                );
            }
        }
    },
    appendMessage : function(idjidtime, data, prepend) {
        if(data.body == null) return;

        var bubble = null,
            mergeMsg = false,
            msgStack,
            refBubble;

        var isMuc = (document.querySelector('#chat_widget div.contained').dataset.muc == 1);
        var jidtime = idjidtime.substring(idjidtime.indexOf('<') + 1);

        if(prepend) {
            refBubble = document.querySelector("#chat_widget .contained li:first-child");
            msgStack = document.querySelector("[data-bubble='" + jidtime + "']");
        } else {
            refBubble = document.querySelector("#chat_widget .contained li:last-child");
            var stack = document.querySelectorAll("[data-bubble='" + jidtime + "']");
            msgStack = stack[stack.length-1];
        }

        if(msgStack != null
            && msgStack.parentNode == refBubble
            && data.file === null
            && data.sticker === null
            && !MovimUtils.hasClass(refBubble.querySelector('div.bubble'), "sticker")
            && !MovimUtils.hasClass(refBubble.querySelector('div.bubble'), "file")
        ){
            bubble = msgStack.parentNode;
            mergeMsg = true;
        } else {
            if (data.session == data.jidfrom) {
                bubble = Chat.right.cloneNode(true);
                id = data.jidto + '_conversation';
            } else {
                bubble = Chat.left.cloneNode(true);
                id = data.jidfrom + '_conversation';
            }

            id = MovimUtils.cleanupId(id);

            bubble.querySelector('div.bubble').dataset.bubble = jidtime;
            bubble.querySelector('div.bubble').dataset.publishedprepared = data.publishedPrepared;
        }

        var msg = bubble.querySelector('div.bubble > div');
        var span = msg.getElementsByTagName('span')[0];
        var p = msg.getElementsByTagName('p')[0];

        // If there is already a msg in this bubble, create another div (next msg or replacement)
        if (bubble.querySelector('div.bubble p')
        && bubble.querySelector('div.bubble p').innerHTML != '') {
            msg = document.createElement("div");
            p = document.createElement("p");
            span = document.createElement("span");
            span.className = 'info';
        }

        if (data.rtl) {
            bubble.querySelector('div.bubble').setAttribute('dir', 'rtl');
        }

        if (data.body.match(/^\/me\s/)) {
            p.classList.add('quote');
            data.body = data.body.substr(4);
        }

        if (data.body.match(/^\/code/)) {
            p.classList.add('code');
            data.body = data.body.substr(6).trim();
        }

        if (data.id != null) {
            msg.setAttribute("id", data.id);
            if (data.newid != null) {
                msg.setAttribute("id", data.newid);
            }
        }

        if (data.sticker != null) {
            MovimUtils.addClass(bubble.querySelector('div.bubble'), 'sticker');
            p.appendChild(Chat.getStickerHtml(data.sticker));
        } else {
            p.innerHTML = data.body;
        }

        if (data.audio != null) {
            MovimUtils.addClass(bubble.querySelector('div.bubble'), 'file');
            p.appendChild(Chat.getAudioHtml(data.file));
        } else if (data.file != null) {
            MovimUtils.addClass(bubble.querySelector('div.bubble'), 'file');
            p.appendChild(Chat.getFileHtml(data.file, data.sticker));
        }

        if (data.edited) {
            span.appendChild(Chat.getEditedIcoHtml());
        }

        if (data.session == data.jidfrom) {
            if (data.displayed) {
                span.appendChild(Chat.getDisplayedIcoHtml(data.displayed));
            } else if (data.delivered) {
                span.appendChild(Chat.getDeliveredIcoHtml(data.delivered));
            }
        }

        msg.appendChild(p);
        msg.appendChild(span);

        var elem = document.getElementById(data.id);
        if (elem) {
            elem.parentElement.replaceChild(msg, elem);
            mergeMsg = true;
        } else {
            if(prepend) {
                bubble.querySelector('div.bubble').insertBefore(msg, bubble.querySelector('div.bubble').firstChild);
            } else {
                bubble.querySelector('div.bubble').appendChild(msg);
            }
        }

        /* MUC specific */
        if(isMuc) {
            bubble.querySelector('div.bubble').dataset.publishedprepared = data.resource + ' – ' + data.publishedPrepared;

            icon = bubble.querySelector('span.primary.icon');

            if(icon.querySelector('img') == undefined) {
                if(data.icon_url) {
                    var img = document.createElement("img");
                    img.setAttribute("src", data.icon_url);

                    icon.appendChild(img);
                } else {
                    icon.classList.add('color');
                    icon.classList.add(data.color);
                    icon.innerHTML = data.icon;
                }

                icon.dataset.resource = data.resource;
            }

            if(data.quoted) {
                bubble.querySelector('div.bubble').classList.add('quoted');
            }

            /*icon.onclick = function(n) {
                var textarea = document.querySelector('#chat_textarea');
                textarea.value = this.dataset.resource + ', ' + textarea.value;
                textarea.focus();
            };*/
        }

        if(prepend){
            Chat.currentDate = data.published;

            // We prepend
            if (!mergeMsg) {
                MovimTpl.prepend("#" + id, bubble.outerHTML);
            }
        } else {
            if (!mergeMsg) {
                MovimTpl.append("#" + id, bubble.outerHTML);
            }
        }
    },
    appendDate: function(date, prepend) {
        var list = document.querySelector('#chat_widget > div ul');
        dateNode = Chat.date.cloneNode(true);
        dateNode.dataset.value = date;
        dateNode.querySelector('p').innerHTML = date;

        var dates = list.querySelectorAll('li.date');

        if(prepend) {
            // If the date was already displayed we remove it
            if(dates.length > 0
            && dates[0].dataset.value == date) {
                dates[0].parentNode.removeChild(dates[0]);
            }

            list.insertBefore(dateNode, list.firstChild);
        } else {
            if(dates.length > 0
            && dates[dates.length-1].dataset.value == date) {
                return;
            }

            list.appendChild(dateNode);
        }
    },
    getStickerHtml: function(sticker) {
        var img = document.createElement("img");
        if(sticker.url) {
            img.setAttribute("src", sticker.url);
            if(sticker.width)  img.setAttribute("width", sticker.width);
            if(sticker.height)
                img.setAttribute("height", sticker.height);
            else {
                img.setAttribute("height", "170");
            }
        }

        if(sticker.picture) {
            var a = document.createElement("a");
            a.setAttribute("href", sticker.url);
            a.setAttribute("target", "_blank");
            a.appendChild(img);
            return a;
        } else {
            return img;
        }
    },
    getAudioHtml: function(file) {
        var audio = document.createElement("audio");
        audio.setAttribute("controls", true);

        var source = document.createElement("source");
        source.setAttribute("src", file.uri);
        source.setAttribute("type", file.type);

        audio.appendChild(source);

        return audio;
    },
    getFileHtml: function(file, sticker) {
        var div = document.createElement("div");
        div.setAttribute("class", "file");

        var a = document.createElement("a");
        if(sticker == null) {
            a.innerHTML = file.name;
        }
        a.setAttribute("href", file.uri);
        a.setAttribute("target", "_blank");

        div.appendChild(a);

        var span = document.createElement("span");
        span.innerHTML = file.size;
        span.setAttribute("class", "size");

        a.appendChild(span);

        return div;
    },
    getEditedIcoHtml: function() {
        var i = document.createElement("i");
        i.setAttribute("class", "zmdi zmdi-edit");
        return i;
    },
    getDeliveredIcoHtml: function(delivered) {
        var i = document.createElement("i");
        i.setAttribute("class", "zmdi zmdi-check");
        i.setAttribute("title", delivered);
        return i;
    },
    getDisplayedIcoHtml: function(displayed) {
        var i = document.createElement("i");
        i.setAttribute("class", "zmdi zmdi-check-all");
        i.setAttribute("title", displayed);
        return i;
    },
    toggleAction: function(l) {
        var send_button = document.querySelector(".chat_box span[data-jid]");
        var attachment_button = document.querySelector(".chat_box span.control:not([data-jid])");
        if(send_button && attachment_button) {
            if(l > 0){
                MovimUtils.showElement(send_button);
                MovimUtils.hideElement(attachment_button);
            } else {
                MovimUtils.showElement(attachment_button);
                MovimUtils.hideElement(send_button);
            }
        }
    },
    getTextarea: function() {
        var textarea = document.querySelector('#chat_textarea');
        if(textarea) return textarea;
    }
};

MovimWebsocket.attach(function() {
    var jid = MovimUtils.urlParts().params[0];
    var room = MovimUtils.urlParts().params[1];
    if(jid) {
        MovimTpl.showPanel();

        if(room) {
            Chat_ajaxGetRoom(jid);
        } else {
            Chat_ajaxGet(jid);
            Notification.current('chat|' + jid);
        }
    }
});

if(typeof Upload != 'undefined') {
    Upload.attach(function(file) {
        Chat_ajaxSendMessage(Chat.getTextarea().dataset.jid, false, Boolean(Chat.getTextarea().dataset.muc), false, false, file);
    });
}

document.addEventListener('focus', function() {
    var textarea = Chat.getTextarea();
    if(textarea) textarea.focus();
});

window.addEventListener('resize', function() {
    var discussion = document.querySelector('#chat_widget div.contained');
    if(discussion) {
        discussion.scrollTop += Chat.lastHeight - discussion.clientHeight;
        Chat.lastHeight = discussion.clientHeight;
    }
});

var state = 0;
