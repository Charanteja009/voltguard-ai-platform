# backend/physics/equations.py

def calculate_stress_multiplier(avg_temp_c: float, fast_charge_freq: float) -> float:
    temp_factor = 2 ** ((avg_temp_c - 25) / 10)
    charge_factor = 1 + (fast_charge_freq * 0.5) 
    return temp_factor * charge_factor

def project_health_with_bounds(current_soh: float, cycles_elapsed: int, stress_multiplier: float, base_deg: float = 0.005):
    """
    Projects mean health, plus best-case and worst-case scenarios.
    Uncertainty compounds over time (cycles).
    """
    mean_projected = current_soh - (cycles_elapsed * base_deg * stress_multiplier)
    
    # The further into the future we predict, the wider the variance gets
    variance = cycles_elapsed * 0.0008 * stress_multiplier 
    
    best_case = mean_projected + variance
    worst_case = mean_projected - variance
    
    return (
        max(0.0, round(mean_projected, 2)), 
        min(current_soh, max(0.0, round(best_case, 2))), 
        max(0.0, round(worst_case, 2))
    )

def calculate_financial_loss(starting_soh: float, ending_soh: float, battery_capacity_kwh: int = 80, cost_per_kwh: int = 135) -> float:
    """
    Calculates the financial depreciation of the battery pack.
    Assumes an 80kWh battery and a replacement cost of $135/kWh.
    """
    health_lost_pct = starting_soh - ending_soh
    if health_lost_pct <= 0: return 0.0
    
    total_battery_value = battery_capacity_kwh * cost_per_kwh
    loss_value = total_battery_value * (health_lost_pct / 100)
    return round(loss_value, 2)