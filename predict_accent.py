# predict_accent.py

import torch
import torchaudio
import os
from transformers import Wav2Vec2ForSequenceClassification, Wav2Vec2FeatureExtractor
from pydub import AudioSegment
import tempfile

# -------- Load Model and Feature Extractor --------
model_path = "./wav2vec2-accent-cls/"  # adjust if you renamed it
model = Wav2Vec2ForSequenceClassification.from_pretrained(model_path)
processor = Wav2Vec2FeatureExtractor.from_pretrained(model_path)
model.eval()

# -------- Load Label Mapping --------
id2label = model.config.id2label

# -------- MP3 to WAV Converter --------
def convert_if_needed(audio_path):
    if audio_path.endswith(".wav"):
        return audio_path  # Already compatible
    elif audio_path.endswith(".mp3"):
        audio = AudioSegment.from_mp3(audio_path)
        audio = audio.set_frame_rate(16000).set_channels(1)
        temp_wav = tempfile.NamedTemporaryFile(delete=False, suffix=".wav")
        audio.export(temp_wav.name, format="wav")
        return temp_wav.name
    else:
        raise ValueError("Unsupported file format. Use .wav or .mp3")

# -------- Predict Function --------
def predict_accent(audio_path):
    processed_path = convert_if_needed(audio_path)

    waveform, sr = torchaudio.load(processed_path)
    if sr != 16000:
        resampler = torchaudio.transforms.Resample(orig_freq=sr, new_freq=16000)
        waveform = resampler(waveform)

    input_values = processor(waveform.squeeze().numpy(), sampling_rate=16000, return_tensors="pt").input_values
    with torch.no_grad():
        logits = model(input_values).logits
        predicted_id = torch.argmax(logits, dim=-1).item()
        confidence = torch.softmax(logits, dim=-1)[0, predicted_id].item()

    # Clean up temporary file if created
    if processed_path != audio_path:
        os.remove(processed_path)

    return id2label[predicted_id], round(confidence * 100, 2)

# -------- Example Usage --------
if __name__ == "__main__":
    test_file = "unseen_audio/hindi12.mp3"  # or .wav
    label, confidence = predict_accent(test_file)
    print(f"Predicted Accent: {label} (Confidence: {confidence}%)")
