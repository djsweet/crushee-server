var Upload = function (file, callback) {
    this.file = file;
    this.callback = callback;
};

Upload.prototype.getType = function () {
    return this.file.type;
};
Upload.prototype.getSize = function () {
    return this.file.size;
};
Upload.prototype.getName = function () {
    return this.file.name;
};
Upload.prototype.doUpload = function (file) {
    var that = this;
    var formData = new FormData();
    this.fileData = file

    formData.append("file", this.file, this.getName());
    formData.append("settings", JSON.stringify(settings))

    $.ajax({
        type: "POST",
        url: "/upload",
        xhr: function () {
            var myXhr = $.ajaxSettings.xhr();
            myXhr.upload.file = file;
            myXhr.upload.callback = that.callback;
            myXhr.upload.upload = that;
            if (myXhr.upload) {
                myXhr.upload.addEventListener('progress', that.progressHandling, false);
            }
            return myXhr;
        },
        success: function (data) {
            $("#output").append(data);
            that.callback(data, that.fileData);
        },
        error: function (error) {
            console.log(error)
            that.fileData.setStatus("error")
        },
        async: true,
        data: formData,
        cache: false,
        contentType: false,
        processData: false,
        timeout: 60000
    });



};

Upload.prototype.progressHandling = function (event) {

    var percent = 0;
    var position = event.loaded || event.position;
    var total = event.total;
    if (event.lengthComputable) {
        percent = Math.ceil(position / total * 100);
    }
    console.log(event);

    event.target.file.elem.find('div.progress-bar').css("width", percent + "%");

    if (percent == 100) {
        event.target.file.setStatus("crushing")
    }

};



$("html").bind("dragover", function (e) {
    e.preventDefault();
    $("#app").addClass("drop-hover");
    return false;
});
$("html").bind("dragenter", function (e) {
    e.preventDefault();
    $("#app").addClass("drop-hover");
    return false;
});
$("html").bind("dragexit", function (e) {
    e.preventDefault();
    $("#app").removeClass("drop-hover");
    return false;
});
$("html").bind("dragleave", function (e) {
    e.preventDefault();
    // $("#app").removeClass("drop-hover"); 
    return false;
});
$("html").bind("drop", function (e) {
    $("#app").removeClass("drop-hover");
    e.preventDefault();
    e.stopPropagation();

    var files = e.originalEvent.dataTransfer.files;

    for (var i = 0, file; file = files[i]; i++) {
        var upload = new Upload(file, UploadedFileCallback);
        var fileData = fileUploading(file.name)
        upload.doUpload(fileData);
    }

    return false;
});


function UploadedFileCallback(data, file) {
    console.log("RESPONSE", data, file);

    if(data === false) {
        file.setStatus("error")
        return false
    }

    file.startSize = data.sourcesize
    file.endSize = data.finalsize
    file.uuid = data.uuid
    file.url = data.dl
    file.preview = data.preview
    file.originalURL = data.original
    file.name = data.filename

    file.setFilename(file.name)

    file.setStatus("done")

}


var forcingFileNameChange = false;
$("#file").on("change", function (e) {
    if(forcingFileNameChange) {
        forcingFileNameChange = false;
        return false;
    }

    var files = e.target.files;

    for (var i = 0, file; file = files[i]; i++) {
        var upload = new Upload(file, UploadedFileCallback);
        var fileData = fileUploading(file.name)
        upload.doUpload(fileData);
    }

    // Reset so we can pick the same one again, if desired
    $("#file").val("")

});
$(".action--add-file").click(function (e) {
    console.log("Open file picker")
    e.preventDefault();
    $("#file").click();
    return false;
});


$(".action--reset-settings").click(function (e) {
    console.log("Resetting settings")
    e.preventDefault();
    localStorage.clear();
    location.reload();
    return false;
});


function setFilename(filename) {
    this.elem.find(".title").text(filename);
}

function setStatus(inStatus) {
    let status = inStatus.toLowerCase()
    this.status = status
    this.elem.attr('data-status', status)
    if (status === "done") {
        var size = getFormattedSize(this.endSize)
        var percent = getFormattedPercent
        this.elem.find('.preview img').attr('src', this.preview)
        this.elem.find('.details .subtitle').html(`<span>${size}</span><span>&centerdot;</span><span class="bold">${percent(this.startSize, this.endSize)}</span>`)
        updateTotals()
    } else if(status === "error") {
        this.elem.find('.details .subtitle').html(`<span class="bold error">Error: Could not process this file</span>`)
    } else if(status === "crushing") {
        this.elem.find('.details .subtitle').html(`<span class="bold">Crushing...</span>`)
    } else if(status === "deleted") {
        var foundDeleted = false
        for(var i = 0; i < files.list.length; i++) {
            if(files.list[i].status != "deleted") {
                foundDeleted = true
                break
            }
        }
        if(!foundDeleted) {
            clearAllFiles()
        }
    }
}

function getFormattedSize(size) {
    outSize = size;
    if (size < 1000) {
        // bytes
        outSize = size + " bytes"
    } else if (size < 1000 * 1000) {
        // KB
        outSize = (size / 1000).toFixed(1) + "KB"
    } else if (size < 1000 * 1000 * 1000) {
        // MB
        outSize = (size / (1000 * 1000)).toFixed(1) + "MB"
    }
    return outSize
}

function getFormattedPercent(start, end) {
    if(start == 0 || end == 0)
    return "0%"
    if(start < end) {
        return ((100 + ((end / start) * 100)).toFixed(0) + "% larger")
    } else {
        return ((100 - ((end / start) * 100)).toFixed(0) + "% smaller")
    }
    
}


function updateTotals() {
    var totalStart = 0;
    var totalEnd = 0;
    for(var i in files.list) {
        totalStart += files.list[i].startSize
        totalEnd += files.list[i].endSize
    }

    var size = getFormattedSize(totalEnd)
    var percent = getFormattedPercent(totalStart, totalEnd);
    $(".page--files--after-list .totals").html(`Total saved: ${size} &middot; <span>${percent}</span>`)
}


function actionSaveButton(e) {
    window.location.href = files.list[$(this).attr('data-id')].url
}

function actionMoreButton(e) {
    var pos = $(this).position()
    var menu = $(".elem--menu.single-file")

    files.menuItemID = parseInt($(this).attr("data-id"))

    menu.css("top", (pos.top - 5) + "px")
    menu.css("left", (pos.left - menu.width() + $(this).width()) + "px")
    menu.toggleClass("active")
}


var files = {
    add: function (data) {
        var file = {
            id: this.getID(),
            name: data.name || 'Unknown file',
            originalName: data.name || 'Unknown file',
            status: 'uploading',
            startSize: 0,
            endSize: 0,
            setStatus: setStatus,
            setFilename: setFilename,
            bind: function () { 
                this.elem = $(".elem--file[data-id='" + this.id + "']") 
                this.elem.find('.actions .save-button').click(actionSaveButton)
                this.elem.find('.actions .more-button').click(actionMoreButton)
                this.elem.find('.preview').click(showComparison)
            },
            elem: false,
            menuItemID: -1
        }
        this.list.push(file)
        return file
    },
    list: [],
    nextID: 0,
    getID: function () { return this.nextID++ }
}
function fileUploading(name) {

    var file = files.add({
        name: name
    })

    createNewFileHTML(file)
    return file
}

var showingList = false;
function createNewFileHTML(file) {

    if (!showingList) {
        showingList = true;
        $(".page--files").addClass("show");
    }

    var html = `
    <div class="elem--file" data-id="${file.id}" data-status="${file.status}">
                    <div class="inner">

                        <div class="preview">
                            <div class="inner">
                                <div class="overlay">
                                    <div class="progress-bar"></div>
                                    <div class="compare-hover">
                                    <svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24"><path d="M0 0h24v24H0z" fill="none"/><path d="M10 3H5c-1.1 0-2 .9-2 2v14c0 1.1.9 2 2 2h5v2h2V1h-2v2zm0 15H5l5-6v6zm9-15h-5v2h5v13l-5-6v9h5c1.1 0 2-.9 2-2V5c0-1.1-.9-2-2-2z"/></svg>
                                    </div>
                                </div>
                                <img src="assets/unknown.svg" />
                            </div>
                        </div>

                        <div class="details">
                            <div class="title">${file.name}
                            </div>
                            <div class="subtitle"><span class="bold">Uploading...</span></div>
                        </div>

                        <div class="actions">
                            <div class="more-button" data-id="${file.id}">
                                <svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24"><path d="M0 0h24v24H0z" fill="none"/><path d="M12 8c1.1 0 2-.9 2-2s-.9-2-2-2-2 .9-2 2 .9 2 2 2zm0 2c-1.1 0-2 .9-2 2s.9 2 2 2 2-.9 2-2-.9-2-2-2zm0 6c-1.1 0-2 .9-2 2s.9 2 2 2 2-.9 2-2-.9-2-2-2z"/></svg>
                            </div>
                        </div>

                    </div>
                </div>
    `;
    $('.page--files--list').prepend(html);
    file.bind()
}





function showComparison(e) {
    var file = files.list[$(this).parent().parent().attr("data-id")]
    if(file.status != "done")
        return false;

    $(".page--comparison").addClass("show");

    $(".page--comparison .before").css("background-image", `url('${file.originalURL}')`);
    $(".page--comparison .after").css("background-image", `url('${file.url}')`);
}



$(".page--comparison").click(function() {
    $(this).removeClass("show")
})

var beforeElem = $(".divider-wrap")
$(".page--comparison").mousemove(function(e) {
    beforeElem.width(e.pageX)
})






document.addEventListener('drop', function (e) {
    e.preventDefault();
    e.stopPropagation();
    console.log('File(s) you dragged here: ', e.dataTransfer.files);
    return false;
});

document.addEventListener('dragover', function (e) {
    e.preventDefault();
    e.stopPropagation();
    //ipcRenderer.send('ondragstart', '/path/to/item')
});








$("[data-linked]").on("change", function(e) {
    var linkedTo = $(this).attr("data-linked");
    $("input[data-linked='" + linkedTo + "']").val($(this).val());
    syncInput(this)
});

$("[data-linked]").on("input", function(e) {
    var linkedTo = $(this).attr("data-linked");
    $("input[data-linked='" + linkedTo + "']").val($(this).val());
    syncInput(this)
});

$(".input--toggle input").on("change", function(e) {
    syncInput(this)
});

$(".sidebar--section input").on("change", function(e) {
    updateSetting($(this).attr("name"), $(this).val())
});

$(".input--toggle").click(function(){
    var input = $(this).children("input");
    console.log(input.attr("value"))
    input.attr("value", (input.attr("value") == "true" ? "false" : "true"))
    
    syncInput(this)
});

function syncInput(elem) {
    if($(elem).hasClass("input--toggle")) {
        $(elem).attr("data-value", $(elem).children("input").eq(0).attr("value"))
        updateSetting($(elem).attr("data-linked"), $(elem).children("input").eq(0).attr("value"))
    }
    if($(elem).attr("data-action")) {
        window[$(elem).attr("data-action")](elem)
    }
};


function changePreset(elem) {
    var newPreset = $(elem).val()
    if(newPreset != settings.app.qualityPreset) {
        settings.app.qualityPreset = newPreset
        loadPreset(settings.app.qualityPreset)
    }
}

function loadPreset(idx) {
    settings.jpg = Object.assign(settings.jpg, qualityPresets[idx].jpg)
    settings.png = Object.assign(settings.png, qualityPresets[idx].png)
    settings.webp = Object.assign(settings.webp, qualityPresets[idx].webp)
    readAllInputSources()
}


function toggleAdvancedQuality() {
    if(settings.app.advancedQuality == "false") {
        $(".sidebar--section .quality-basic").removeClass("hide")
        $(".sidebar--section .quality-advanced").addClass("hide")
        loadPreset(settings.app.qualityPreset)
    } else {
        $(".sidebar--section .quality-basic").addClass("hide")
        $(".sidebar--section .quality-advanced").removeClass("hide")
    }
}


var defaultSettings = {
    resize: {
        width: "",
        height: "",
        crop: false
    },
    jpg: {
        quality: 95,
        make: false
    },
    png: {
        qualityMin: 50,
        qualityMax: 95
    },
    gif: {
        colors: 128
    },
    webp: {
        quality: 90,
        make: false,
        only: false
    },
    app: {
        qualityPreset: 4,
        advancedQuality: "false",
        overwite: false,
        darkMode: false
    }
}



const qualityPresets = [
    // Low
    {
        jpg: {
            quality: 77
        },
        png: {
            qualityMin: 1,
            qualityMax: 75
        },
        webp: {
            quality: 70
        }
    },
    // Medium
    {
        jpg: {
            quality: 85
        },
        png: {
            qualityMin: 10,
            qualityMax: 85
        },
        webp: {
            quality: 88
        }
    },
    // High
    {
        jpg: {
            quality: 94
        },
        png: {
            qualityMin: 15,
            qualityMax: 95
        },
        webp: {
            quality: 92
        }
    },
    // Lossless-ish
    {
        jpg: {
            quality: 95
        },
        png: {
            qualityMin: 25,
            qualityMax: 98
        },
        webp: {
            quality: 95
        }
    },
]


var getSettings = function() {
    var encoded = localStorage.getItem("settings");
    var parsed = JSON.parse(encoded);
    var merged = Object.assign(defaultSettings, parsed);
    return merged;
}

function writeSettings() {
    var encoded = JSON.stringify(settings);
    localStorage.setItem("settings", encoded);
}

var settings = getSettings();


function updateSetting(setting, value) {
    var keys = setting.split(".");
    if(keys.length == 1)
        settings[keys[0]] = value;
    else if(keys.length == 2)
        settings[keys[0]][keys[1]] = value;
    else if(keys.length == 3)
        settings[keys[0]][keys[1]][keys[2]] = value;

    writeSettings();
}

function readAllInputSources() {
    $(".sidebar--section input").each(function(e) {
        var input = $(this);
        var settingKeys = input.attr("name").split(".");
        var arr = settings;
        for(var i = 0; i < settingKeys.length; i++) {
            arr = arr[settingKeys[i]];
        }
        $(this).val(arr);
    });
}
readAllInputSources()


function resyncAllInputs() {
    $("[data-linked]").each(function() {
        syncInput(this)        
    });
}
resyncAllInputs()



function toggleDarkMode(elem) {
    $("body").attr("data-theme", ($(elem).attr("data-value") == "true" ? "dark" : "light"))
}









$(".action--download-all").click(function(){
    var that = this;
    var formData = new FormData();
    var filesList = [];
    
    for(var i = 0; i < files.list.length; i++) {
        if(files.list[i].status == "done") {
            filesList.push({
                name: files.list[i].name,
                uuid: files.list[i].uuid
            });
        }
    }

    console.log(JSON.stringify(filesList))
    formData.append("files", JSON.stringify(filesList))

    $.ajax({
        type: "POST",
        url: "/zip",
        xhr: function () {
            var myXhr = $.ajaxSettings.xhr();
            //myXhr.upload.file = file;
            //myXhr.upload.callback = that.callback;
            //myXhr.upload.upload = that;
            if (myXhr.upload) {
                //myXhr.upload.addEventListener('progress', that.progressHandling, false);
            }
            return myXhr;
        },
        success: function (data) {
            console.log(data)
            window.location = data.dl
        },
        error: function (error) {
            console.log(error)
        },
        async: true,
        data: formData,
        cache: false,
        contentType: false,
        processData: false,
        timeout: 60000
    });
});



$(".action--recompress").click(function(){
    
    for(var i = 0; i < files.list.length; i++) {
        if(files.list[i].status == "done") {
            recrush(files.list[i])
        }
    }
    
});


$(".action--clear-all").click(clearAllFiles);

function clearAllFiles() {
    files.nextID = 0
    files.list = []
    $(".page--files--list").html("")
    $(".page--files").removeClass("show")
    updateTotals()
    showingList = false
}






function recrush(fileObj) {
    var that = this;
    var formData = new FormData();
    formData.append("uuid", fileObj.uuid);
    formData.append("settings", JSON.stringify(settings))


    fileObj.setStatus("crushing")

    $.ajax({
        type: "POST",
        url: "/recrush",
        xhr: function () {
            var myXhr = $.ajaxSettings.xhr();
            //myXhr.upload.file = file;
            //myXhr.upload.callback = that.callback;
            //myXhr.upload.upload = that;
            if (myXhr.upload) {
                //myXhr.upload.addEventListener('progress', that.progressHandling, false);
            }
            return myXhr;
        },
        success: function (data) {
            console.log(data)
            UploadedFileCallback(data, fileObj)
        },
        error: function (error) {
            console.log(error)
        },
        async: true,
        data: formData,
        cache: false,
        contentType: false,
        processData: false,
        timeout: 60000
    });
}








var menuItemID = -1;

$(".page--menu-layer .bg").click(function(e) {
    $(".elem--menu").removeClass("active")
})

$(".elem--menu.single-file .download").click(function(e) {
    window.location.href = files.list[files.menuItemID].url
    $(".elem--menu").removeClass("active")
})
$(".elem--menu.single-file .recrush").click(function(e) {
    recrush(files.list[files.menuItemID])
    $(".elem--menu").removeClass("active")
})
$(".elem--menu.single-file .remove").click(function(e) {
    $(".elem--file[data-id='" + files.menuItemID + "'").remove()
    files.list[files.menuItemID].setStatus("deleted")
    $(".elem--menu").removeClass("active")
})