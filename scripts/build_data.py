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
    return col


def limpiar_decimal(valor):
    if pd.isna(valor):
        return None

    valor = str(valor).strip()
    valor = valor.replace(",", ".")
    valor = valor.replace("%", "")

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

    if isinstance(obj, float):
        if math.isnan(obj) or math.isinf(obj):
            return None

    try:
        if pd.isna(obj):
            return None
    except Exception:
        pass

    return obj


df = pd.read_excel(archivo_excel)

df.columns = [normalizar_columna(c) for c in df.columns]

rename_map = {
    "nombre_de_la_unidad": "nombre_unidad",
    "categoria_gerencial_ampliada": "categoria_gerencial",
    "estatus_de_operacion": "estatus_operacion",
    "total_quirofanos": "total_quirofanos",
    "total_camas": "total_camas",
    "formato_tics_servicios": "formato_tics_servicios",
    "entrega_de_equipos___red": "entrega_equipos_red",
    "entrega_de_equipos_red": "entrega_equipos_red",
    "formato_pheds": "formato_pheds",
    "formato_moce": "formato_moce",
    "configuraciones_iniciales": "configuraciones_iniciales",
    "capacitaciones": "capacitaciones",
    "uso_pheds": "uso_pheds",
    "uso_moce": "uso_moce",
}

df = df.rename(columns=rename_map)

if "total" in df.columns and "total_camas" not in df.columns:
    df = df.rename(columns={"total": "total_camas"})

columnas_texto = [
    "clues",
    "inst",
    "entidad",
    "municipio",
    "nombre_unidad",
    "categoria_gerencial",
    "tipologia",
    "subtipologia",
    "estatus_operacion",
    "estrato_unidad",
    "formato_tics_servicios",
    "entrega_equipos_red",
    "formato_pheds",
    "formato_moce",
    "configuraciones_iniciales",
    "capacitaciones",
    "uso_pheds",
    "uso_moce",
    "observaciones",
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

df = df.dropna(subset=["latitud", "longitud"], how="any")

if "clues" in df.columns:
    df = df[df["clues"].astype(str).str.strip() != ""]

df = df.replace([float("inf"), float("-inf")], None)
df = df.astype(object)
df = df.where(pd.notnull(df), None)

registros = df.to_dict(orient="records")
registros = limpiar_json(registros)

salida_json.parent.mkdir(parents=True, exist_ok=True)

with open(salida_json, "w", encoding="utf-8") as f:
    json.dump(registros, f, ensure_ascii=False, indent=4, allow_nan=False)

print("JSON generado correctamente")
print(f"Registros exportados: {len(registros):,}")
print(salida_json)

# =====================================================
# EXPORTAR EQUIPAMIENTO
# =====================================================

salida_equipamiento = Path("data/equipamiento.json")

try:
    df_eq = pd.read_excel(archivo_excel, sheet_name="equipamiento")

    df_eq.columns = [normalizar_columna(c) for c in df_eq.columns]

    columnas_numericas_eq = [
        "pc_requerimiento",
        "pc_entregado",
        "aps_requerimiento",
        "aps_entregado",
        "impresoras_requerimiento",
        "impresoras_entregado",
    ]

    if "entidad" in df_eq.columns:
        df_eq["entidad"] = df_eq["entidad"].apply(limpiar_texto)

    for col in columnas_numericas_eq:
        if col in df_eq.columns:
            df_eq[col] = df_eq[col].apply(limpiar_entero)

    df_eq = df_eq.where(pd.notnull(df_eq), None)

    registros_eq = df_eq.to_dict(orient="records")
    registros_eq = limpiar_json(registros_eq)

    with open(salida_equipamiento, "w", encoding="utf-8") as f:
        json.dump(registros_eq, f, ensure_ascii=False, indent=4, allow_nan=False)

    print(f"Archivo de equipamiento: {salida_equipamiento}")
    print(f"Registros equipamiento: {len(registros_eq):,}")

except ValueError:
    print("No se encontró la hoja 'equipamiento'. Se omite equipamiento.")
