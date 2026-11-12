//-----------------------------------------------------------------------------------------------
//IF THE HTML CODE STRUCTURE OF THE YOUTUBE PAGE CHANGES, THESE CONSTANTS MUST BE UPDATED ACCORDINGLY
const MUTE_BUTTON_CLASS = "ytmMuteButtonButton"; //className of the mute button
const CC_BUTTON_CLASS = "ytmClosedCaptioningButtonButton"; //className of the closed captions button

const MUTE_ATTRIBUTE = "aria-label"; //attribute that shows whether the video is muted (attached to mute button)
const CC_ATTRIBUTE = "aria-pressed"; //attribute that shows whether the closed captions are being used or not (attached to closed captions button)

const MUTE_ATTRIBUTE_VALUE = "unmute"; //value which the extension wants to change by clicking the button, THIS MEANS THE VIDEO IS MUTED
const CC_ATTRIBUTE_VALUE = "true"; //value which the extension wants to change by clicking the button, THIS MEANS THE VIDEO IS USING CLOSED CAPTIONS

const PREVIEW_ID = "inline-preview-player"; //ID of a <div> that is a parent of a parent of <video>, that we're looking for
const PAID_PROMOTION_TAGNAME = "ytm-paid-content-overlay-renderer"; //tagName for the paid promotion block: <ytm-paid-content-overlay-renderer>
//-----------------------------------------------------------------------------------------------

const CSS_SCRIPT = `
.preview-volume-slider
{
    margin: 20px;
    -webkit-appearance: none;
    appearance: none;

    outline: 12px solid rgba(0, 0, 0, 0.6);
    border-radius: 2%;
    position: relative;
    background-color: white;
    height: 4px;
    width: 100px;
    cursor: pointer;
}

.preview-volume-slider:hover
{
    -webkit-appearance: none;
    appearance: none;
    outline: 12px solid rgba(44, 44, 44, 0.6);
}

.preview-volume-slider::-webkit-slider-thumb /*Handle in webkit browsers*/
{
    -webkit-appearance: none;
    appearance: none;
    border-radius: 50%;
    background: white;
    cursor: pointer;
    width: 14px;
    height: 14px;
    z-index: 100;
    position: relative;
}

.preview-volume-slider::-moz-range-thumb /*Handle in firefox browser*/
{
    -webkit-appearance: none;
    appearance: none;
    border-radius: 50%;
    background: white;
    cursor: pointer;
    width: 14px;
    height: 14px;
    z-index: 100;
    position: relative;
}
`;

var canDisableClosedCaptions = true; //disables closed captions on start, in preview
var canDisableMute = true; //disables mute on start, in preview

var style = null;
var volumeSlider = null;
const allVideoPlayers = [];

var muteButton = null;
var closedCaptionsButton = null;

var url;
var currentVolume = 0.5;
var muteButtonClickedByUser = false; //whether the user muted the video preview
var closedCaptionsButtonClickedByUser = false; //whether the user enabled closed captions in the video preview

url = window.location.toString();

//main function
if(url.toLowerCase().includes("youtube"))
{
    //get the values saved in storage
    chrome.storage.sync.get({disableMute: true, disableCC: true}, (items) => {
        canDisableMute = items.disableMute;
        canDisableClosedCaptions = items.disableCC;

        NormalizeVolume(localStorage.getItem("volume"));

        const mutationObserver = new MutationObserver((_mutations) => {
            for(const _mutation of _mutations)
            {
                if(_mutation.type == "attributes")
                {
                    if(_mutation.target.className == MUTE_BUTTON_CLASS)
                    {
                        DisableMuteAndClosedCaptions();
                    }
                    else if(_mutation.target.className == CC_BUTTON_CLASS)
                    {
                        DisableMuteAndClosedCaptions();
                    }
                    else if(_mutation.target.tagName != null && _mutation.target.tagName.toLowerCase() == "video")
                    {
                        DisableMuteAndClosedCaptions();
                        ManipulateVideoArray(_mutation.target);
                    }
                }
                else
                {
                    //detected some nodes being removed
                    _mutation.removedNodes.forEach(_node => 
                    {
                        if(_node.tagName != null && _node.tagName.toLowerCase() == "video")
                        {
                            ManipulateVideoArray(_node, true);
                        }
                        else if(_node.className == MUTE_BUTTON_CLASS)
                        {
                            muteButtonClickedByUser = false;
                            muteButton = null;
                        }
                        else if(_node.className == CC_BUTTON_CLASS)
                        {
                            closedCaptionsButtonClickedByUser = false;
                            closedCaptionsButton = null;
                        }
                        else if(_node.querySelectorAll)
                        {
                            var videoPlayers = _node.querySelectorAll("video");
                            videoPlayers.forEach(_video => {
                                ManipulateVideoArray(_video, true);
                                DisableMuteAndClosedCaptions();
                            });

                            if(!IsNull(muteButton))
                            {
                                const muteButtons = _node.querySelectorAll("." + MUTE_BUTTON_CLASS);
                                muteButtons.forEach(_muteBtn => {
                                    muteButtonClickedByUser = false;
                                    muteButton = null;
                                    DisableMuteAndClosedCaptions();
                                });
                            }

                            if(!IsNull(closedCaptionsButton))
                            {
                                const ccButtons = _node.querySelectorAll("." + CC_BUTTON_CLASS);
                                ccButtons.forEach(_ccBtn => {
                                    closedCaptionsButtonClickedByUser = false;
                                    closedCaptionsButton = null;
                                    DisableMuteAndClosedCaptions();
                                });
                            }
                        }
                    });
                    
                    //detected some nodes being added
                    _mutation.addedNodes.forEach(_node =>
                    {
                        if(_node.tagName != null && _node.tagName.toLowerCase() == "video")
                        {
                            ManipulateVideoArray(_node);
                            DisableMuteAndClosedCaptions();
                            CreateSlider();
                            PrepareVideoAndSlider(_node);
                        }
                        else if(_node.tagName != null && _node.tagName == PAID_PROMOTION_TAGNAME)
                        {
                            _node.remove();
                        }
                        else if(_node.className == MUTE_BUTTON_CLASS)
                        {
                            muteButtonClickedByUser = false;
                            muteButton = _node;
                            muteButton.addEventListener("click", (_event) => {OnButtonClick(_event, muteButton);});
                            DisableMuteAndClosedCaptions();
                        }
                        else if(_node.className == CC_BUTTON_CLASS)
                        {
                            closedCaptionsButtonClickedByUser = false;
                            closedCaptionsButton = _node;
                            closedCaptionsButton.addEventListener("click", (_event) => {OnButtonClick(_event, closedCaptionsButton);});
                            DisableMuteAndClosedCaptions();
                        }
                        else if(_node.querySelectorAll)
                        {
                            var videoPlayers = _node.querySelectorAll("video");
                            videoPlayers.forEach(_video => {
                                ManipulateVideoArray(_video);
                                DisableMuteAndClosedCaptions();
                                CreateSlider();
                                PrepareVideoAndSlider(_video);
                            });

                            const paidPromotions = _node.querySelectorAll(PAID_PROMOTION_TAGNAME);
                            paidPromotions.forEach(_promotion => {
                                _promotion.remove();
                            });

                            if(IsNull(muteButton))
                            {
                                const muteButtons = _node.querySelectorAll("." + MUTE_BUTTON_CLASS);
                                muteButtons.forEach(_muteBtn => {
                                    muteButtonClickedByUser = false;
                                    muteButton = _muteBtn;
                                    muteButton.addEventListener("click", (_event) => {OnButtonClick(_event, muteButton);});
                                    DisableMuteAndClosedCaptions();
                                });
                            }

                            if(IsNull(closedCaptionsButton))
                            {
                                const ccButtons = _node.querySelectorAll("." + CC_BUTTON_CLASS);
                                ccButtons.forEach(_ccBtn => {
                                    closedCaptionsButtonClickedByUser = false;
                                    closedCaptionsButton = _ccBtn;
                                    closedCaptionsButton.addEventListener("click", (_event) => {OnButtonClick(_event, closedCaptionsButton);});
                                    DisableMuteAndClosedCaptions();
                                });
                            }
                        }
                    });
                }
            }
        });

        mutationObserver.observe(document.body, { attributes: true, childList: true, subtree: true });
    });
}

//getting volume saved the last time from localStorage and setting it as a value of currentVolume
function NormalizeVolume(_volume)
{
    if (!IsNull(_volume))
    {
        _volume = parseFloat(_volume);

        if(isNaN(_volume))
        {
            _volume = 0.5;
            localStorage.setItem("volume", "0.5");
        }
        else
        {
            if(_volume < 0 || _volume > 1)
            {
                _volume = 0.5;
                localStorage.setItem("volume", "0.5");
            }
        }
    }
    else
    {
        _volume = 0.5;
        localStorage.setItem("volume", "0.5");
    }

    localStorage.setItem("volume", _volume);
    currentVolume = _volume;

    if(!IsNull(volumeSlider))
    {
        volumeSlider.value = currentVolume;
    }
}

//Adds the slider and listeners to preview video players
function PrepareVideoAndSlider(_video)
{
    DisableMuteAndClosedCaptions();
    _video.addEventListener('loadstart', DisableMuteAndClosedCaptions);
    _video.addEventListener('volumechange', DisableMuteAndClosedCaptions);
    _video.addEventListener('loadeddata', DisableMuteAndClosedCaptions);
    _video.addEventListener('unload', DisableMuteAndClosedCaptions);
    _video.addEventListener('loadedmetadata', DisableMuteAndClosedCaptions);
    _video.addEventListener('canplay', DisableMuteAndClosedCaptions);
    _video.addEventListener('canplaythrough', DisableMuteAndClosedCaptions);       
    _video.addEventListener('playing', DisableMuteAndClosedCaptions);
    _video.addEventListener("play", DisableMuteAndClosedCaptions);
    if(!IsNull(volumeSlider))
    {
        if(!IsNull(_video.parentNode) && !IsNull(_video.parentNode.parentNode) && _video.parentNode.parentNode.id == PREVIEW_ID && volumeSlider.parentNode != _video.parentNode)
        {
            _video.parentNode.appendChild(volumeSlider);
        }
    }
}

//function that creates a slider, and adds <style> for it
function CreateSlider()
{
    //if sliders exists already, delete it
    if(!IsNull(volumeSlider))
    {
        return;
    }

    //add the slider
    volumeSlider = document.createElement("input");
    volumeSlider.setAttribute("type", "range");
    volumeSlider.setAttribute("class", "preview-volume-slider");
    volumeSlider.setAttribute("step", "0.01");
    volumeSlider.setAttribute("min", "0");
    volumeSlider.setAttribute("max", "1");
    volumeSlider.setAttribute("value", currentVolume);

    ChangeVisualsOnSlider();

    volumeSlider.addEventListener("input", () => {
        NormalizeVolume(volumeSlider.value);
        ChangeVisualsOnSlider();
        DisableMuteAndClosedCaptions();
    });

    volumeSlider.addEventListener("click", _event => {
        _event.stopPropagation();
        _event.preventDefault();
    });

    //spawn style, change slider's appearance
    if(IsNull(style))
    {
        style = document.createElement('style');
        style.textContent = CSS_SCRIPT;

        document.head.appendChild(style);
    }
}

//function that changes visually the volume on the slider
function ChangeVisualsOnSlider()
{
    volumeSlider.style.background = `linear-gradient(to right, white ${currentVolume * 100}%, rgb(116, 116, 116) ${currentVolume * 100}%)`;
}

//function that handles volume changing
function ChangeVolume()
{
    for(let i = 0; i < allVideoPlayers.length; i++)
    {
        if(IsNull(allVideoPlayers[i]))
        {
            ManipulateVideoArray(allVideoPlayers[i], true, i);
        }
        else
        {
            if(allVideoPlayers[i].closest && allVideoPlayers[i].closest("#" + PREVIEW_ID))
            {
                allVideoPlayers[i].volume = currentVolume;
            }
        }
    }
}

//function that disables closed captions and mute
function DisableMuteAndClosedCaptions()
{
    ChangeVolume();
    if(!IsNull(muteButton) && canDisableMute && muteButton.getAttribute(MUTE_ATTRIBUTE) != null && muteButton.getAttribute(MUTE_ATTRIBUTE).toLowerCase() == MUTE_ATTRIBUTE_VALUE && !muteButtonClickedByUser) //if the video is muted, but the user doesn't want it to be muted
    {
        muteButton.click();
        muteButtonClickedByUser = false;
    }

    if(!IsNull(closedCaptionsButton) && canDisableClosedCaptions && closedCaptionsButton.getAttribute(CC_ATTRIBUTE) != null && closedCaptionsButton.getAttribute(CC_ATTRIBUTE).toLowerCase() == CC_ATTRIBUTE_VALUE && !closedCaptionsButtonClickedByUser) //if the video is using closed captions, but the user doesn't want them to be used
    {
        closedCaptionsButton.click();
        closedCaptionsButtonClickedByUser = false;
    }
    ChangeVolume();
}

//function that fires on mute button being clicked, checks if it was user who clicked it
function OnButtonClick(_event, _button)
{
    ChangeVolume();
    if(_button.className == MUTE_BUTTON_CLASS)
    {
        muteButtonClickedByUser = _event.isTrusted;
    }
    else if(_button.className == CC_BUTTON_CLASS)
    {
        closedCaptionsButtonClickedByUser = _event.isTrusted;
    }
}

//function that changes the array which contains all <video> on page
function ManipulateVideoArray(_element, _deleteThisElement = false, _indexToDelete = -1)
{
    if(!_deleteThisElement)
    {
        if(allVideoPlayers.length > 0)
        {
            if(!allVideoPlayers.includes(_element))
            {
                allVideoPlayers.push(_element);
            }
        }
        else
        {
            allVideoPlayers.push(_element);
        }
    }
    else
    {
        if(_indexToDelete == -1)
        {
            allVideoPlayers.splice(allVideoPlayers.indexOf(_element), 1);
        }
        else
        {
            allVideoPlayers.splice(_indexToDelete, 1);
        }
    }
}

//checks if an HTML element exists, isn't empty or undefined
function IsNull(_element)
{
    return (_element == undefined || !_element || _element == null);
}