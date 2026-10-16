from sqlalchemy.orm import Session
from sqlalchemy import text
from datetime import datetime
from typing import List, Optional
import io
import os
import openpyxl
from openpyxl.styles import Font, PatternFill, Alignment, Border, Side
from openpyxl.drawing.image import Image as OpenpyxlImage
from PIL import Image as PILImage
from app.models.marcas import Marca, Cuenta
from app.schemas.marcas import MarcaCreate, MarcaUpdate

class MarcasService:
    @staticmethod
    def get_all(db: Session) -> List[dict]:
        marcas = db.query(Marca).order_by(Marca.id.desc()).all()
        results = []
        for m in marcas:
            # Obtener cuenta bancaria principal
            cuenta = db.query(Cuenta).filter(Cuenta.marca_id == m.id).first()
            banco = cuenta.banco if cuenta else None
            no_cuenta = cuenta.no_cuenta if cuenta else None

            # Calcular productos activos
            sku_count = db.execute(
                text("SELECT COUNT(*) FROM productos WHERE marca_id = :marca_id"),
                {"marca_id": m.id}
            ).scalar() or 0

            # Calcular ventas del mes actual
            sales_sum = db.execute(
                text("""
                    SELECT COALESCE(SUM(vd.subtotal), 0)
                    FROM venta_detalles vd
                    JOIN productos p ON vd.producto_id = p.id
                    JOIN ventas v ON vd.venta_id = v.id
                    WHERE p.marca_id = :marca_id
                    AND date_trunc('month', v.fecha_venta) = date_trunc('month', CURRENT_DATE)
                """),
                {"marca_id": m.id}
            ).scalar() or 0.0

            results.append({
                "id": m.id,
                "nombre_marca": m.nombre_marca,
                "codigo": m.codigo or "",
                "categoria": m.categoria or "",
                "razon_social": m.razon_social or "",
                "ciudad_pais": m.ciudad_pais or "",
                "redes_sociales": m.redes_sociales or "",
                "nombre_representante": m.nombre_representante or "",
                "cargo": m.cargo or "",
                "contacto_nombre": m.contacto_nombre or "",
                "telefono": m.telefono or "",
                "email": m.email or "",
                "tiempo_estancia": m.tiempo_estancia or 6,
                "fecha_ingreso": m.fecha_ingreso.isoformat() if m.fecha_ingreso else None,
                "catalogo": m.catalogo or "",
                "estado_id": m.estado_id,
                "logo": m.logo or "",
                "banco": banco,
                "no_cuenta": no_cuenta,
                "activeSkus": f"{sku_count} SKUs" if m.estado_id == 1 else f"{sku_count} SKUs (En pausa)",
                "monthSales": float(sales_sum)
            })
        return results

    @staticmethod
    def get_by_id(db: Session, marca_id: int) -> Optional[dict]:
        m = db.query(Marca).filter(Marca.id == marca_id).first()
        if not m:
            return None
        cuenta = db.query(Cuenta).filter(Cuenta.marca_id == m.id).first()
        banco = cuenta.banco if cuenta else None
        no_cuenta = cuenta.no_cuenta if cuenta else None

        sku_count = db.execute(
            text("SELECT COUNT(*) FROM productos WHERE marca_id = :marca_id"),
            {"marca_id": m.id}
        ).scalar() or 0

        sales_sum = db.execute(
            text("""
                SELECT COALESCE(SUM(vd.subtotal), 0)
                FROM venta_detalles vd
                JOIN productos p ON vd.producto_id = p.id
                JOIN ventas v ON vd.venta_id = v.id
                WHERE p.marca_id = :marca_id
                AND date_trunc('month', v.fecha_venta) = date_trunc('month', CURRENT_DATE)
            """),
            {"marca_id": m.id}
        ).scalar() or 0.0

        return {
            "id": m.id,
            "nombre_marca": m.nombre_marca,
            "codigo": m.codigo or "",
            "categoria": m.categoria or "",
            "razon_social": m.razon_social or "",
            "ciudad_pais": m.ciudad_pais or "",
            "redes_sociales": m.redes_sociales or "",
            "nombre_representante": m.nombre_representante or "",
            "cargo": m.cargo or "",
            "contacto_nombre": m.contacto_nombre or "",
            "telefono": m.telefono or "",
            "email": m.email or "",
            "tiempo_estancia": m.tiempo_estancia or 6,
            "fecha_ingreso": m.fecha_ingreso.isoformat() if m.fecha_ingreso else None,
            "catalogo": m.catalogo or "",
            "estado_id": m.estado_id,
            "logo": m.logo or "",
            "banco": banco,
            "no_cuenta": no_cuenta,
            "activeSkus": f"{sku_count} SKUs",
            "monthSales": float(sales_sum)
        }

    @staticmethod
    def create(db: Session, marca_in: MarcaCreate) -> dict:
        marca = Marca(
            nombre_marca=marca_in.nombre_marca,
            codigo=marca_in.codigo or (marca_in.nombre_marca[:3].upper() if marca_in.nombre_marca else "MC"),
            categoria=marca_in.categoria,
            razon_social=marca_in.razon_social,
            ciudad_pais=marca_in.ciudad_pais,
            redes_sociales=marca_in.redes_sociales,
            nombre_representante=marca_in.nombre_representante,
            cargo=marca_in.cargo,
            contacto_nombre=marca_in.contacto_nombre,
            telefono=marca_in.telefono,
            email=marca_in.email,
            tiempo_estancia=marca_in.tiempo_estancia,
            fecha_ingreso=marca_in.fecha_ingreso or datetime.utcnow(),
            catalogo=marca_in.catalogo,
            estado_id=marca_in.estado_id,
            logo=marca_in.logo,
            fecha_registro=datetime.utcnow()
        )
        db.add(marca)
        db.commit()
        db.refresh(marca)

        # Crear cuenta bancaria si fue provista
        if marca_in.banco or marca_in.no_cuenta:
            cuenta = Cuenta(
                marca_id=marca.id,
                banco=marca_in.banco,
                no_cuenta=marca_in.no_cuenta
            )
            db.add(cuenta)
            db.commit()
            db.refresh(cuenta)
            marca.cuentas = cuenta.id
            db.commit()

        return MarcasService.get_by_id(db, marca.id)

    @staticmethod
    def update(db: Session, marca_id: int, marca_in: MarcaUpdate) -> Optional[dict]:
        marca = db.query(Marca).filter(Marca.id == marca_id).first()
        if not marca:
            return None

        update_data = marca_in.dict(exclude_unset=True)
        banco = update_data.pop("banco", None)
        no_cuenta = update_data.pop("no_cuenta", None)

        for key, value in update_data.items():
            setattr(marca, key, value)

        db.commit()

        # Actualizar cuenta bancaria
        if banco is not None or no_cuenta is not None:
            cuenta = db.query(Cuenta).filter(Cuenta.marca_id == marca.id).first()
            if cuenta:
                if banco is not None:
                    cuenta.banco = banco
                if no_cuenta is not None:
                    cuenta.no_cuenta = no_cuenta
            else:
                cuenta = Cuenta(
                    marca_id=marca.id,
                    banco=banco or "",
                    no_cuenta=no_cuenta or ""
                )
                db.add(cuenta)
                db.flush()
                marca.cuentas = cuenta.id
            db.commit()

        return MarcasService.get_by_id(db, marca.id)

    @staticmethod
    def update_logo(db: Session, marca_id: int, logo_url: str) -> Optional[dict]:
        marca = db.query(Marca).filter(Marca.id == marca_id).first()
        if not marca:
            return None
        marca.logo = logo_url
        db.commit()
        return MarcasService.get_by_id(db, marca.id)

    @staticmethod
    def generate_delivery_sheet(db: Session, marca_id: int):
        marca = db.query(Marca).filter(Marca.id == marca_id).first()
        if not marca:
            return None, None

        # Consultar productos de la marca
        productos = db.execute(
            text("""
                SELECT p.id, p.sku, p.nombre, p.descripcion, p.precio, i.stock_critico
                FROM productos p
                LEFT JOIN inventario i ON i.producto_id = p.id
                WHERE p.marca_id = :marca_id
                ORDER BY p.nombre ASC
            """),
            {"marca_id": marca_id}
        ).fetchall()

        wb = openpyxl.Workbook()

        # ==========================================
        # HOJA 1: FICHA Y PLANTILLA DE CARGA
        # ==========================================
        ws = wb.active
        ws.title = "Ficha_Entrega"
        ws.views.sheetView[0].showGridLines = True

        # ------------------------------------------
        # PALETA DE COLOR EJECUTIVA
        # ------------------------------------------
        c_primary_dark = "0F172A"  # Slate 900
        c_indigo = "4F46E5"        # Indigo 600
        c_indigo_dark = "3730A3"   # Indigo 800
        c_indigo_light = "EEF2FF"  # Indigo 50
        c_header_gray = "1E293B"   # Slate 800
        c_card_bg = "F8FAFC"       # Slate 50
        c_card_label = "F1F5F9"    # Slate 100
        c_zebra = "F8FAFC"         # Alternancia de filas
        c_editable_bg = "FEF9C3"   # Amarillo pastel para entrada de datos
        c_border_light = "E2E8F0"  # Slate 200
        c_border_med = "CBD5E1"    # Slate 300
        c_text_muted = "64748B"    # Slate 500

        # ------------------------------------------
        # FUENTES TIPOGRÁFICAS
        # ------------------------------------------
        f_title = Font(name="Segoe UI", size=14, bold=True, color=c_primary_dark)
        f_sub = Font(name="Segoe UI", size=9, color=c_text_muted)
        f_badge = Font(name="Segoe UI", size=8, bold=True, color=c_indigo)
        f_folio = Font(name="Segoe UI", size=9, bold=True, color=c_primary_dark)
        f_sec_title = Font(name="Segoe UI", size=9, bold=True, color="334155")
        f_meta_lbl = Font(name="Segoe UI", size=8, bold=True, color=c_text_muted)
        f_meta_val = Font(name="Segoe UI", size=9, bold=True, color=c_primary_dark)
        f_th = Font(name="Segoe UI", size=9, bold=True, color="FFFFFF")
        f_th_action = Font(name="Segoe UI", size=9, bold=True, color="FFFFFF")
        f_td = Font(name="Segoe UI", size=9, color="1E293B")
        f_td_code = Font(name="Consolas", size=9, color="334155")
        f_qty = Font(name="Segoe UI", size=10, bold=True, color=c_indigo_dark)

        # ------------------------------------------
        # RELLENOS Y BORDES
        # ------------------------------------------
        fill_sec = PatternFill(start_color=c_card_label, end_color=c_card_label, fill_type="solid")
        fill_meta_lbl = PatternFill(start_color=c_card_bg, end_color=c_card_bg, fill_type="solid")
        fill_white = PatternFill(start_color="FFFFFF", end_color="FFFFFF", fill_type="solid")
        fill_th = PatternFill(start_color=c_header_gray, end_color=c_header_gray, fill_type="solid")
        fill_th_action = PatternFill(start_color=c_indigo_dark, end_color=c_indigo_dark, fill_type="solid")
        fill_qty = PatternFill(start_color=c_editable_bg, end_color=c_editable_bg, fill_type="solid")
        fill_zebra = PatternFill(start_color=c_zebra, end_color=c_zebra, fill_type="solid")
        fill_badge = PatternFill(start_color=c_indigo_light, end_color=c_indigo_light, fill_type="solid")

        b_thin = Border(
            left=Side(style="thin", color=c_border_light),
            right=Side(style="thin", color=c_border_light),
            top=Side(style="thin", color=c_border_light),
            bottom=Side(style="thin", color=c_border_light),
        )
        b_med = Border(
            left=Side(style="thin", color=c_border_med),
            right=Side(style="thin", color=c_border_med),
            top=Side(style="thin", color=c_border_med),
            bottom=Side(style="thin", color=c_border_med),
        )
        b_total = Border(
            top=Side(style="thin", color=c_indigo),
            bottom=Side(style="double", color=c_indigo_dark),
            left=Side(style="thin", color=c_border_light),
            right=Side(style="thin", color=c_border_light),
        )

        # ------------------------------------------
        # ANCHO DE COLUMNAS EQUILIBRADO
        # ------------------------------------------
        col_widths = {
            "A": 9,   # ID / No.
            "B": 18,  # SKU / Código
            "C": 34,  # Descripción Producto
            "D": 22,  # Variante / Talla
            "E": 16,  # Precio Venta
            "F": 18,  # CANT. ENTREGADA (Acción)
            "G": 16,  # Costo Unitario
            "H": 22,  # Observaciones
        }
        for col_letter, width in col_widths.items():
            ws.column_dimensions[col_letter].width = width

        # ==========================================
        # 1. ENCABEZADO PRINCIPAL (Row 1 a 3)
        # ==========================================
        ws.row_dimensions[1].height = 8
        ws.row_dimensions[2].height = 24
        ws.row_dimensions[3].height = 20
        ws.row_dimensions[4].height = 8

        # Logo de la Marca o Monograma en A2:A3
        ws.merge_cells("A2:A3")
        logo_inserted = False
        if getattr(marca, "logo", None):
            clean_logo = marca.logo.lstrip("/").replace("/", os.sep)
            if os.path.exists(clean_logo):
                try:
                    with PILImage.open(clean_logo) as pil_img:
                        w, h = pil_img.size
                        ratio = min(75 / w, 42 / h, 1.0)
                        target_w, target_h = int(w * ratio), int(h * ratio)

                    img = OpenpyxlImage(clean_logo)
                    img.width = target_w
                    img.height = target_h
                    ws.add_image(img, "A2")
                    logo_inserted = True
                except Exception:
                    pass

        if not logo_inserted:
            cell_logo = ws["A2"]
            cell_logo.value = (
                marca.codigo[:3] if marca.codigo else marca.nombre_marca[:2]
            ).upper()
            cell_logo.font = Font(name="Segoe UI", size=13, bold=True, color="FFFFFF")
            cell_logo.fill = PatternFill(start_color=c_indigo, end_color=c_indigo, fill_type="solid")
            cell_logo.alignment = Alignment(horizontal="center", vertical="center")

        # Título & Subtítulo
        ws.merge_cells("B2:F2")
        ws["B2"].value = "FICHA DE RECEPCIÓN Y ENTREGA DE MERCADERÍA"
        ws["B2"].font = f_title
        ws["B2"].alignment = Alignment(horizontal="left", vertical="center")

        ws.merge_cells("B3:F3")
        ws["B3"].value = "Control oficial de inventario en consignación • Tienda Física y Terminales POS"
        ws["B3"].font = f_sub
        ws["B3"].alignment = Alignment(horizontal="left", vertical="center")

        # Tarjeta de Folio / Fecha (Cols G:H)
        ws.merge_cells("G2:H2")
        ws["G2"].value = "DOCUMENTO OFICIAL DE INGRESO"
        ws["G2"].font = f_badge
        ws["G2"].fill = fill_badge
        ws["G2"].alignment = Alignment(horizontal="center", vertical="center")

        ws.merge_cells("G3:H3")
        fecha_emision = datetime.now().strftime("%Y-%m-%d %H:%M")
        ws["G3"].value = f"EMISIÓN: {fecha_emision}"
        ws["G3"].font = f_folio
        ws["G3"].fill = fill_meta_lbl
        ws["G3"].border = b_thin
        ws["G3"].alignment = Alignment(horizontal="center", vertical="center")

        # ==========================================
        # 2. SECCIÓN: INFORMACIÓN DE LA MARCA
        # ==========================================
        ws.row_dimensions[5].height = 20
        ws.merge_cells("A5:H5")
        sec1 = ws["A5"]
        sec1.value = "  1. INFORMACIÓN DE LA MARCA ALIADA"
        sec1.font = f_sec_title
        sec1.fill = fill_sec
        sec1.alignment = Alignment(horizontal="left", vertical="center")
        for col in ["A", "B", "C", "D", "E", "F", "G", "H"]:
            ws[f"{col}5"].border = b_thin

        ws.row_dimensions[6].height = 20
        ws.row_dimensions[7].height = 20

        info_matrix = [
            # Fila 6
            [
                ("A", "CÓDIGO:", f_meta_lbl, "center"),
                ("B", f"{marca.codigo or 'N/A'} (ID #{marca.id})", f_meta_val, "left"),
                ("C", "MARCA:", f_meta_lbl, "right"),
                ("D", marca.nombre_marca, f_meta_val, "left"),
                ("E", "CATEGORÍA:", f_meta_lbl, "right"),
                ("F", marca.categoria or "General", f_meta_val, "left"),
                ("G", "CIUDAD/PAÍS:", f_meta_lbl, "right"),
                ("H", marca.ciudad_pais or "N/A", f_meta_val, "left"),
            ],
            # Fila 7
            [
                ("A", "RAZÓN SOCIAL:", f_meta_lbl, "center"),
                ("B", marca.razon_social or "N/A", f_meta_val, "left"),
                ("C", "REPRESENTANTE:", f_meta_lbl, "right"),
                ("D", marca.nombre_representante or "N/A", f_meta_val, "left"),
                ("E", "TELÉFONO:", f_meta_lbl, "right"),
                ("F", marca.telefono or "N/A", f_meta_val, "left"),
                ("G", "CORREO:", f_meta_lbl, "right"),
                ("H", marca.email or "N/A", f_meta_val, "left"),
            ],
        ]

        for row_idx, row_data in enumerate(info_matrix, start=6):
            for col_l, val, fnt, align in row_data:
                c = ws[f"{col_l}{row_idx}"]
                c.value = val
                c.font = fnt
                c.border = b_thin
                c.alignment = Alignment(horizontal=align, vertical="center")
                if fnt == f_meta_lbl:
                    c.fill = fill_meta_lbl

        ws.row_dimensions[8].height = 10

        # ==========================================
        # 3. SECCIÓN: TABLA DE PRODUCTOS
        # ==========================================
        ws.row_dimensions[9].height = 20
        ws.merge_cells("A9:D9")
        ws["A9"].value = "  2. DETALLE DE PRODUCTOS A INGRESAR"
        ws["A9"].font = f_sec_title
        ws["A9"].alignment = Alignment(horizontal="left", vertical="center")

        ws.merge_cells("E9:H9")
        ws["E9"].value = "✎ Llenar columna destacada [CANT. ENTREGADA] con el conteo físico real  "
        ws["E9"].font = Font(name="Segoe UI", size=8, italic=True, color=c_indigo)
        ws["E9"].alignment = Alignment(horizontal="right", vertical="center")

        # Cabecera de la Tabla
        headers = [
            ("A", "ITEM", "center", fill_th, f_th),
            ("B", "SKU / CÓDIGO", "center", fill_th, f_th),
            ("C", "NOMBRE DEL PRODUCTO", "left", fill_th, f_th),
            ("D", "DESCRIPCIÓN / VARIANTE", "left", fill_th, f_th),
            ("E", "PRECIO (USD)", "right", fill_th, f_th),
            ("F", "CANT. ENTREGADA ✎", "center", fill_th_action, f_th_action),
            ("G", "COSTO UNIT.", "right", fill_th, f_th),
            ("H", "ESTADO / CONDICIÓN", "center", fill_th, f_th),
        ]

        ws.row_dimensions[10].height = 26
        for col_l, title, align, fill_c, font_c in headers:
            c = ws[f"{col_l}10"]
            c.value = title
            c.font = font_c
            c.fill = fill_c
            c.border = b_med
            c.alignment = Alignment(horizontal=align, vertical="center", wrap_text=True)

        # Filas de datos
        start_row = 11
        if productos:
            for idx, p in enumerate(productos):
                r = start_row + idx
                ws.row_dimensions[r].height = 20
                is_zebra = idx % 2 != 0
                row_fill = fill_zebra if is_zebra else fill_white

                ws[f"A{r}"].value = idx + 1
                ws[f"B{r}"].value = p[1] or f"SKU-{p[0]}"
                ws[f"C{r}"].value = p[2]
                ws[f"D{r}"].value = p[3] or "Única"
                ws[f"E{r}"].value = float(p[4]) if p[4] else 0.0
                ws[f"E{r}"].number_format = "$#,##0.00"

                cell_qty = ws[f"F{r}"]
                cell_qty.value = ""
                cell_qty.font = f_qty
                cell_qty.fill = fill_qty
                cell_qty.alignment = Alignment(horizontal="center", vertical="center")
                cell_qty.number_format = "#,##0"

                ws[f"G{r}"].value = float(p[5]) if len(p) > 5 and p[5] else 0.0
                ws[f"G{r}"].number_format = "$#,##0.00"
                ws[f"H{r}"].value = "Nuevo Ingreso"

                for col_l in ["A", "B", "C", "D", "E", "G", "H"]:
                    cell = ws[f"{col_l}{r}"]
                    cell.border = b_thin
                    cell.font = f_td_code if col_l == "B" else f_td
                    if col_l != "F":
                        cell.fill = row_fill
                    if col_l in ["A", "H"]:
                        cell.alignment = Alignment(horizontal="center", vertical="center")
                    elif col_l in ["E", "G"]:
                        cell.alignment = Alignment(horizontal="right", vertical="center")
                    else:
                        cell.alignment = Alignment(horizontal="left", vertical="center")

                cell_qty.border = b_thin

            last_data_row = start_row + len(productos) - 1
        else:
            for idx in range(1, 11):
                r = start_row + idx - 1
                ws.row_dimensions[r].height = 20
                row_fill = fill_zebra if idx % 2 == 0 else fill_white

                ws[f"A{r}"].value = idx
                ws[f"B{r}"].value = f"{marca.codigo or 'PRD'}-{idx:03d}"
                ws[f"C{r}"].value = f"[Escriba Nombre Producto {idx}]"
                ws[f"D{r}"].value = "Talla/Color/Variante"
                ws[f"E{r}"].value = 0.0
                ws[f"E{r}"].number_format = "$#,##0.00"

                cell_qty = ws[f"F{r}"]
                cell_qty.value = ""
                cell_qty.fill = fill_qty
                cell_qty.font = f_qty
                cell_qty.number_format = "#,##0"
                cell_qty.alignment = Alignment(horizontal="center", vertical="center")

                ws[f"G{r}"].value = 0.0
                ws[f"G{r}"].number_format = "$#,##0.00"
                ws[f"H{r}"].value = "Nuevo Ingreso"

                for col_l in ["A", "B", "C", "D", "E", "G", "H"]:
                    c = ws[f"{col_l}{r}"]
                    c.border = b_thin
                    c.fill = row_fill
                    c.font = f_td_code if col_l == "B" else f_td
                    if col_l in ["A", "H"]:
                        c.alignment = Alignment(horizontal="center", vertical="center")
                    elif col_l in ["E", "G"]:
                        c.alignment = Alignment(horizontal="right", vertical="center")
                    else:
                        c.alignment = Alignment(horizontal="left", vertical="center")

                cell_qty.border = b_thin

            last_data_row = start_row + 9

        # ==========================================
        # 4. FILA DE TOTALES EJECUTIVA
        # ==========================================
        tot_row = last_data_row + 1
        ws.row_dimensions[tot_row].height = 24

        ws.merge_cells(f"A{tot_row}:E{tot_row}")
        lbl_tot = ws[f"A{tot_row}"]
        lbl_tot.value = "TOTAL DE UNIDADES ENTREGADAS:"
        lbl_tot.font = Font(name="Segoe UI", size=9, bold=True, color=c_primary_dark)
        lbl_tot.alignment = Alignment(horizontal="right", vertical="center")
        lbl_tot.fill = fill_meta_lbl
        for c in ["A", "B", "C", "D", "E"]:
            ws[f"{c}{tot_row}"].border = b_total

        cell_sum = ws[f"F{tot_row}"]
        cell_sum.value = f"=SUM(F{start_row}:F{last_data_row})"
        cell_sum.font = Font(name="Segoe UI", size=11, bold=True, color=c_indigo_dark)
        cell_sum.fill = PatternFill(start_color=c_indigo_light, end_color=c_indigo_light, fill_type="solid")
        cell_sum.alignment = Alignment(horizontal="center", vertical="center")
        cell_sum.border = b_total
        cell_sum.number_format = "#,##0"

        for c in ["G", "H"]:
            ws[f"{c}{tot_row}"].border = b_total
            ws[f"{c}{tot_row}"].fill = fill_meta_lbl

        # ==========================================
        # 5. RECUADROS FORMALES DE FIRMAS
        # ==========================================
        sign_start = tot_row + 3
        ws.row_dimensions[sign_start].height = 18
        ws.row_dimensions[sign_start + 1].height = 45
        ws.row_dimensions[sign_start + 2].height = 18
        ws.row_dimensions[sign_start + 3].height = 16

        # Bloque 1: Entregado por (Marca) -> Cols B a C
        ws.merge_cells(f"B{sign_start}:C{sign_start}")
        ws[f"B{sign_start}"].value = "ENTREGADO POR (MARCA ALIADA)"
        ws[f"B{sign_start}"].font = f_badge
        ws[f"B{sign_start}"].fill = fill_badge
        ws[f"B{sign_start}"].alignment = Alignment(horizontal="center", vertical="center")

        ws.merge_cells(f"B{sign_start+1}:C{sign_start+1}")
        ws[f"B{sign_start+1}"].border = b_med

        ws.merge_cells(f"B{sign_start+2}:C{sign_start+2}")
        ws[f"B{sign_start+2}"].value = (marca.nombre_representante or marca.nombre_marca)
        ws[f"B{sign_start+2}"].font = f_meta_val
        ws[f"B{sign_start+2}"].alignment = Alignment(horizontal="center", vertical="center")

        ws.merge_cells(f"B{sign_start+3}:C{sign_start+3}")
        ws[f"B{sign_start+3}"].value = "Firma / Cédula o DNI"
        ws[f"B{sign_start+3}"].font = f_sub
        ws[f"B{sign_start+3}"].alignment = Alignment(horizontal="center", vertical="center")

        # Bloque 2: Recibido por (Tienda) -> Cols F a G
        ws.merge_cells(f"F{sign_start}:G{sign_start}")
        ws[f"F{sign_start}"].value = "RECIBIDO POR (TIENDA / INVENTARIO)"
        ws[f"F{sign_start}"].font = f_badge
        ws[f"F{sign_start}"].fill = fill_badge
        ws[f"F{sign_start}"].alignment = Alignment(horizontal="center", vertical="center")

        ws.merge_cells(f"F{sign_start+1}:G{sign_start+1}")
        ws[f"F{sign_start+1}"].border = b_med

        ws.merge_cells(f"F{sign_start+2}:G{sign_start+2}")
        ws[f"F{sign_start+2}"].value = "Encargado de Inventario / Recepción"
        ws[f"F{sign_start+2}"].font = f_meta_val
        ws[f"F{sign_start+2}"].alignment = Alignment(horizontal="center", vertical="center")

        ws.merge_cells(f"F{sign_start+3}:G{sign_start+3}")
        ws[f"F{sign_start+3}"].value = "Firma y Sello de Conformidad"
        ws[f"F{sign_start+3}"].font = f_sub
        ws[f"F{sign_start+3}"].alignment = Alignment(horizontal="center", vertical="center")

        # ==========================================
        # HOJA 2: GUÍA DE IMPORTACIÓN
        # ==========================================
        ws_info = wb.create_sheet(title="Instrucciones_Carga")
        ws_info.views.sheetView[0].showGridLines = True
        ws_info.column_dimensions["A"].width = 6
        ws_info.column_dimensions["B"].width = 24
        ws_info.column_dimensions["C"].width = 65

        ws_info.row_dimensions[2].height = 25
        ws_info["B2"] = "GUÍA RÁPIDA DE INGRESO A INVENTARIO"
        ws_info["B2"].font = Font(name="Segoe UI", size=13, bold=True, color=c_indigo)

        steps = [
            (
                "Paso 1: Conteo Físico",
                "La marca aliada entrega su mercancía y llena la columna destacada 'CANT. ENTREGADA' en la hoja principal.",
            ),
            (
                "Paso 2: Validación de SKUs",
                "Cada fila conserva el SKU y nombre para vincularse de inmediato con la base de datos de productos.",
            ),
            (
                "Paso 3: Carga en Sistema",
                "Al importar este archivo en el módulo de Recepción, las existencias se actualizarán automáticamente en el Kardex.",
            ),
            (
                "Paso 4: Nuevos Artículos",
                "Si se agregan filas adicionales con nuevos SKUs, el sistema los creará automáticamente bajo la marca aliada.",
            ),
        ]

        for s_idx, (st_title, st_desc) in enumerate(steps, start=4):
            ws_info.row_dimensions[s_idx].height = 24
            ws_info[f"B{s_idx}"] = st_title
            ws_info[f"B{s_idx}"].font = Font(name="Segoe UI", size=9, bold=True, color="334155")
            ws_info[f"B{s_idx}"].border = b_thin
            ws_info[f"B{s_idx}"].fill = fill_meta_lbl

            ws_info[f"C{s_idx}"] = st_desc
            ws_info[f"C{s_idx}"].font = f_td
            ws_info[f"C{s_idx}"].border = b_thin

        output = io.BytesIO()
        wb.save(output)
        output.seek(0)

        filename = f"Ficha_Entrega_{marca.codigo or 'MARCA'}_{datetime.now().strftime('%Y%m%d')}.xlsx"
        return output, filename

    @staticmethod
    def delete(db: Session, marca_id: int) -> bool:
        marca = db.query(Marca).filter(Marca.id == marca_id).first()
        if not marca:
            return False

        # Eliminar cuentas asociadas
        db.query(Cuenta).filter(Cuenta.marca_id == marca_id).delete()
        db.delete(marca)
        db.commit()
        return True
