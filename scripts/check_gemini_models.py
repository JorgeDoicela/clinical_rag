import os
import sys
import time
from pathlib import Path
from dotenv import load_dotenv

# Resolver backend tanto en entorno local (host) como dentro de Docker
ROOT_DIR = Path(__file__).resolve().parent.parent
BACKEND_DIR = ROOT_DIR / "backend"
if not (BACKEND_DIR / "config.py").exists() and Path("/app/config.py").exists():
    BACKEND_DIR = Path("/app")
    ROOT_DIR = Path("/")

sys.path.insert(0, str(BACKEND_DIR))

# Cargar variables de entorno del backend si existen
env_path = BACKEND_DIR / ".env"
if env_path.exists():
    load_dotenv(dotenv_path=env_path)

from config import GEMINI_API_KEY
from google import genai
from google.genai import types

PRICING_TABLE = {
    "gemini-flash-lite-latest": {
        "tier": "Alias Dinámico Lite",
        "input_cost_1m": "~$0.075",
        "output_cost_1m": "~$0.30",
        "context": "1M tokens",
        "desc": "Apunta automáticamente a la versión Lite más reciente (ultra rápida)."
    },
    "gemini-3.5-flash-lite": {
        "tier": "Ultra Económico",
        "input_cost_1m": "$0.075",
        "output_cost_1m": "$0.30",
        "context": "1M tokens",
        "desc": "El más rápido y barato para evaluaciones estructuradas y JSON."
    },
    "gemini-3.1-flash-lite": {
        "tier": "Ultra Económico",
        "input_cost_1m": "$0.075",
        "output_cost_1m": "$0.30",
        "context": "1M tokens",
        "desc": "Variante ligera de alta velocidad."
    },
    "gemini-3.7-flash": {
        "tier": "Balanceado / Rápido",
        "input_cost_1m": "$0.15",
        "output_cost_1m": "$0.60",
        "context": "1M tokens",
        "desc": "Excelente razonamiento híbrido multimodal con bajísima latencia."
    },
    "gemini-3.8-flash": {
        "tier": "Última Generación",
        "input_cost_1m": "$0.15",
        "output_cost_1m": "$0.60",
        "context": "1M tokens",
        "desc": "Versión más reciente de la serie 3 Flash."
    },
    "gemini-3.5-flash": {
        "tier": "Estándar Flash",
        "input_cost_1m": "$0.15",
        "output_cost_1m": "$0.60",
        "context": "1M tokens",
        "desc": "Rendimiento balanceado texto + multimodal."
    },
    "gemini-3.6-flash": {
        "tier": "Estándar Flash",
        "input_cost_1m": "$0.15",
        "output_cost_1m": "$0.60",
        "context": "1M tokens",
        "desc": "Optimización intermedia serie 3."
    },
    "gemini-2.5-flash": {
        "tier": "Serie 2.5",
        "input_cost_1m": "$0.15",
        "output_cost_1m": "$0.60",
        "context": "1M tokens",
        "desc": "Versión estable previa."
    },
    "gemini-2.5-pro": {
        "tier": "Alta Precisión / Pro",
        "input_cost_1m": "$1.25",
        "output_cost_1m": "$5.00",
        "context": "1M tokens",
        "desc": "Mayor capacidad de razonamiento pero más costoso y lento."
    },
    "gemini-flash-latest": {
        "tier": "Alias Dinámico",
        "input_cost_1m": "~$0.15",
        "output_cost_1m": "~$0.60",
        "context": "1M tokens",
        "desc": "Apunta automáticamente a la versión Flash estable más reciente."
    }
}

def benchmark_models():
    if not GEMINI_API_KEY:
        print("[-] GEMINI_API_KEY no configurada. Verifica backend/.env")
        return

    client = genai.Client(api_key=GEMINI_API_KEY)
    
    print("\n" + "=" * 95)
    print("📊 COMPARADOR DE MODELOS GEMINI DISPONIBLES & PRECIOS ESTIMADOS (GOOGLE AI STUDIO)")
    print("=" * 95)
    print(f"{'MODELO':<28} | {'TIER':<18} | {'INPUT / 1M':<10} | {'OUTPUT / 1M':<11} | {'ESTADO / LATENCIA'}")
    print("-" * 95)

    test_models = [
        "gemini-flash-lite-latest",
        "gemini-3.5-flash-lite",
        "gemini-3.1-flash-lite",
        "gemini-3.7-flash",
        "gemini-3.8-flash",
        "gemini-flash-latest",
        "gemini-3.5-flash",
        "gemini-3.6-flash",
        "gemini-2.5-flash",
        "gemini-2.5-pro",
    ]

    for model in test_models:
        pricing = PRICING_TABLE.get(model, {
            "tier": "Personalizado",
            "input_cost_1m": "N/D",
            "output_cost_1m": "N/D"
        })
        
        start = time.time()
        try:
            res = client.models.generate_content(
                model=model,
                contents="Responde únicamente con la palabra OK",
                config=types.GenerateContentConfig(temperature=0.0)
            )
            elapsed = time.time() - start
            status = f"✅ Activo ({elapsed:.2f}s)"
        except Exception as e:
            err_msg = str(e)
            if "503" in err_msg:
                status = "⚠️ 503 Saturado"
            elif "429" in err_msg:
                status = "⚠️ 429 Cuota excedida"
            elif "404" in err_msg:
                status = "❌ No encontrado"
            else:
                status = f"❌ Error ({err_msg[:25]}...)"

        print(f"{model:<28} | {pricing['tier']:<18} | {pricing['input_cost_1m']:<10} | {pricing['output_cost_1m']:<11} | {status}")

    print("=" * 95)

if __name__ == "__main__":
    benchmark_models()
