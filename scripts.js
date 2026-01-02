class MoodPredictor {
    constructor() {
        this.video = document.getElementById('video');
        this.moodResult = document.getElementById('mood-result');
        this.loading = document.getElementById('loading');
        this.isDetecting = false;
        this.modelsLoaded = false;
        
        this.init();
    }
    
    async init() {
        try {
            this.loading.textContent = 'Requesting camera access...';
            await this.setupCamera();
            this.loading.textContent = 'Loading AI models...';
            await this.loadModels();
            this.loading.textContent = 'AI Ready - Analyzing your mood...';
            setTimeout(() => {
                this.loading.style.display = 'none';
                this.startDetection();
            }, 1000);
        } catch (error) {
            console.error('Initialization error:', error);
            this.showError(error.message);
        }
    }
    
    async setupCamera() {
        try {

            const stream = await navigator.mediaDevices.getUserMedia({
                video: true
            });
            this.video.srcObject = stream;
            
            return new Promise((resolve) => {
                this.video.onloadedmetadata = () => {
                    this.video.play();
                    resolve();
                };
            });
        } catch (error) {

            try {
                const stream = await navigator.mediaDevices.getUserMedia({ video: {} });
                this.video.srcObject = stream;
                return new Promise((resolve) => {
                    this.video.onloadedmetadata = () => {
                        this.video.play();
                        resolve();
                    };
                });
            } catch (fallbackError) {
                throw new Error('Camera access denied or not available. Please allow camera access and refresh the page.');
            }
        }
    }
    
    async loadModels() {
        try {
            // Load face-api.js models
            const MODEL_URL = 'https://cdn.jsdelivr.net/npm/@vladmandic/face-api@latest/model/';
            
            await Promise.all([
                faceapi.nets.tinyFaceDetector.loadFromUri(MODEL_URL),
                faceapi.nets.faceLandmark68Net.loadFromUri(MODEL_URL),
                faceapi.nets.faceRecognitionNet.loadFromUri(MODEL_URL),
                faceapi.nets.faceExpressionNet.loadFromUri(MODEL_URL)
            ]);
            
            this.modelsLoaded = true;
        } catch (error) {
            throw new Error('Failed to load AI models. Please check your internet connection.');
        }
    }
    
    async detectMood() {
        if (!this.modelsLoaded || this.isDetecting) return;
        
        this.isDetecting = true;
        
        try {
            const detections = await faceapi
                .detectAllFaces(this.video, new faceapi.TinyFaceDetectorOptions())
                .withFaceLandmarks()
                .withFaceExpressions();
            
            if (detections.length > 0) {
                const expressions = detections[0].expressions;
                const mood = this.getMoodFromExpressions(expressions);
                this.displayMood(mood);
            } else {
                this.moodResult.innerHTML = 'No face detected';
            }
        } catch (error) {
            console.error('Detection error:', error);
            this.moodResult.innerHTML = 'Detection error';
        }
        
        this.isDetecting = false;
    }
    
    getMoodFromExpressions(expressions) {
        // Get the expression with highest confidence
        let maxExpression = '';
        let maxValue = 0;
        
        for (const [expression, value] of Object.entries(expressions)) {
            if (value > maxValue) {
                maxValue = value;
                maxExpression = expression;
            }
        }
        
        // Map face-api expressions to mood labels
        const moodMap = {
            'happy': 'Happy',
            'sad': 'Sad',
            'angry': 'Angry',
            'surprised': 'Surprised',
            'fearful': 'Fearful',
            'disgusted': 'Disgusted',
            'neutral': 'Neutral'
        };
        
        return moodMap[maxExpression] || 'Neutral';
    }
    
    displayMood(mood) {
        this.moodResult.innerHTML = mood;
    }
    
    startDetection() {
        const detect = () => {
            this.detectMood();
            setTimeout(() => requestAnimationFrame(detect), 500); // Update every 500ms
        };
        detect();
    }
    
    showError(message) {
        this.moodResult.innerHTML = message;
        this.loading.style.display = 'none';
    }
}

// Initialize when page loads
window.addEventListener('load', () => {
    // Check if getUserMedia is supported
    if (!navigator.mediaDevices || !navigator.mediaDevices.getUserMedia) {
        document.getElementById('mood-result').innerHTML = 'Camera not supported in this browser';
        return;
    }
    new MoodPredictor();
});

