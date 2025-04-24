# wav2vec_accent_classifier_efficient.py

import os
import logging
import pandas as pd
import torchaudio
import torch
import numpy as np
from torch.utils.data import Dataset
from datasets import Dataset as HFDataset
from transformers import (
    Wav2Vec2FeatureExtractor,
    Wav2Vec2ForSequenceClassification,
    TrainingArguments,
    Trainer
)
from sklearn.metrics import accuracy_score, precision_recall_fscore_support
import gc

# ---------------- Logging Setup ----------------
logging.basicConfig(
    filename='accent_training.log',
    filemode='w',
    format='%(asctime)s - %(levelname)s - %(message)s',
    level=logging.INFO
)
console = logging.StreamHandler()
console.setLevel(logging.INFO)
logging.getLogger().addHandler(console)
logging.info("Efficient Wav2Vec2 Accent Classifier Started")

# ---------------- Load Metadata ----------------
df = pd.read_csv("audio_metadata.csv")
df = df[df['file_path'].apply(os.path.exists)]
logging.info(f"Loaded metadata: {len(df)} valid audio samples")

# ---------------- Encode Labels ----------------
label_list = sorted(df["accent"].unique())
label2id = {label: i for i, label in enumerate(label_list)}
df["label"] = df["accent"].map(label2id)
logging.info(f"Labels mapped: {label2id}")

# ---------------- Dataset Class ----------------
class AccentDataset(Dataset):
    def __init__(self, dataframe, processor):
        self.df = dataframe.reset_index(drop=True)
        self.processor = processor
        self.resampler = torchaudio.transforms.Resample(orig_freq=48000, new_freq=16000)

    def __len__(self):
        return len(self.df)

    def __getitem__(self, idx):
        row = self.df.iloc[idx]
        try:
            waveform, sr = torchaudio.load(row["file_path"])
            if sr != 16000:
                waveform = self.resampler(waveform)
            input_values = self.processor(
                waveform.squeeze().numpy(),
                sampling_rate=16000,
                return_tensors="pt"
            ).input_values[0]
        except Exception as e:
            logging.error(f"Failed loading {row['file_path']}: {e}")
            input_values = torch.zeros(16000)  # fallback

        return {
            "input_values": input_values,
            "label": row["label"]
        }

# ---------------- Prepare Processor ----------------
processor = Wav2Vec2FeatureExtractor.from_pretrained("facebook/wav2vec2-base")

# ---------------- Split Dataset ----------------
from sklearn.model_selection import train_test_split
train_df, test_df = train_test_split(df, test_size=0.2, stratify=df["label"], random_state=42)

train_dataset = AccentDataset(train_df, processor)
test_dataset = AccentDataset(test_df, processor)

# ---------------- Load Model ----------------
model = Wav2Vec2ForSequenceClassification.from_pretrained(
    "facebook/wav2vec2-base",
    num_labels=len(label_list),
    label2id=label2id,
    id2label={v: k for k, v in label2id.items()},
)
logging.info("Model initialized")

# ---------------- Metrics ----------------
def compute_metrics(pred):
    preds = np.argmax(pred.predictions, axis=1)
    labels = pred.label_ids

    acc = accuracy_score(labels, preds)
    precision, recall, f1, _ = precision_recall_fscore_support(labels, preds, average='weighted')

    logging.info(f"Eval Acc: {acc:.4f}, Precision: {precision:.4f}, Recall: {recall:.4f}, F1: {f1:.4f}")
    torch.cuda.empty_cache()
    gc.collect()

    return {
        "accuracy": acc,
        "precision": precision,
        "recall": recall,
        "f1": f1,
    }

# ---------------- Training Args ----------------
training_args = TrainingArguments(
    output_dir="./wav2vec2-accent-cls",
    evaluation_strategy="epoch",
    save_strategy="epoch",
    learning_rate=2e-5,
    per_device_train_batch_size=4,
    per_device_eval_batch_size=4,
    num_train_epochs=3,
    logging_dir="./logs",
    logging_steps=10,
    save_total_limit=2,
    fp16=True if torch.cuda.is_available() else False,
    report_to="tensorboard"
)

# ---------------- Trainer ----------------
trainer = Trainer(
    model=model,
    args=training_args,
    train_dataset=train_dataset,
    eval_dataset=test_dataset,
    tokenizer=processor,
    compute_metrics=compute_metrics,
)

# ---------------- Train ----------------
try:
    logging.info("Training begins...")
    trainer.train()
    logging.info("Training complete.")
except Exception as e:
    logging.error(f"Training failed: {e}")
