# backend/ml/agent.py
import os
from groq import Groq
from dotenv import load_dotenv
load_dotenv()
# You will need a free API key from groq.com
# Set it in your terminal: setx GROQ_API_KEY "your_key"
client = Groq(api_key=os.environ.get("GROQ_API_KEY"))

def generate_battery_advice(user_question: str, simulation_results: dict):
    """
    Takes the raw math from our FastAPI backend and uses Generative AI 
    to create a personalized, conversational response.
    """
    
    system_prompt = f"""
    You are VoltGuard AI, an elite battery intelligence assistant. 
    You help EV owners understand their battery health.
    
    Here is the exact mathematical simulation for the user's scenario:
    {simulation_results}
    
    Answer the user's question naturally. Do not just read the numbers back. 
    Explain WHAT the numbers mean and give actionable advice on how to extend battery life.
    """

    chat_completion = client.chat.completions.create(
        messages=[
            {"role": "system", "content": system_prompt},
            {"role": "user", "content": user_question}
        ],
        model="llama-3.1-8b-instant", # Lightning fast model
        temperature=0.5,
    )
    
    return chat_completion.choices[0].message.content