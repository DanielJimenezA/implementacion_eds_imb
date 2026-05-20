import pandas as pd
import json
import unicodedata
import re
import math
from pathlib import Path

archivo_excel = Path("excel/unidades.xlsx")
salida_json = Path("data/unidades.json")

def normalizar_columna(col):
    col = str(col).replace("\n", " ").strip().lower()
    col = unicodedata.normalize("NFKD", col)
    col = "".join(c for c in col if not unicodedata.combining(c))
    col = re.sub(r"\s+", "_", col)
    col = col.replace("/", "_")
    col = re.sub(r"_+", "_", col)
    return col.strip("_")

def limpiar_decimal(valor):
    if pd.isna(valor):
        return None
    valor = str(valor).strip().replace(",", ".").replace("%", "")
    try:
        numero = float(valor)
        if math.isnan(numero) or math.isinf(numero):
            return None
        return numero
    except Exception:
        return None

def limpiar_entero(valor):
    if pd.isna(valor):
        return 0
    try:
        numero = float(str(valor).replace(",", "."))
        if math.isnan(numero) or math.isinf(numero):
            return 0
        return int(numero)
    except Exception:
        return 0

def limpiar_texto(valor):
    if pd.isna(valor):
        return ""
    return str(valor).strip()

def limpiar_json(obj):
    if isinstance(obj, dict):
        return {k: limpiar_json(v) for k, v in obj.items()}
    if isinstance(obj, list):
        return [limpiar_json(v) for v in obj]
    if obj is None:
        return None
    if isinstance(obj, float) and (math.isnan(obj) or math.isinf(obj)):
        return None
    try:
        if pd.isna(obj):
            return None
    except Exception:
        pass
    return obj

if not archivo_excel.exists():
    raise FileNotFoundError(f"No encontré el Excel en: {archivo_excel.resolve()}")

df = pd.read_excel(archivo_excel)
df.columns = [normalizar_columna(c) for c in df.columns]

rename_map = {
    "nombre_de_la_unidad": "nombre_unidad",
    "estatus_de_operacion": "estatus_operacion",
    "total_quirofanos": "total_quirofanos",
    "total_camas": "total_camas",
    "entrega_de_equipos_red": "entrega_de_equipos_red",
}
df = df.rename(columns=rename_map)

if "total" in df.columns and "total_camas" not in df.columns:
    df = df.rename(columns={"total": "total_camas"})

columnas_texto = [
    "clues", "inst", "entidad", "municipio", "nombre_unidad",
    "categoria_gerencial_ampliada", "tipologia", "subtipologia",
    "estatus_operacion", "estrato_unidad", "formato_tics_servicios",
    "entrega_de_equipos_red", "formato_pheds", "formato_moce",
    "configuraciones_iniciales", "capacitaciones", "uso_pheds", "uso_moce",
    "observaciones"
]

for col in columnas_texto:
    if col in df.columns:
        df[col] = df[col].apply(limpiar_texto)

for col in ["latitud", "longitud", "avance"]:
    if col in df.columns:
        df[col] = df[col].apply(limpiar_decimal)

for col in ["total_consultorios", "total_quirofanos", "total_camas"]:
    if col in df.columns:
        df[col] = df[col].apply(limpiar_entero)

for col in ["clues", "entidad", "municipio", "nombre_unidad", "tipologia", "estatus_operacion", "latitud", "longitud", "avance"]:
    if col not in df.columns:
        df[col] = None

df = df.dropna(subset=["latitud", "longitud"], how="any")
df = df[df["clues"].astype(str).str.strip() != ""]

df = df.replace([float("inf"), float("-inf")], None).astype(object)
df = df.where(pd.notnull(df), None)
registros = limpiar_json(df.to_dict(orient="records"))

salida_json.parent.mkdir(parents=True, exist_ok=True)
with open(salida_json, "w", encoding="utf-8") as f:
    json.dump(registros, f, ensure_ascii=False, indent=4, allow_nan=False)

print("JSON generado correctamente")
print(f"Registros exportados: {len(registros):,}")
print(salida_json)
