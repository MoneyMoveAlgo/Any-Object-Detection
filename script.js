const pageLoader = document.querySelector('.page-loader')
const streamObjectsIdentifiedList = document.querySelector('.stream-objects-identified-list');
const videoObjectsIdentifiedList = document.querySelector('.video-objects-identified-list');
const minAccuracyInput = document.querySelector('#min-accuracy');
const enableWebcamButton = document.getElementById('webcamButton');

const videoPlayerDemoBtn = document.getElementById('demo-video-player-btn');
const videoPlayer = document.getElementById('video-player');
let minAccuracy = minAccuracyInput.value;

function handleAccuracyChange(e) {
    console.log(e.target.value);
    minAccuracy = e.target.value;
}

// ok

minAccuracyInput.addEventListener('click', handleAccuracyChange);

var model = undefined;

// Before we can use COCO-SSD class we must wait for it to finish
// loading. Machine Learning models can be large and take a moment to
// get everything needed to run.

cocoSsd.load().then(function (loadedModel) {
    model = loadedModel;
    // Show demo section now model is ready to use.
    console.log(pageLoader);
    pageLoader.style.display = 'none';
});




const video = document.getElementById('webcam');
const liveView = document.getElementById('liveView');
const liveView2 = document.getElementById('liveView2');

// Check if webcam access is supported.
function hasGetUserMedia() {
    return !!(navigator.mediaDevices &&
        navigator.mediaDevices.getUserMedia);
}

// Keep a reference of all the child elements we create
// so we can remove them easilly on each render.
var children = [];


// If webcam supported, add event listener to button for when user
// wants to activate it.
if (hasGetUserMedia()) {
    enableWebcamButton.addEventListener('click', enableCam);
} else {
    console.warn('getUserMedia() is not supported by your browser');
}


let requestId = undefined;
let streaming = false;
// Enable the live webcam view and start classification.
function enableCam(event) {
    if (!model) {
        console.log('Wait! Model not loaded yet.')
        return;
    }

    if (video.srcObject !== null) {
        event.target.textContent = 'Enable Webcam';
        clearStream();
    } else {
        event.target.textContent = 'Stop Streaming';

        // getUsermedia parameters.
        const constraints = {
            video: true
        };

        // Activate the webcam stream.
        navigator.mediaDevices.getUserMedia(constraints).then(function (stream) {
            console.log(stream)
            video.srcObject = stream;
            console.log("vid", video);
            video.addEventListener('loadeddata', () => predictWebcam(video, liveView, streamObjectsIdentifiedList));
        });
    }


}

console.log(video);

let objectsSet = new Set();

function predictWebcam(videoElement, parentView, objectList) {
    // Now let's start classifying the stream.
    model.detect(videoElement).then(function (predictions) {
        // Remove any highlighting we did previous frame.
        for (let i = 0; i < children.length; i++) {
            parentView.removeChild(children[i]);
        }
        children.splice(0);

        let currentSet = new Set();
        let currentMap = new Map();

        // they have a high confidence score.
        for (let n = 0; n < predictions.length; n++) {

            const scoreNice = Math.round(parseFloat(predictions[n].score) * 100)

            // If we are over 66% sure we are sure we classified it right, draw it!
            let predClassUpdated = undefined;
            if (scoreNice >= minAccuracy) {
                const predClass = predictions[n].class;
                if (currentSet.has(predClass)) {
                    predClassUpdated = `${predClass} - ${currentMap.get(predClass)}`
                    currentMap.set(predClass, currentMap.get(predClass) + 1);
                    currentSet.add(predClassUpdated);
                } else {
                    currentSet.add(predClass);
                    currentMap.set(predClass, 1);
                }


                // console.log(predictions[n]);
                const p = document.createElement('p');
                p.innerText = predictions[n].class + ' - with ' +
                    Math.round(parseFloat(predictions[n].score) * 100) +
                    '% confidence.';
                // Draw in top left of bounding box outline.
                p.style = 'left: ' + predictions[n].bbox[0] + 'px;' +
                    'top: ' + predictions[n].bbox[1] + 'px;' +
                    'width: ' + (predictions[n].bbox[2] - 10) + 'px;';

                // Draw the actual bounding box.
                const highlighter = document.createElement('div');
                highlighter.setAttribute('class', 'highlighter');
                highlighter.style = 'left: ' + predictions[n].bbox[0] + 'px; top: ' +
                    predictions[n].bbox[1] + 'px; width: ' +
                    predictions[n].bbox[2] + 'px; height: ' +
                    predictions[n].bbox[3] + 'px;';

                const score = predictions[n].score;
                
              let background = 'green';
              
                if (score <= 0.3) {
                    highlighter.style.background = 'rgba(255, 0, 0, 0.4)';
                    highlighter.style.borderColor = 'rgba(255, 0, 0, 0.4)';
                  background = 'rgba(255, 0, 0, 0.4)'
                } else if (score <= 0.5) {
                    highlighter.style.background = 'rgba(3, 169, 244, 0.4)';
                    background = 'rgba(3, 169, 244, 0.4)'

                } else if (score <= 0.75) {
                    highlighter.style.background = 'rgba(63, 81, 181, 0.3)';
                    background = 'rgba(63, 81, 181, 0.3)'

                } else {
                    highlighter.style.background = 'rgba(76, 175, 80, 0.3)';
                    highlighter.style.borderColor = 'rgba(76, 175, 80, 0.6)';
                    p.style.background = `rgba(76, 175, 80, 0.8)`
                    p.style.borderColor = `rgba(76, 175, 80, 0.6)`
                    background = 'rgba(76, 175, 80, 0.6)';
                }


                if (predClassUpdated !== undefined && !objectsSet.has(predClassUpdated)) {
                    const li = document.createElement('li');
                    li.textContent = `${predClassUpdated} - Acurracy Rate of ${scoreNice}%`;
                    li.classList.add('object-identified-li')

                    objectList.append(li);
                    objectsSet.add(predClassUpdated);
                    li.style.background = background;
                } else if (predClass !== undefined && !objectsSet.has(predClass)) {
                    const li = document.createElement('li');
                    li.classList.add('object-identified-li')
                    li.textContent = `${predClass} - Acurracy Rate of ${scoreNice}%`;
                    objectList.append(li);
                    objectsSet.add(predClass);
                    li.style.background = background;

                }


                parentView.appendChild(highlighter);
                parentView.appendChild(p);

                // Store drawn objects in memory so we can delete them next time around.
                children.push(highlighter);
                children.push(p);
            }

        }

        // Call this function again to keep predicting when the browser is ready.
        requestId = window.requestAnimationFrame(() => predictWebcam(videoElement, parentView, objectList));
    });
}


videoPlayer.onplay = (e) => {
    console.log('on play');
    video.srcObject = null;
    for (let i = 0; i < children.length; i++) {
        liveView.removeChild(children[i]);
    }
    children.splice(0);
    if (requestId !== undefined) {
        window.cancelAnimationFrame(requestId);
    }
    videoPlayer.onplaying = () => {
        setTimeout(() => {
            console.log('starting');
            predictWebcam(videoPlayer, liveView2, videoObjectsIdentifiedList);
        }, 500);
        videoPlayer.onended = () => {
            if (requestId !== undefined) {
                window.cancelAnimationFrame(requestId);
            }
        }
        videoPlayer.onpause = () => {
            if (requestId !== undefined) {
                window.cancelAnimationFrame(requestId);
            }
        }
    }
}

videoPlayerDemoBtn.addEventListener('click', () => {
    video.srcObject = null;
    for (let i = 0; i < children.length; i++) {
        liveView.removeChild(children[i]);
    }
    children.splice(0);
    if (requestId !== undefined) {
        window.cancelAnimationFrame(requestId);
    }
      var source = videoPlayer.querySelector('source');
      source.setAttribute('src', "https://static.videezy.com/system/resources/previews/000/008/452/original/Dark_Haired_Girl_Pensive_Looks_at_Camera.mp4");
      source.setAttribute('type', 'video/mp4');
      videoPlayer.load();
    
})



document.getElementById("defaultOpen").click();


function openTab(evt, tabName) {
    // Declare all variables
    var i, tabcontent, tablinks;

    // Get all elements with class="tabcontent" and hide them
    tabcontent = document.getElementsByClassName("tabcontent");
    for (i = 0; i < tabcontent.length; i++) {
        tabcontent[i].style.display = "none";
    }

    // Get all elements with class="tablinks" and remove the class "active"
    tablinks = document.getElementsByClassName("tablinks");
    for (i = 0; i < tablinks.length; i++) {
        tablinks[i].className = tablinks[i].className.replace(" active", "");
    }

    if (tabName !== 'streamer-container') {
        clearStream();
    }
    // Show the current tab, and add an "active" class to the button that opened the tab
    document.getElementById(tabName).style.display = "block";
    evt.currentTarget.className += " active";
}






function clearStream() {
    if (requestId !== undefined) {
        window.cancelAnimationFrame(requestId);
    }
    video.srcObject = null;
    enableWebcamButton.classList.remove('removed');

    for (let i = 0; i < children.length; i++) {
        children[i].parentElement.removeChild(children[i]);
    }
    children.splice(0);
}


const fileInputs = document.querySelectorAll('.file-input');
fileInputs.forEach(input => {
  input.onchange = async (e) => {
    const [file] = input.files;
    if (file) {
          const parent = input.parentElement;
          const imgContainer = parent.querySelector('.image-upload');
          const children = [...imgContainer.children];
          children.forEach(child => {
            const tagName = child.tagName.toLowerCase();
                        console.log(tagName);

            if (tagName === 'img') {
              return;
            }
            imgContainer.removeChild(child);
          })
          
          const img = parent.querySelector('img');
          img.src = URL.createObjectURL(file);
          img.style.display = "block";
      await new Promise(res => {
        setTimeout(res, 1000);
      })
      
      model.detect(img).then(function (predictions) {
    // Lets write the predictions to a new paragraph element and
    // add it to the DOM.
    // console.log(predictions);
        console.log(predictions);
    for (let n = 0; n < predictions.length; n++) {
      // Description text
      const p = document.createElement('p');
      // console.log(predictions[n]);
      p.innerText = predictions[n].class  + ' - with ' 
          + Math.round(parseFloat(predictions[n].score) * 100) 
          + '% confidence.';
      // Positioned at the top left of the bounding box.
      // Height is whatever the text takes up.
      // Width subtracts text padding in CSS so fits perfectly.
      
      p.classList.add('prediction-text')
      p.style = 'left: ' + predictions[n].bbox[0] + 'px;' + 
          'top: ' + predictions[n].bbox[1] + 'px; ' + 
          'width: ' + (predictions[n].bbox[2] - 10) + 'px;';

      const highlighter = document.createElement('div');
      highlighter.setAttribute('class', 'highlighter');
      highlighter.style = 'left: ' + predictions[n].bbox[0] + 'px;' +
          'top: ' + predictions[n].bbox[1] + 'px;' +
          'width: ' + predictions[n].bbox[2] + 'px;' +
          'height: ' + predictions[n].bbox[3] + 'px;';

      imgContainer.appendChild(highlighter);
      imgContainer.appendChild(p);
    }
  });
    }
  }
})


document.querySelectorAll('.upload-img-btn').forEach(btn => {
  btn.addEventListener('click', (e) => {
    btn.nextElementSibling.click();
  })
})


const uploadVideoBtn = document.querySelector('.upload-video-btn');
console.log('videoBtn', uploadVideoBtn)
uploadVideoBtn.addEventListener('click', (e) => {
  console.log("Target", e);
  e.target.nextElementSibling.click();
});

const videoFileInput = document.querySelector('.video-file-input');

videoFileInput.onchange = async (e) => {
  const [file] = videoFileInput.files;
  console.log(file);
  
  var source = videoPlayer.querySelector('source');
  const url = URL.createObjectURL(file)
  source.setAttribute('src', url);
  source.setAttribute('type', 'video/mp4');
  videoPlayer.load();
}