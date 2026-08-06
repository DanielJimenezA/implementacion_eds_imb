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
    "nivel_atencion": "nivel_atencion",
    "total_quirofanos": "total_quirofanos",
    "total_camas": "total_camas",
    "formato_tics_servicios": "formato_tics_servicios",
    "entrega_de_equipos___red": "entrega_equipos_red",
    "entrega_de_equipos_red": "entrega_equipos_red",
    "formato_pheds": "formato_pheds",
    "formato_moce": "formato_moce",
    "cargas_pheds": "cargas_pheds",
    "cargas_moce": "cargas_moce",
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
    "tipo_entidad",
    "municipio",
    "nombre_unidad",
    "categoria_gerencial",
    "prioridad",
    "tipologia",
    "subtipologia",
    "estatus_operacion",
    "nivel_atencion",
    "estrato_unidad",
    "formato_tics_servicios",
    "entrega_equipos_red",
    "formato_pheds",
    "formato_moce",
    "cargas_pheds",
    "cargas_moce",
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

RAIZ_PROYECTO = Path(__file__).resolve().parent.parent
salida_equipamiento = RAIZ_PROYECTO / "data" / "equipamiento.json"
salida_equipamiento.parent.mkdir(parents=True, exist_ok=True)

try:
    ruta_excel = Path(archivo_excel).resolve()

    print("\n" + "=" * 70)
    print("PROCESANDO EQUIPAMIENTO")
    print("=" * 70)
    print(f"Excel utilizado: {ruta_excel}")
    print(f"JSON de salida:  {salida_equipamiento.resolve()}")

    if not ruta_excel.exists():
        raise FileNotFoundError(f"No se encontró el archivo Excel: {ruta_excel}")

    df_eq = pd.read_excel(
        ruta_excel,
        sheet_name="equipamiento",
        engine="openpyxl",
        dtype=object,
    )

    print("\nEncabezados originales:")
    for columna in df_eq.columns:
        print(f"  - {repr(columna)}")

    df_eq.columns = [normalizar_columna(columna) for columna in df_eq.columns]

    print("\nEncabezados normalizados:")
    print(df_eq.columns.tolist())

    if "entidad" not in df_eq.columns:
        raise KeyError("No se encontró la columna ENTIDAD en la hoja equipamiento.")

    columnas_numericas_eq = [
        "pc_requerimiento",
        "pc_entregado",
        "aps_requerimiento",
        "aps_entregado",
        "impresoras_requerimiento",
        "impresoras_entregado",
    ]

    # Conservar mayúsculas, acentos y denominación original.
    # Solo elimina espacios invisibles y espacios repetidos.
    df_eq["entidad"] = (
        df_eq["entidad"]
        .astype("string")
        .str.replace("\u00a0", " ", regex=False)
        .str.replace("\u2007", " ", regex=False)
        .str.replace("\u202f", " ", regex=False)
        .str.replace(r"[\r\n\t]+", " ", regex=True)
        .str.replace(r"\s+", " ", regex=True)
        .str.strip()
    )

    df_eq["entidad"] = df_eq["entidad"].replace("", pd.NA)

    # Eliminar filas vacías o sin entidad
    df_eq = df_eq.dropna(how="all")
    df_eq = df_eq[df_eq["entidad"].notna()].copy()

    for columna in columnas_numericas_eq:
        if columna not in df_eq.columns:
            print(
                f"Advertencia: no existe la columna '{columna}'. "
                "Se creará con valor 0."
            )
            df_eq[columna] = 0

        df_eq[columna] = (
            df_eq[columna]
            .astype("string")
            .str.replace(",", "", regex=False)
            .str.strip()
        )

        df_eq[columna] = (
            pd.to_numeric(
                df_eq[columna],
                errors="coerce",
            )
            .fillna(0)
            .astype(int)
        )

    print("\nEntidades que se exportarán:")
    for entidad in df_eq["entidad"].tolist():
        print(f"  - {repr(entidad)}")

    print(
        f"\nRegistros: {len(df_eq):,}"
        f"\nEntidades únicas: {df_eq['entidad'].nunique():,}"
    )

    df_eq = df_eq.where(pd.notnull(df_eq), None)

    registros_eq = df_eq.to_dict(orient="records")
    registros_eq = limpiar_json(registros_eq)

    with open(
        salida_equipamiento,
        "w",
        encoding="utf-8",
    ) as archivo:
        json.dump(
            registros_eq,
            archivo,
            ensure_ascii=False,
            indent=4,
            allow_nan=False,
        )

    print("\nArchivo generado correctamente:")
    print(salida_equipamiento.resolve())
    print("=" * 70)

except ValueError as error:
    print("No se encontró o no pudo leerse la hoja 'equipamiento'.")
    print(f"Detalle: {error}")

except Exception as error:
    print(f"Error al generar equipamiento.json: {error}")
    raise
