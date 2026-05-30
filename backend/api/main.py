# backend/api/main.py
from fastapi.middleware.cors import CORSMiddleware
from fastapi import FastAPI, HTTPException
from pydantic import BaseModel
import torch
import numpy as np

# Import from our custom modular structure
from ml.models import load_ai_engine
from physics.equations import calculate_stress_multiplier, project_health_with_bounds, calculate_financial_loss
from ml.agent import generate_battery_advice

app = FastAPI(title="VoltGuard AI Platform", version="1.0")


app.add_middleware(
    CORSMiddleware,
    allow_origins=["http://localhost:3000"], # Allows your Next.js app to connect
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)
# Load AI Engine globally when the server starts
model, scaler = load_ai_engine()

# --- SCHEMAS ---
class BatteryData(BaseModel):
    soh_history: list
    ir_history: list
    temp_history: list

class SimulationInput(BaseModel):
    current_soh: float
    sim_years: int
    avg_temp_c: float
    fast_charge_freq: float

class ChatInput(BaseModel):
    question: str
    current_soh: float
    sim_years: int
    avg_temp_c: float
    fast_charge_freq: float

# --- ENDPOINTS ---
@app.get("/")
def health_check():
    return {"status": "VoltGuard Backend Running - Modular Architecture"}

@app.post("/predict")
async def predict_next_cycle(data: BatteryData):
    """Uses the LSTM to predict exact next cycle health."""
    if model is None or scaler is None:
        raise HTTPException(status_code=500, detail="AI Model not loaded on server.")
    if len(data.soh_history) != 10:
        raise HTTPException(status_code=400, detail="Requires exactly 10 cycles of history.")
        
    try:
        input_array = np.column_stack((data.soh_history, data.ir_history, data.temp_history))
        scaled_input = scaler.transform(input_array)
        input_tensor = torch.tensor(scaled_input, dtype=torch.float32).unsqueeze(0)
        
        with torch.no_grad():
            prediction = model(input_tensor)
            predicted_soh = prediction.item() * (scaler.data_max_[0] - scaler.data_min_[0]) + scaler.data_min_[0]
        
        return {
            "predicted_next_soh": round(predicted_soh, 2),
            "status": "Success"
        }
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))

@app.post("/simulate")
async def run_simulation(sim: SimulationInput):
    """The Time Machine: Now with Financial Impact."""
    stress = calculate_stress_multiplier(sim.avg_temp_c, sim.fast_charge_freq)
    total_cycles = sim.sim_years * 250
    
    final_soh, best_case, worst_case = project_health_with_bounds(sim.current_soh, total_cycles, stress)
    financial_loss = calculate_financial_loss(sim.current_soh, final_soh)
    
    return {
        "scenario_years": sim.sim_years,
        "final_projected_soh": final_soh,
        "best_case_soh": best_case,
        "worst_case_soh": worst_case,
        "stress_multiplier": round(stress, 2),
        "estimated_financial_loss_usd": financial_loss
    }

@app.post("/graph/degradation-curve")
async def generate_graph_data(sim: SimulationInput):
    # 1. THE HYBRID FUSION: Ask the LSTM for the battery's baseline strength first
    # We pass a "dummy" perfect history to the LSTM just to see its baseline reaction
    dummy_history = np.array([sim.current_soh, 0.05, 25.0] * 10).reshape(1, 10, 3)
    scaled_dummy = scaler.transform(dummy_history.reshape(-1, 3)).reshape(1, 10, 3)
    tensor_dummy = torch.tensor(scaled_dummy, dtype=torch.float32)
    
    with torch.no_grad():
        lstm_prediction = model(tensor_dummy).item()
        unscaled_pred = lstm_prediction * (scaler.data_max_[0] - scaler.data_min_[0]) + scaler.data_min_[0]
    
    # 2. Extract the LSTM's learned degradation rate
    # If the LSTM predicts health will drop from 96 to 95.9, the base rate is 0.1
    raw_drop = sim.current_soh - unscaled_pred
    dynamic_base_deg = max(0.001, min(0.02, raw_drop))
    # 3. Hand the LSTM's rate over to the Physics Engine
    stress = calculate_stress_multiplier(sim.avg_temp_c, sim.fast_charge_freq)
    total_cycles = sim.sim_years * 250
    
    graph_data = []
    
    for cycle in range(0, total_cycles + 1, 50):
        # Notice we are now using `dynamic_base_deg` from the LSTM!
        mean_health, best_case, worst_case = project_health_with_bounds(
            sim.current_soh, cycle, stress, base_deg=dynamic_base_deg
        )
        
        graph_data.append({
            "cycle_number": cycle,
            "estimated_months": round(cycle / 20, 1),
            "soh_pct": mean_health,
            "best_case": best_case,
            "worst_case": worst_case
        })
        if mean_health <= 0:
            break

    return {
        "metadata": {"x_axis": "estimated_months", "y_axis": "soh_pct"},
        "trajectory": graph_data
    }

@app.post("/chat")
async def chat_with_voltguard(data: ChatInput):
    
    dummy_history = np.array([data.current_soh, 0.05, 25.0] * 10).reshape(1, 10, 3)
    scaled_dummy = scaler.transform(dummy_history.reshape(-1, 3)).reshape(1, 10, 3)
    tensor_dummy = torch.tensor(scaled_dummy, dtype=torch.float32)
    
    with torch.no_grad():
        lstm_prediction = model(tensor_dummy).item()
        unscaled_pred = lstm_prediction * (scaler.data_max_[0] - scaler.data_min_[0]) + scaler.data_min_[0]
    
    raw_drop = data.current_soh - unscaled_pred
    dynamic_base_deg = max(0.001, min(0.02, raw_drop))
    # 2. Pass that smart LSTM base rate into the Physics Engine
    stress = calculate_stress_multiplier(data.avg_temp_c, data.fast_charge_freq)
    total_cycles = data.sim_years * 250

    final_soh, best_case, worst_case = project_health_with_bounds(
        data.current_soh, total_cycles, stress, base_deg=dynamic_base_deg
    )
    
    # financial_loss = calculate_financial_loss(data.current_soh, final_soh)
    
    sim_results = {
        "final_projected_soh": final_soh,
        "best_case_scenario": best_case,
        "worst_case_scenario": worst_case,
        # "estimated_financial_loss_usd": financial_loss,
        "stress_multiplier": round(stress, 2)
    }
    
    # 3. Hand the synchronized math to Llama 3.1
    ai_response = generate_battery_advice(data.question, sim_results)
    
    return {
        "generative_response": ai_response,
        "raw_data": sim_results
    }