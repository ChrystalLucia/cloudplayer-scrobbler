/**
 * popup.js
 * Popup page script
 * Copyright (c) 2011 Alexey Savartsov <asavartsov@gmail.com>
 * Licensed under the MIT license
 */
/* Background page */
var bp = chrome.extension.getBackgroundPage();

/* Render popup when DOM is ready */
$(document).ready(function() {
    set_play_link();
    render_scrobble_link();
    render_song();
    render_auth_link();
});

function find_play_tab(callback) {
    chrome.tabs.query({url: '*://play.google.com/music/listen*'},
        function(tabs) {
            if (tabs.length > 0) {
                callback(tabs[0]);
            } else {
                callback(null);
            }
        });
}

function open_play_tab() {
    find_play_tab(
        function(tab) {
            if (tab) {
                chrome.tabs.update(tab.id, {selected: true});
            } else {
                chrome.tabs.create({url: 'https://play.google.com/music/listen',
                                  selected: true});
            }
        }
    );
}

function toggle_play() {
    find_play_tab(
        function(tab) {
            chrome.tabs.sendMessage(tab.id, {cmd: "toggle_play"}, toggle_play_btn);           
        }
    );
}

function next_song() {
    find_play_tab(
        function(tab) {
            chrome.tabs.sendMessage(tab.id, {cmd: "next_song"}, update_song_info);           
        }
    );
}

function set_play_link() {
    $("#cover").click(open_play_tab);
}
/* Render functions */
/*
* TODO
* - Update song info when restarting playlist
* - Reset marquee position when changing songs
* - Get real button icons
* - Cache player elements in a single place in parser.
*/
function update_song_info(player) {
    $("#artist").text(player.song.artist);
    $("#track").text(player.song.title);
    $("#cover").attr({ src: player.song.cover || "../img/defaultcover.png",
        alt:player.song.album});
    $("#album").text(player.song.album);
    // check if we need to marquee
    var songElem = $("#now-playing");
    if (songElem.get(0).scrollWidth > songElem.width() + 10) {
        songElem.attr('scrollamount', '1');
    } else {
        songElem.attr('scrollamount', '0');
    }
    
    if(bp.lastfm_api.session.name && bp.lastfm_api.session.key) {
        render_love_button();
        toggle_play_btn(player.is_playing);
    }
}

function toggle_play_btn(is_playing) {
    if (is_playing) {
        $("#play-pause-btn").text("Pause");
    } else {
        $("#play-pause-btn").text("Play");
    }
}

/**
 * Renders current song details
 */
function render_song() {
    if(bp.player.has_song)
    {
        update_song_info(bp.player);
        
        if(bp.lastfm_api.session.name && bp.lastfm_api.session.key) {
       	    $("#play-pause-btn").click(toggle_play);
       	    $("#next-btn").click(next_song);
        }
        else {
            $("#lastfm-buttons").hide();
        }
    }
    else {
        $("#song").addClass("nosong");
        $("#artist").text("");
        $("#track").html('');
        $("#cover ").attr({ src: "../img/defaultcover.png" });
        $("#lastfm-buttons").hide();
    }
}

/**
 * Renders the link to turn on/off scrobbling
 */
function render_scrobble_link() {
    $("#scrobbling").html('<a></a>');
    $("#scrobbling a")
    .attr({
        href: "#"
    })
    .click(on_toggle_scrobble)
    .text(bp.SETTINGS.scrobble ? "Stop scrobbling" : "Resume scrobbling");
}

/**
 * Renders authentication/profile link
 */
function render_auth_link() {
    if(bp.lastfm_api.session.name && bp.lastfm_api.session.key)
    {
        $("#lastfm-profile").html("Logged in as " + "<a></a><a></a>");
        $("#lastfm-profile a:first")
        .attr({
            href: "http://last.fm/user/" + bp.lastfm_api.session.name,
            target: "_blank"
        })
        .text(bp.lastfm_api.session.name);
        
        $("#lastfm-profile a:last")
        .attr({
            href: "#",
            title: "Logout"
        })
        .click(on_logout)
        .addClass("logout");
    }
    else {
        $("#lastfm-profile").html('<a></a>');
        $("#lastfm-profile a")
        .attr({
            href: "#" 
        })
        .click(on_auth)
        .text("Connect to Last.fm");
    }
}

/**
 * Renders the love button
 */
function render_love_button() {
    $("#love-button").html('<img src="../img/ajax-loader.gif">');
    
    bp.lastfm_api.is_track_loved(bp.player.song.title,
            bp.player.song.artist, 
            function(result) {
                $("#love-button").html('<a href="#"></a>');
                if(result) {
                    $("#love-button a").attr({ title: "Unlove this song"})
                    .click(on_unlove)
                    .addClass("loved");
            
                }
                else 
                {
                    $("#love-button a").attr({ title: "Love this song" })
                    .click(on_love)
                    .addClass("notloved");
                }
            });
}

/* Event handlers */

/**
 * Turn on/off scrobbling link was clicked
 */
function on_toggle_scrobble() {
    bp.toggle_scrobble();
    render_scrobble_link();
}

/**
 * Authentication link was clicked
 */
function on_auth() {
    bp.start_web_auth();
    window.close();
}

/**
 * Logout link was clicked
 */
function on_logout() {
    bp.clear_session();
    render_auth_link();
}

/**
 * Love button was clicked
 */
function on_love() {
    bp.lastfm_api.love_track(bp.player.song.title, bp.player.song.artist, 
        function(result) {
            if(!result.error) {
                render_love_button();
            }
            else {
                if(result.error == 9) {
                    // Session expired
                    bp.clear_session();
                    render_auth_link();
                }
                
                chrome.browserAction.setIcon({
                     'path': SETTINGS.error_icon });
            }
        });

    $("#love-button").html('<img src="../img/ajax-loader.gif">');
}

/**
 * Unlove button was clicked
 */
function on_unlove() {
    bp.lastfm_api.unlove_track(bp.player.song.title, bp.player.song.artist, 
        function(result) {
            if(!result.error) {
                render_love_button();
            }
            else {
                if(result.error == 9) {
                    // Session expired
                    bp.clear_session();
                    render_auth_link();
                }
                
                chrome.browserAction.setIcon({
                     'path': SETTINGS.error_icon });
            }
        });

    $("#love-button").html('<img src="../img/ajax-loader.gif">');
}
