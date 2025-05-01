# 🧠 AccentRecognition — Wav2Vec2-Based Accent Classifier

This project fine-tunes [facebook/wav2vec2-base](https://huggingface.co/facebook/wav2vec2-base) for **English accent classification** using 167K+ audio clips. It supports `.mp3` and `.wav` inputs and provides a simple web interface built with Flask.

---

## 🔍 Overview

- 🎤 Predicts 11 English accents from audio clips  
- 🧠 Built using Hugging Face Transformers and PyTorch  
- ⚡ Inference-ready: supports real-time MP3/WAV uploads  
- 🌐 Web-based interface for quick testing

---

## 🎥 Demo

[![Watch the demo](https://img.youtube.com/vi/Nxomklotd_Y/0.jpg)](https://www.youtube.com/watch?v=Nxomklotd_Y)

---

## 🖥️ Run Locally

- read [Download model.safetensors](#-download-modelsafetensors)
```bash
pip install -r requirements.txt
python app.py
```

Then visit [http://localhost:8080](http://localhost:8080) in your browser.

---

## 🧠 Model & Dataset

- **Model**: `facebook/wav2vec2-base`, fine-tuned for multi-class classification
- **Accents**:  
  American, British, Australian, South Asian, German, Filipino, Hong Kong, New Zealand, Canadian, Scottish, Southern African
- **Input**: Raw 16kHz waveform (MP3s auto-converted on-the-fly)

### 📂 Dataset

Trained on the [**Common Voice 20.0**](https://commonvoice.mozilla.org/en/datasets) corpus by Mozilla.  
- Language: English (`cv-corpus-20.0-2024-12-06/en/`)
- Only a subset of samples with valid `accent` metadata were used
- Files were standardized and resampled to 16kHz for model compatibility

---

## 📦 Files for Inference

These files are required to use the model:

```
wav2vec2-accent-cls/
├── model.safetensors
├── config.json
├── preprocessor_config.json
```

### 📥 Download `model.safetensors`

Due to GitHub’s file size limits, `model.safetensors` must be downloaded manually:

➡️ [Download model.safetensors from Google Drive](https://drive.google.com/file/d/1PQ5pVVh2T7_CaDFntOQOLJWmp7ecOnPl/view?usp=drive_link)

Place it in the following directory:

```
AccentRecognition/
└── wav2vec2-accent-cls/
    └── model.safetensors
```

---

## 📝 License

This project is licensed under the **GNU General Public License v3.0** — see [LICENSE](LICENSE) for details.

---

## 🤝 Contributions

Open an issue or pull request if you'd like to collaborate!
