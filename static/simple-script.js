// Simple script with just core functionality
document.addEventListener('DOMContentLoaded', function() {
    console.log('Simple script loaded');
    
    // Get UI elements
    const providedSentenceBtn = document.getElementById('providedSentenceBtn');
    const speakFreelyBtn = document.getElementById('speakFreelyBtn');
    const providedSentenceSection = document.getElementById('providedSentenceSection');
    const speakFreelySection = document.getElementById('speakFreelySection');
    const recordButton = document.getElementById('recordButton');
    const newSentenceButton = document.getElementById('newSentenceButton');
    const recordingStatus = document.getElementById('recordingStatus');
    const timer = document.getElementById('timer');
    const loadingOverlay = document.getElementById('loadingOverlay');
    
    // Results screen elements
    const recordingScreen = document.getElementById('recordingScreen');
    const resultsScreen = document.getElementById('resultsScreen');
    const spectrogramImage = document.getElementById('spectrogramImage');
    const accentResult = document.getElementById('accentResult');
    const accentName = document.getElementById('accentName');
    const confidenceBar = document.getElementById('confidenceBar');
    const confidenceValue = document.getElementById('confidenceValue');
    const recordingPlayback = document.getElementById('recordingPlayback');
    const tryAgainButton = document.getElementById('tryAgainButton');
    const toggleSpectrogramButton = document.getElementById('toggleSpectrogram');
    
    // Feedback elements
    const correctButton = document.getElementById('correctButton');
    const wrongButton = document.getElementById('wrongButton');
    const feedbackModal = document.getElementById('feedbackModal');
    const accentOptions = document.getElementById('accentOptions');
    const closeModalButton = document.getElementById('closeModal');
    const submitFeedbackButton = document.getElementById('submitFeedback');
    const cancelFeedbackButton = document.getElementById('cancelFeedback');
    
    // Sample sentences
    const sentences = [
        "The quick brown fox jumps over the lazy dog.",
        "She sells seashells by the seashore.",
        "How much wood would a woodchuck chuck if a woodchuck could chuck wood?",
        "Peter Piper picked a peck of pickled peppers.",
        "I scream, you scream, we all scream for ice cream.",
        "A brisk wind swept across the quiet valley.",
        "The early bird catches the worm, but the second mouse gets the cheese.",
        "All that glitters is not gold; all who wander are not lost.",
        "The rain in Spain stays mainly in the plain.",
        "Be yourself; everyone else is already taken.",
        "To be or not to be, that is the question.",
        "Life is what happens when you're busy making other plans.",
        "The way to get started is to quit talking and begin doing.",
        "In three words I can sum up everything I've learned about life: it goes on.",
        "If you tell the truth, you don't have to remember anything.",
        "The only impossible journey is the one you never begin.",
        "The best way to predict the future is to create it.",
        "It is never too late to be what you might have been.",
        "The purpose of our lives is to be happy.",
        "Life is really simple, but we insist on making it complicated."
    ];
    
    // Track state
    let isRecording = false;
    let mediaRecorder = null;
    let audioChunks = [];
    let audioBlob = null;
    let timerInterval = null;
    let seconds = 0;
    let currentSentence = '';
    let speechRecognition = null; // For live transcription
    let currentTranscript = ''; // To store live transcript
    let predictedAccent = ''; // Track predicted accent
    let selectedActualAccent = ''; // Track actual accent selected by user
    let availableAccents = []; // Store available accents from the model
    let currentAudioId = ''; // Track audio ID for feedback
    
    // Function to switch between modes
    function switchMode(mode) {
        console.log('Switching to mode:', mode);
        
        // Reset button states
        providedSentenceBtn.classList.remove('active');
        speakFreelyBtn.classList.remove('active');
        
        if (mode === 'provided') {
            providedSentenceBtn.classList.add('active');
            providedSentenceSection.style.display = 'block';
            speakFreelySection.style.display = 'none';
        } else {
            speakFreelyBtn.classList.add('active');
            speakFreelySection.style.display = 'block';
            providedSentenceSection.style.display = 'none';
        }
    }
    
    // Function to get random sentence
    function getRandomSentence() {
        return sentences[Math.floor(Math.random() * sentences.length)];
    }
    
    // Function to update the practice sentence
    function updateSentence() {
        const practiceSentence = document.getElementById('practiceSentence');
        if (practiceSentence) {
            const newSentence = getRandomSentence();
            practiceSentence.textContent = newSentence;
            currentSentence = newSentence;
            console.log('Updated current sentence:', currentSentence);
            
            // Also update the sentence in localStorage for persistence
            try {
                localStorage.setItem('currentPracticeSentence', currentSentence);
            } catch (e) {
                console.error('Error saving sentence to localStorage:', e);
            }
        } else {
            console.log('practiceSentence element not found');
        }
    }
    
    // Function to load the last sentence if available
    function loadSavedSentence() {
        try {
            const savedSentence = localStorage.getItem('currentPracticeSentence');
            if (savedSentence) {
                const practiceSentence = document.getElementById('practiceSentence');
                if (practiceSentence) {
                    practiceSentence.textContent = savedSentence;
                    currentSentence = savedSentence;
                    console.log('Loaded saved sentence:', currentSentence);
                }
            } else {
                // No saved sentence, generate a new one
                updateSentence();
            }
        } catch (e) {
            console.error('Error loading saved sentence:', e);
            updateSentence();
        }
    }
    
    // Timer functions
    function formatTime(seconds) {
        const mins = Math.floor(seconds / 60);
        const secs = seconds % 60;
        return `${mins.toString().padStart(2, '0')}:${secs.toString().padStart(2, '0')}`;
    }
    
    function updateTimer() {
        seconds++;
        if (timer) {
            timer.textContent = formatTime(seconds);
        }
    }
    
    // Initialize speech recognition if available
    function initSpeechRecognition() {
        // Check if browser supports speech recognition
        if ('SpeechRecognition' in window || 'webkitSpeechRecognition' in window) {
            const SpeechRecognition = window.SpeechRecognition || window.webkitSpeechRecognition;
            speechRecognition = new SpeechRecognition();
            
            // Configure speech recognition
            speechRecognition.continuous = true;
            speechRecognition.interimResults = true;
            speechRecognition.lang = 'en-US';
            
            // Set up event handlers
            speechRecognition.onresult = function(event) {
                let interimTranscript = '';
                let finalTranscript = '';
                
                // Process results
                for (let i = event.resultIndex; i < event.results.length; i++) {
                    const transcript = event.results[i][0].transcript;
                    if (event.results[i].isFinal) {
                        finalTranscript += transcript;
                    } else {
                        interimTranscript += transcript;
                    }
                }
                
                // Update the transcript (either final or interim)
                currentTranscript = finalTranscript || interimTranscript;
                
                // Show live transcript if speaking freely
                if (!providedSentenceBtn.classList.contains('active')) {
                    updateLiveTranscript(currentTranscript);
                }
            };
            
            speechRecognition.onerror = function(event) {
                console.error('Speech recognition error:', event.error);
            };
            
            console.log('Speech recognition initialized');
        } else {
            console.warn('Speech recognition not supported in this browser');
        }
    }
    
    // Update the live transcript display
    function updateLiveTranscript(text) {
        const transcriptText = document.getElementById('transcriptText');
        const transcriptContainer = document.getElementById('transcriptContainer');
        
        if (transcriptText && transcriptContainer) {
            transcriptContainer.style.display = 'block';
            transcriptText.textContent = text || "Listening...";
        }
    }
    
    // Start recording function
    function startRecording() {
        console.log('Starting recording...');
        
        // Update UI
        recordButton.innerHTML = '<span class="record-icon recording"></span>Stop Recording';
        recordButton.classList.add('recording');
        if (recordingStatus) recordingStatus.textContent = 'Requesting microphone access...';
        if (timer) timer.style.display = 'block';
        
        // Reset timer
        seconds = 0;
        if (timer) timer.textContent = '00:00';
        timerInterval = setInterval(updateTimer, 1000);
        
        // Get current sentence if in provided mode
        if (providedSentenceBtn.classList.contains('active')) {
            const practiceSentence = document.getElementById('practiceSentence');
            if (practiceSentence) {
                currentSentence = practiceSentence.textContent;
                // Display the sentence in the transcript container right away
                updateLiveTranscript(currentSentence);
            }
        } else {
            // If in free speech mode, clear transcript and set to listening
            updateLiveTranscript("Listening...");
            
            // Start speech recognition for live transcription
            if (speechRecognition) {
                try {
                    currentTranscript = '';
                    speechRecognition.start();
                    console.log('Speech recognition started');
                } catch (e) {
                    console.error('Error starting speech recognition:', e);
                }
            }
        }
        
        // Start recording
        navigator.mediaDevices.getUserMedia({ audio: true })
            .then(stream => {
                console.log('Microphone access granted');
                mediaRecorder = new MediaRecorder(stream);
                audioChunks = [];
                
                mediaRecorder.ondataavailable = (event) => {
                    audioChunks.push(event.data);
                };
                
                mediaRecorder.onstop = () => {
                    console.log('Media recorder stopped');
                    audioBlob = new Blob(audioChunks, { type: 'audio/wav' });
                    sendAudioForAnalysis(audioBlob);
                    
                    // Stop all tracks on the stream
                    stream.getTracks().forEach(track => track.stop());
                };
                
                mediaRecorder.start();
                if (recordingStatus) recordingStatus.textContent = 'Recording in progress...';
                isRecording = true;
            })
            .catch(error => {
                console.error('Error accessing microphone:', error);
                if (recordingStatus) recordingStatus.textContent = 'Error: ' + error.message;
                stopRecording(false);
            });
    }
    
    // Stop recording function
    function stopRecording(sendData = true) {
        console.log('Stopping recording...');
        
        // Update UI
        recordButton.innerHTML = '<span class="record-icon"></span>Start Recording';
        recordButton.classList.remove('recording');
        isRecording = false;
        
        // Stop timer
        clearInterval(timerInterval);
        
        // Stop speech recognition if active
        if (speechRecognition) {
            try {
                speechRecognition.stop();
                console.log('Speech recognition stopped');
            } catch (e) {
                console.error('Error stopping speech recognition:', e);
            }
        }
        
        // Stop recording if active
        if (mediaRecorder && mediaRecorder.state !== 'inactive' && sendData) {
            if (recordingStatus) recordingStatus.textContent = 'Processing audio...';
            mediaRecorder.stop();
        } else {
            // Reset if not sending data
            audioChunks = [];
            if (recordingStatus) recordingStatus.textContent = '';
        }
    }
    
    // Send audio to server for analysis
    function sendAudioForAnalysis(audioBlob) {
        if (!audioBlob) {
            console.error('No audio to analyze');
            return;
        }
        
        // Show loading overlay
        if (loadingOverlay) loadingOverlay.style.display = 'flex';
        
        // Create form data
        const formData = new FormData();
        formData.append('audio', audioBlob);
        
        // Add the mode parameter (provided or freely) to help the server
        // generate the appropriate transcript
        const mode = providedSentenceBtn.classList.contains('active') ? 'provided' : 'free';
        formData.append('mode', mode);
        console.log('Sending audio for analysis with mode:', mode);
        
        // Send to server
        fetch('/analyze', {
            method: 'POST',
            body: formData
        })
        .then(response => {
            if (!response.ok) {
                throw new Error(`Server error: ${response.status}`);
            }
            return response.json();
        })
        .then(data => {
            console.log('Analysis results:', data);
            displayResults(data, audioBlob);
        })
        .catch(error => {
            console.error('Error analyzing audio:', error);
            if (recordingStatus) recordingStatus.textContent = 'Error: ' + error.message;
        })
        .finally(() => {
            // Hide loading overlay
            if (loadingOverlay) loadingOverlay.style.display = 'none';
        });
    }
    
    // Display results
    function displayResults(data, audioBlob) {
        console.log('Displaying results:', data);
        
        // Store data for feedback
        if (data.accent) {
            predictedAccent = data.accent;
        }
        
        // Generate a unique ID for this audio submission
        currentAudioId = generateUniqueId();
        
        // Set accent information
        if (accentResult) {
            accentResult.innerHTML = `
                <div class="accent-icon">
                    <i class="fas fa-globe-americas"></i>
                </div>
                <div class="accent-text">
                    <span>${data.accent || 'Unknown'}</span>
                </div>
            `;
        }
        
        // Set the accent name in the description
        if (accentName) {
            accentName.textContent = data.accent || 'Unknown';
        }
        
        // Set confidence meter
        if (confidenceBar && confidenceValue) {
            const confidence = parseFloat(data.confidence) || 0;
            confidenceBar.style.width = `${Math.min(100, confidence)}%`;
            confidenceValue.textContent = `${Math.round(confidence)}%`;
            
            // Add color based on confidence
            confidenceBar.className = 'accuracy-fill';
            if (confidence < 40) {
                confidenceBar.classList.add('low');
            } else if (confidence < 70) {
                confidenceBar.classList.add('medium');
            } else {
                confidenceBar.classList.add('high');
            }
        }
        
        // Set spectrogram
        if (spectrogramImage && data.spectrogram) {
            spectrogramImage.src = `data:image/png;base64,${data.spectrogram}`;
        }
        
        // Set audio playback
        if (recordingPlayback && audioBlob) {
            const audioUrl = URL.createObjectURL(audioBlob);
            recordingPlayback.src = audioUrl;
        }
        
        // Handle transcript based on which mode was used
        const transcriptText = document.getElementById('transcriptText');
        const transcriptContainer = document.getElementById('transcriptContainer');
        
        if (transcriptText && transcriptContainer) {
            // Ensure the container is visible
            transcriptContainer.style.display = 'block';
            
            if (providedSentenceBtn.classList.contains('active')) {
                // CASE 1: User was reading a provided sentence
                // Always use the exact sentence that was displayed to the user
                if (currentSentence && currentSentence.trim() !== '') {
                    transcriptText.textContent = currentSentence;
                    console.log('Using provided sentence as transcript:', currentSentence);
                } else {
                    // Fallback if somehow we lost the current sentence
                    const practiceSentence = document.getElementById('practiceSentence');
                    if (practiceSentence && practiceSentence.textContent) {
                        transcriptText.textContent = practiceSentence.textContent;
                        console.log('Falling back to current practice sentence displayed on screen');
                    } else {
                        transcriptText.textContent = "A practice sentence was provided for you to read.";
                        console.error('Could not find the practice sentence');
                    }
                }
            } else {
                // CASE 2: User was speaking freely
                // Use the live transcript we collected during recording
                if (currentTranscript && currentTranscript.trim() !== '') {
                    transcriptText.textContent = currentTranscript;
                    console.log('Using live transcript from speech recognition:', currentTranscript);
                }
                // Only use server transcript as fallback if we don't have a live one
                else if (data.transcript && data.transcript.trim() !== '') {
                    transcriptText.textContent = data.transcript;
                    console.log('Falling back to server transcript:', data.transcript);
                } else {
                    // Fallback if no transcript is available
                    transcriptText.textContent = "Your natural speech has been analyzed for accent patterns.";
                    console.log('No transcript available');
                }
            }
        } else {
            console.error('Transcript elements not found in the DOM');
        }
        
        // Show results screen
        if (recordingScreen) recordingScreen.style.display = 'none';
        if (resultsScreen) resultsScreen.style.display = 'block';
    }
    
    // Reset app
    function resetApp() {
        // Reset recording state
        isRecording = false;
        audioChunks = [];
        audioBlob = null;
        
        // Reset UI
        if (recordingScreen) recordingScreen.style.display = 'flex';
        if (resultsScreen) resultsScreen.style.display = 'none';
        if (recordingStatus) recordingStatus.textContent = '';
        if (timer) {
            timer.style.display = 'none';
            timer.textContent = '00:00';
        }
        seconds = 0;
        
        // Clear interval just in case
        clearInterval(timerInterval);
        
        // Update sentence
        updateSentence();
    }
    
    // Toggle spectrogram fullscreen view
    function toggleSpectrogramZoom() {
        console.log('Toggling spectrogram zoom');
        
        // Get the spectrogram container
        const spectrogramVisual = document.getElementById('spectrogramVisual');
        if (!spectrogramVisual) return;
        
        if (!document.getElementById('spectrogramZoomOverlay')) {
            // Create fullscreen overlay if it doesn't exist
            const overlay = document.createElement('div');
            overlay.id = 'spectrogramZoomOverlay';
            overlay.className = 'spectrogram-zoom-overlay';
            overlay.innerHTML = `
                <div class="zoom-container">
                    <img src="${spectrogramImage.src}" alt="Voice Visualization" class="zoomed-spectrogram">
                    <button class="close-zoom-button">
                        <i class="fas fa-times"></i>
                    </button>
                </div>
            `;
            document.body.appendChild(overlay);
            
            // Add styles if not already added
            if (!document.getElementById('spectrogramZoomStyles')) {
                const style = document.createElement('style');
                style.id = 'spectrogramZoomStyles';
                style.innerHTML = `
                    .spectrogram-zoom-overlay {
                        position: fixed;
                        top: 0;
                        left: 0;
                        width: 100%;
                        height: 100%;
                        background-color: rgba(0, 0, 0, 0.85);
                        z-index: 9999;
                        display: flex;
                        align-items: center;
                        justify-content: center;
                        animation: fadeIn 0.3s ease;
                    }
                    .zoom-container {
                        position: relative;
                        max-width: 90%;
                        max-height: 90%;
                    }
                    .zoomed-spectrogram {
                        max-width: 100%;
                        max-height: 80vh;
                        border-radius: 8px;
                        box-shadow: 0 0 30px rgba(138, 43, 226, 0.6);
                    }
                    .close-zoom-button {
                        position: absolute;
                        top: -20px;
                        right: -20px;
                        background-color: rgba(0, 0, 0, 0.7);
                        color: white;
                        border: none;
                        border-radius: 50%;
                        width: 40px;
                        height: 40px;
                        cursor: pointer;
                        font-size: 20px;
                        display: flex;
                        align-items: center;
                        justify-content: center;
                        transition: all 0.2s ease;
                    }
                    .close-zoom-button:hover {
                        background-color: rgba(138, 43, 226, 0.8);
                        transform: scale(1.1);
                    }
                    @keyframes fadeIn {
                        from { opacity: 0; }
                        to { opacity: 1; }
                    }
                `;
                document.head.appendChild(style);
            }
            
            // Add event listener to close button
            const closeButton = overlay.querySelector('.close-zoom-button');
            if (closeButton) {
                closeButton.addEventListener('click', function() {
                    document.body.removeChild(overlay);
                });
            }
            
            // Also close on overlay click
            overlay.addEventListener('click', function(e) {
                if (e.target === overlay) {
                    document.body.removeChild(overlay);
                }
            });
        } else {
            // Remove overlay if it exists
            const overlay = document.getElementById('spectrogramZoomOverlay');
            if (overlay) {
                document.body.removeChild(overlay);
            }
        }
    }
    
    // Generate a unique ID for audio submissions
    function generateUniqueId() {
        return Date.now().toString(36) + Math.random().toString(36).substring(2);
    }
    
    // Feedback functions
    function setupFeedbackHandlers() {
        // Handle "Correct Analysis" button
        if (correctButton) {
            correctButton.addEventListener('click', function() {
                sendFeedback('correct', predictedAccent, predictedAccent);
                showFeedbackConfirmation('Thank you for your feedback!');
            });
        }
        
        // Handle "Needs Improvement" button
        if (wrongButton) {
            wrongButton.addEventListener('click', function() {
                // Load available accents and open modal
                fetchAvailableAccents().then(() => {
                    openFeedbackModal();
                });
            });
        }
        
        // Close modal on X button click
        if (closeModalButton) {
            closeModalButton.addEventListener('click', closeFeedbackModal);
        }
        
        // Close modal on cancel button click
        if (cancelFeedbackButton) {
            cancelFeedbackButton.addEventListener('click', closeFeedbackModal);
        }
        
        // Handle submit feedback button
        if (submitFeedbackButton) {
            submitFeedbackButton.addEventListener('click', function() {
                if (selectedActualAccent) {
                    sendFeedback('incorrect', predictedAccent, selectedActualAccent);
                    closeFeedbackModal();
                    showFeedbackConfirmation('Thank you for your feedback!');
                } else {
                    alert('Please select your actual accent');
                }
            });
        }
    }
    
    // Function to fetch available accents from the model
    function fetchAvailableAccents() {
        return fetch('/api/accents')
            .then(response => {
                if (!response.ok) {
                    // If the endpoint doesn't exist, use default accents
                    console.warn('API endpoint for accents not available, using default list');
                    availableAccents = [
                        'American English', 'British English', 'South Asian English',
                        'Canadian English', 'German English', 'Australian English',
                        'Southern African English', 'Scottish English', 'New Zealand English',
                        'Filipino English', 'Hong Kong English'
                    ];
                    return null;
                }
                return response.json();
            })
            .then(data => {
                if (data && data.accents) {
                    availableAccents = data.accents;
                }
                return availableAccents;
            })
            .catch(error => {
                console.error('Error fetching available accents:', error);
                // Fallback to default accent list
                availableAccents = [
                    'American English', 'British English', 'South Asian English',
                    'Canadian English', 'German English', 'Australian English',
                    'Southern African English', 'Scottish English', 'New Zealand English',
                    'Filipino English', 'Hong Kong English'
                ];
                return availableAccents;
            });
    }
    
    // Open feedback modal and populate accent options
    function openFeedbackModal() {
        if (accentOptions) {
            // Clear previous options
            accentOptions.innerHTML = '';
            selectedActualAccent = '';
            
            // Populate accent options
            availableAccents.forEach(accent => {
                const option = document.createElement('div');
                option.className = 'accent-option';
                option.dataset.accent = accent;
                option.textContent = accent;
                
                // Mark as selected if clicked
                option.addEventListener('click', function() {
                    // Remove selected class from all options
                    document.querySelectorAll('.accent-option').forEach(opt => {
                        opt.classList.remove('selected');
                    });
                    
                    // Add selected class to clicked option
                    option.classList.add('selected');
                    selectedActualAccent = accent;
                });
                
                accentOptions.appendChild(option);
            });
        }
        
        // Show modal
        if (feedbackModal) {
            feedbackModal.style.display = 'flex';
        }
    }
    
    // Close feedback modal
    function closeFeedbackModal() {
        if (feedbackModal) {
            feedbackModal.style.display = 'none';
        }
    }
    
    // Send feedback to server
    function sendFeedback(feedbackType, predictedAccent, actualAccent) {
        const feedbackData = {
            feedback_type: feedbackType,
            predicted_accent: predictedAccent,
            actual_accent: actualAccent,
            audio_id: currentAudioId
        };
        
        fetch('/feedback', {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json'
            },
            body: JSON.stringify(feedbackData)
        })
        .then(response => response.json())
        .then(data => {
            console.log('Feedback submitted successfully:', data);
        })
        .catch(error => {
            console.error('Error submitting feedback:', error);
        });
    }
    
    // Show a confirmation message after feedback
    function showFeedbackConfirmation(message) {
        // Simple alert for now, could be enhanced with a toast notification
        alert(message);
    }
    
    // Initialize app
    function initializeApp() {
        console.log('Initializing app');
        
        // Load saved sentence or generate new one
        loadSavedSentence();
        
        // Set up event listeners for mode switching
        providedSentenceBtn.addEventListener('click', () => switchMode('provided'));
        speakFreelyBtn.addEventListener('click', () => switchMode('free'));
        
        // Set up new sentence button
        newSentenceButton.addEventListener('click', updateSentence);
        
        // Set up record button
        recordButton.addEventListener('click', () => {
            if (!isRecording) {
                startRecording();
            } else {
                stopRecording();
            }
        });
        
        // Set up try again button
        tryAgainButton.addEventListener('click', resetApp);
        
        // Set up spectrogram toggle
        toggleSpectrogramButton.addEventListener('click', toggleSpectrogramZoom);
        
        // Set up feedback handlers
        setupFeedbackHandlers();
        
        // Initialize speech recognition if available
        initSpeechRecognition();
        
        console.log('App initialization complete');
    }
    
    // Initialize the app
    initializeApp();
}); 