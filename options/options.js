const closedCaptionsCheckbox = document.querySelector("#disable-cc");
const muteCheckbox = document.querySelector("#disable-mute");
const versionDisplayer = document.querySelector("#left");

chrome.storage.sync.get({ disableMute: true, disableCC: true }, (items) => { //get the saved values, and set checkboxes
    muteCheckbox.checked = items.disableMute;
    closedCaptionsCheckbox.checked = items.disableCC;
});

versionDisplayer.innerHTML = `Version ${chrome.runtime.getVersion()}`

closedCaptionsCheckbox.addEventListener("change", CheckboxChange)
muteCheckbox.addEventListener("change", CheckboxChange)

function CheckboxChange(_event)
{
    if(_event.target == closedCaptionsCheckbox)
    {
        chrome.storage.sync.set({ disableCC: closedCaptionsCheckbox.checked });
    }
    else
    {
        chrome.storage.sync.set({ disableMute: muteCheckbox.checked });
    }
}