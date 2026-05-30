# backend/ml/models.py

import torch
import torch.nn as nn
import joblib
import os

class BatteryBrainLSTM(nn.Module):
    """The PyTorch LSTM architecture trained in Phase 2."""
    def __init__(self, input_size=3, hidden_size=64, num_layers=2):
        super(BatteryBrainLSTM, self).__init__()
        self.lstm = nn.LSTM(input_size, hidden_size, num_layers, batch_first=True)
        self.fc = nn.Linear(hidden_size, 1)
        
    def forward(self, x):
        out, _ = self.lstm(x)
        out = self.fc(out[:, -1, :])
        return out

def load_ai_engine():
    """Loads the scaler and the PyTorch model from the root /models folder."""
    try:
        # Resolve absolute paths so it works regardless of where you run uvicorn
        base_dir = os.path.dirname(os.path.dirname(os.path.dirname(os.path.abspath(__file__))))
        model_path = os.path.join(base_dir, "models", "battery_model.pth")
        scaler_path = os.path.join(base_dir, "models", "data_scaler.pkl")

        scaler = joblib.load(scaler_path)
        model = BatteryBrainLSTM()
        model.load_state_dict(torch.load(model_path, map_location=torch.device('cpu')))
        model.eval() # Set to evaluation mode
        
        print("✅ AI Engine Initialized Successfully.")
        return model, scaler
    except Exception as e:
        print(f"⚠️ Warning: Could not load models. Error: {e}")
        return None, None