# Dashboard IMSS-Bienestar — GitHub Pages

Proyecto estático para GitHub Pages. No requiere backend.

## Uso local

```bash
pip install pandas openpyxl
python scripts/build_data.py
python -m http.server 8000
```

Abrir:

```text
http://localhost:8000
```

## Actualizar datos

Coloca tu Excel en:

```text
excel/unidades.xlsx
```

Ejecuta:

```bash
python scripts/build_data.py
```

Después sube cambios a GitHub.

## GitHub Pages

Settings → Pages → Deploy from branch → main → /root
