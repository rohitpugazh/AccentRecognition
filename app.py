import base64
from flask import Flask, render_template, request, jsonify
import io
import librosa
import librosa.display
import logging
import matplotlib
import matplotlib.pyplot as plt
import numpy as np
import os
import tempfile
import torch
import torchaudio
import sys

# Import Wav2Vec2 components
from transformers import (
    Wav2Vec2ForSequenceClassification,
    Wav2Vec2FeatureExtractor
)
from pydub import AudioSegment

# Add Wav2Vec2 directory to path
wav2vec2_dir = os.path.join(os.path.dirname(__file__), "Wav2Vec2")
sys.path.append(wav2vec2_dir)

# Set matplotlib backend
matplotlib.use('Agg')  # Set the backend to non-interactive

# Configure logging
logging.basicConfig(level=logging.DEBUG)
logger = logging.getLogger(__name__)

app = Flask(__name__)
app.debug = False  # Disable debug mode


# Wav2Vec2 Model setup
try:
    model_path = os.path.join(
        os.path.dirname(__file__), 
        "Wav2Vec2/wav2vec2-accent-cls/"
    )
    logger.info(f"Looking for model at: {model_path}")
    
    if not os.path.exists(model_path):
        raise FileNotFoundError(f"Model directory not found at {model_path}")

    # Load the model and processor
    logger.info("Loading Wav2Vec2 model...")
    model = Wav2Vec2ForSequenceClassification.from_pretrained(model_path)
    processor = Wav2Vec2FeatureExtractor.from_pretrained(model_path)
    
    # Set model to evaluation mode
    model.eval()
    
    # Get accent labels from model config
    class_labels = [
        model.config.id2label[i] 
        for i in range(len(model.config.id2label))
    ]
    logger.info(f"Loaded {len(class_labels)} accent labels: {class_labels}")
    
    logger.info("Model setup completed successfully")

except Exception as e:
    logger.error(f"Error during model setup: {str(e)}", exc_info=True)
    model = None
    processor = None
    class_labels = []



def convert_audio_if_needed(audio_data, content_type):
    """Convert audio data to WAV format with 16kHz sampling rate."""
    try:
        # Save the incoming audio data to a temporary file
        suffix = ".webm" if "webm" in content_type else ".wav"
        with tempfile.NamedTemporaryFile(suffix=suffix, delete=False) as temp_file:
            temp_file.write(audio_data)
            temp_file_path = temp_file.name
        
        logger.debug(f"Saved incoming audio to: {temp_file_path}")

        # Convert to WAV using pydub if needed
        audio = AudioSegment.from_file(temp_file_path)
        audio = audio.set_frame_rate(16000).set_channels(1)
        
        # Create temporary WAV file
        with tempfile.NamedTemporaryFile(suffix='.wav', delete=False) as temp_wav:
            temp_wav_path = temp_wav.name
        
        # Export as WAV
        audio.export(temp_wav_path, format="wav")
        logger.debug(f"Converted to 16kHz WAV: {temp_wav_path}")

        # Clean up original temporary file
        os.unlink(temp_file_path)
        
        return temp_wav_path

    except Exception as e:
        logger.error(f"Error in audio conversion: {str(e)}", exc_info=True)
        raise



def generate_spectrogram(
    audio_path, sr=16000, n_mels=128, hop_length=512, fmax=8000
):
    """Generates a spectrogram from audio file and returns it as base64."""
    try:
        logger.debug("Starting spectrogram generation...")
        
        # Load audio file
        y, sr = librosa.load(audio_path, sr=sr)
        y = librosa.util.normalize(y)

        # Compute Mel spectrogram
        mel_spec = librosa.feature.melspectrogram(
            y=y, sr=sr, n_mels=n_mels, 
            hop_length=hop_length, fmax=fmax
        )
        mel_spec_db = librosa.power_to_db(mel_spec, ref=np.max)

        # Plot spectrogram
        plt.figure(figsize=(4, 4), dpi=300)
        librosa.display.specshow(
            mel_spec_db, sr=sr, hop_length=hop_length, 
            x_axis='time', y_axis='mel', fmax=fmax
        )
        plt.colorbar(format='%+2.0f dB')
        plt.title('Mel spectrogram')
        plt.tight_layout()

        # Save to base64 string
        buffer = io.BytesIO()
        plt.savefig(buffer, format='png', bbox_inches='tight')
        plt.close()
        buffer.seek(0)
        image_base64 = base64.b64encode(buffer.getvalue()).decode('utf-8')
        logger.debug("Spectrogram generation completed successfully")
        return image_base64

    except Exception as e:
        logger.error(f"Error generating spectrogram: {str(e)}", exc_info=True)
        return None



def predict_accent(audio_data, content_type):
    """Predicts the accent for given audio data using Wav2Vec2 model."""
    try:
        logger.debug("Starting accent prediction...")
        if model is None or processor is None:
            raise ValueError("Model not properly initialized")

        # Convert audio to appropriate format
        temp_wav_path = convert_audio_if_needed(audio_data, content_type)
        
        # Generate spectrogram for visualization
        logger.debug("Generating spectrogram...")
        spectrogram_base64 = generate_spectrogram(temp_wav_path)
        
        # Load audio for model inference
        waveform, sr = torchaudio.load(temp_wav_path)
        if sr != 16000:
            resampler = torchaudio.transforms.Resample(
                orig_freq=sr, new_freq=16000
            )
            waveform = resampler(waveform)
        
        # Process audio for model
        input_values = processor(
            waveform.squeeze().numpy(), 
            sampling_rate=16000, 
            return_tensors="pt"
        ).input_values
        
        # Run inference
        logger.debug("Running model prediction...")
        with torch.no_grad():
            logits = model(input_values).logits
            probabilities = torch.softmax(logits, dim=1)[0]
            predicted_id = torch.argmax(logits, dim=1).item()
            confidence = probabilities[predicted_id].item()
        
        predicted_accent = class_labels[predicted_id]
        # Ensure confidence is between 1% and 100%
        confidence_percent = min(100.0, round(confidence * 100, 2))
        confidence_percent = max(1.0, confidence_percent)
        
        # Clean up
        os.unlink(temp_wav_path)
        
        logger.info(
            f"Prediction completed: {predicted_accent} "
            f"with confidence {confidence_percent}%"
        )
        return predicted_accent, confidence_percent, spectrogram_base64

    except Exception as e:
        logger.error(f"Error in prediction: {str(e)}", exc_info=True)
        return None, None, None



@app.route('/')
def index():
    try:
        return render_template('index.html')
    except Exception as e:
        logger.error(f"Error rendering template: {str(e)}", exc_info=True)
        return str(e), 500



@app.route('/analyze', methods=['POST'])
def analyze():
    try:
        logger.debug("Received audio analysis request")
        if 'audio' not in request.files:
            logger.warning("No audio file provided in request")
            return jsonify({'error': 'No audio file provided'}), 400

        # Get audio data from request
        audio_file = request.files['audio']
        content_type = audio_file.content_type
        logger.debug(
            f"Received audio file: {audio_file.filename}, "
            f"Content type: {content_type}"
        )
        
        # Get mode parameter
        speech_mode = request.form.get('mode', 'free')  # Default to free speech
        logger.debug(f"Speech mode: {speech_mode}")

        # Get prediction using Wav2Vec2 model
        logger.debug("Starting prediction process...")
        predicted_accent, confidence, spectrogram = predict_accent(
            audio_file.read(), content_type
        )
        
        if predicted_accent is None:
            return jsonify({'error': 'Failed to predict accent'}), 500

        # Return results
        return jsonify({
            'accent': predicted_accent,
            'confidence': confidence,
            'spectrogram': spectrogram,
            'mode': speech_mode
        })

    except Exception as e:
        logger.error(f"Error in /analyze endpoint: {str(e)}", exc_info=True)
        return jsonify({'error': str(e)}), 500



@app.route('/feedback', methods=['POST'])
def submit_feedback():
    try:
        logger.debug("Received feedback submission")
        data = request.json
        
        if not data:
            return jsonify({'error': 'No data provided'}), 400
            
        feedback_type = data.get('feedback_type')
        predicted_accent = data.get('predicted_accent')
        actual_accent = data.get('actual_accent')
        audio_id = data.get('audio_id', 'unknown')
        
        logger.info(
            f"Feedback received: type={feedback_type}, "
            f"predicted={predicted_accent}, actual={actual_accent}, "
            f"audio_id={audio_id}"
        )
        
        # You could store this in a database or write to a file
        # For now, we'll just log it
        feedback_dir = os.path.join(os.path.dirname(__file__), "feedback_data")
        os.makedirs(feedback_dir, exist_ok=True)
        
        feedback_file = os.path.join(feedback_dir, "accent_feedback.csv")
        file_exists = os.path.exists(feedback_file)
        
        with open(feedback_file, 'a') as f:
            if not file_exists:
                f.write("timestamp,audio_id,feedback_type,predicted_accent,actual_accent\n")
            
            import datetime
            timestamp = datetime.datetime.now().isoformat()
            f.write(f"{timestamp},{audio_id},{feedback_type},{predicted_accent},{actual_accent}\n")
        
        return jsonify({'status': 'success', 'message': 'Feedback recorded'})
        
    except Exception as e:
        logger.error(f"Error in /feedback endpoint: {str(e)}", exc_info=True)
        return jsonify({'error': str(e)}), 500



@app.route('/api/accents', methods=['GET'])
def get_accents():
    try:
        if not class_labels:
            return jsonify({'error': 'No accent labels available'}), 500
            
        return jsonify({
            'accents': class_labels
        })
        
    except Exception as e:
        logger.error(f"Error in /api/accents endpoint: {str(e)}", exc_info=True)
        return jsonify({'error': str(e)}), 500



if __name__ == '__main__':
    app.run(debug=False, host='0.0.0.0', port=8080)