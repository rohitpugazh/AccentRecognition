# 🧠 AccentRecognition — Wav2Vec2-Based Accent Classifier

This project fine-tunes [facebook/wav2vec2-base](https://huggingface.co/facebook/wav2vec2-base) for **English accent classification** using 167K+ voice samples. It supports `.mp3` and `.wav` inputs and runs through a simple web interface built with Flask.

---

## 🔍 Overview

- 🎤 Predicts 11 English accents from audio clips  
- 🧠 Built on Hugging Face Transformers and PyTorch  
- ⚡ Inference-ready with MP3/WAV support  
- 🧪 92.3% validation accuracy after just 2 epochs  

---

## 🖥️ Run Locally

Install dependencies:

```bash
pip install -r requirements.txt
```

Run the web app:

```bash
python app.py
```

Then open [http://localhost:8080](http://localhost:8080) in your browser to upload and classify audio files.

---

## 🧠 Model Details

- Base: `facebook/wav2vec2-base`
- Input: Raw 16kHz waveform (MP3s auto-converted)
- Classes: American, British, Australian, South Asian, German, Filipino, Hong Kong, New Zealand, Canadian, Scottish, Southern African
- Fine-tuned with: AdamW, LR = 2e-5, batch size = 4, 3 epochs

📦 Files used for inference:
```
wav2vec2-accent-cls/
├── model.safetensors
├── config.json
├── preprocessor_config.json
```

---

## 📝 License

GNU License – see [LICENSE](LICENSE)

---

## 🤝 Contributions

Open an issue or pull request if you'd like to collaborate!
