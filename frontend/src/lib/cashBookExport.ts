/** Ekspor Buku Kas: PDF (`jspdf` + `jspdf-autotable`), Excel (`xlsx`). */
import { jsPDF } from 'jspdf'
import autoTable from 'jspdf-autotable'
import * as XLSX from 'xlsx'
import type { CashBook } from '@/types'
import { formatCurrency, formatDate } from '@/lib/utils'

// ─── Konstanta warna PDF ──────────────────────────────────────────────────────
const PDF_BLUE: [number, number, number] = [30, 64, 175]
const SLATE: [number, number, number]    = [51, 65, 85]

// ─── Konstanta warna Excel (ARGB) ─────────────────────────────────────────────
const XL = {
  BLUE_DARK:  'FF1E40AF',
  BLUE_MED:   'FF3B82F6',
  BLUE_LIGHT: 'FFDBEAFE',
  BLUE_ROW:   'FFEFF6FF',
  GREEN:      'FF047857',
  GREEN_BG:   'FFF0FDF4',
  RED:        'FFB91C1C',
  RED_BG:     'FFFEF2F2',
  SLATE:      'FF334155',
  SLATE_MED:  'FF64748B',
  WHITE:      'FFFFFFFF',
  GRAY_LIGHT: 'FFF8FAFC',
  GRAY_ALT:   'FFF1F5F9',
  GRAY_MUTED: 'FF94A3B8',
  BORDER:     'FFE2E8F0',
  BORDER_MED: 'FF3B82F6',
} as const

type XlsxStyle = Record<string, unknown>
type HAlign = 'left' | 'center' | 'right'

function exportBasename(data: CashBook): string {
  return `buku-kas-harian_${data.period.start_date}_${data.period.end_date}`
}

// ─── Helper: style builder ────────────────────────────────────────────────────
function sty(opts: {
  bold?: boolean; italic?: boolean; sz?: number
  color?: string; bg?: string
  ha?: HAlign; indent?: number; wrap?: boolean
  numFmt?: string; borderColor?: string; borderStyle?: string
}): XlsxStyle {
  const {
    bold = false, italic = false, sz = 9,
    color = XL.SLATE, bg,
    ha = 'left', indent = 0, wrap = false,
    numFmt, borderColor = XL.BORDER, borderStyle = 'thin',
  } = opts

  const rgb = (c: string) => c.replace(/^FF/, '')
  const bSide = { style: borderStyle, color: { rgb: rgb(borderColor) } }

  return {
    font: { name: 'Arial', sz, bold, italic, color: { rgb: rgb(color) } },
    fill: bg ? { patternType: 'solid', fgColor: { rgb: rgb(bg) } } : undefined,
    alignment: { horizontal: ha, vertical: 'center', wrapText: wrap, indent },
    border: { top: bSide, bottom: bSide, left: bSide, right: bSide },
    ...(numFmt ? { numFmt } : {}),
  }
}

// ─── Helper: tulis cell ───────────────────────────────────────────────────────
function wc(
  ws: XLSX.WorkSheet, r: number, c: number,
  v: string | number | null, style: XlsxStyle,
) {
  const addr = XLSX.utils.encode_cell({ r, c })
  const t = (v !== null && typeof v === 'number') ? 'n' : 's'
  ws[addr] = { v: v ?? '', t, s: style }
}

// ─── Helper: banner row (merge semua kolom) ────────────────────────────────────
function banner(
  ws: XLSX.WorkSheet, r: number, totalCols: number,
  text: string, style: XlsxStyle,
) {
  wc(ws, r, 0, text, style)
  for (let c = 1; c < totalCols; c++) wc(ws, r, c, '', style)
  merge(ws, r, 0, r, totalCols - 1)
}

// ─── Helper: merge cells ──────────────────────────────────────────────────────
function merge(ws: XLSX.WorkSheet, r1: number, c1: number, r2: number, c2: number) {
  if (!ws['!merges']) ws['!merges'] = []
  ws['!merges'].push({ s: { r: r1, c: c1 }, e: { r: r2, c: c2 } })
}

// ════════════════════════════════════════════════════════════════════════════
// SHEET 1: Ringkasan
// ════════════════════════════════════════════════════════════════════════════
function buildSummarySheet(data: CashBook): XLSX.WorkSheet {
  const ws: XLSX.WorkSheet = {}
  const COLS = 5  // A–E

  // Row 0 – Judul
  banner(ws, 0, COLS, 'BUKU KAS HARIAN',
    sty({ bold: true, sz: 14, color: XL.WHITE, bg: XL.BLUE_DARK, ha: 'center' }))

  // Row 1 – Periode
  const period = `Periode: ${formatDate(data.period.start_date)} – ${formatDate(data.period.end_date)}`
  banner(ws, 1, COLS, period,
    sty({ sz: 9, color: XL.WHITE, bg: XL.BLUE_MED, ha: 'center' }))

  // Row 2 – Akun
  banner(ws, 2, COLS, `Akun Kas/Bank: ${data.account_codes.join(', ')}`,
    sty({ sz: 8, color: XL.WHITE, bg: XL.BLUE_MED, ha: 'center' }))

  // Row 3 – Spacer
  banner(ws, 3, COLS, '', sty({ bg: XL.WHITE, borderColor: XL.WHITE }))

  // Row 4 – Sub-header
  banner(ws, 4, COLS, 'RINGKASAN KEUANGAN',
    sty({ bold: true, sz: 10, color: XL.WHITE, bg: XL.SLATE, ha: 'center' }))

  // Rows 5–8 – Data ringkasan
  const items = [
    { label: 'Saldo Awal',         value: data.opening_balance,   color: XL.SLATE,     bg: XL.GRAY_LIGHT },
    { label: 'Total Pemasukan',    value: data.total_pemasukan,   color: XL.GREEN,     bg: XL.GREEN_BG   },
    { label: 'Total Pengeluaran',  value: data.total_pengeluaran, color: XL.RED,       bg: XL.RED_BG     },
    { label: 'Saldo Akhir',        value: data.closing_balance,   color: XL.BLUE_DARK, bg: XL.BLUE_LIGHT },
  ]

  items.forEach(({ label, value, color, bg }, i) => {
    const r = 5 + i
    const isFinal = i === 3
    const labelSty = sty({ bold: isFinal, sz: 10, color, bg, ha: 'left', indent: 2 })
    const valSty   = sty({ bold: true, sz: 10, color, bg, ha: 'right', numFmt: '"Rp "#,##0', indent: 1 })
    // Label: kolom A-D merge
    wc(ws, r, 0, label, labelSty)
    for (let c = 1; c < COLS - 1; c++) wc(ws, r, c, '', labelSty)
    merge(ws, r, 0, r, COLS - 2)
    // Value: kolom E
    wc(ws, r, COLS - 1, value, valSty)
  })

  // Row 9 – Spacer
  banner(ws, 9, COLS, '', sty({ bg: XL.WHITE, borderColor: XL.WHITE }))

  // Row 10 – Dicetak
  banner(ws, 10, COLS,
    `Dicetak: ${formatDate(new Date().toISOString())}`,
    sty({ italic: true, sz: 7, color: XL.GRAY_MUTED, ha: 'center' }))

  ws['!ref']  = XLSX.utils.encode_range({ s: { r: 0, c: 0 }, e: { r: 10, c: COLS - 1 } })
  ws['!cols'] = [{ wch: 30 }, { wch: 4 }, { wch: 4 }, { wch: 4 }, { wch: 22 }]
  ws['!rows'] = [
    { hpt: 38 }, { hpt: 20 }, { hpt: 18 }, { hpt: 8 }, { hpt: 24 },
    { hpt: 26 }, { hpt: 26 }, { hpt: 26 }, { hpt: 26 },
    { hpt: 8  }, { hpt: 16 },
  ]

  return ws
}

// ════════════════════════════════════════════════════════════════════════════
// SHEET 2: Detail Mutasi  ← disesuaikan dengan tampilan UI
// Kolom: Tanggal | No. Jurnal | Keterangan | Akun | Pemasukan | Pengeluaran | Saldo
// ════════════════════════════════════════════════════════════════════════════
function buildDetailSheet(data: CashBook): XLSX.WorkSheet {
  const ws: XLSX.WorkSheet = {}
  const TC = 7  // total kolom
  let r = 0

  // ── Banner ────────────────────────────────────────────────────────────────
  banner(ws, r++, TC, 'BUKU KAS HARIAN – DETAIL MUTASI',
    sty({ bold: true, sz: 13, color: XL.WHITE, bg: XL.BLUE_DARK, ha: 'center' }))

  const mutasiLabel =
    `Mutasi ${formatDate(data.period.start_date)} – ${formatDate(data.period.end_date)}` +
    `  |  Akun: ${data.account_codes.join(', ')}`
  banner(ws, r++, TC, mutasiLabel,
    sty({ sz: 8, color: XL.WHITE, bg: XL.BLUE_MED, ha: 'center' }))

  // Spacer
  banner(ws, r++, TC, '', sty({ bg: XL.WHITE, borderColor: XL.WHITE }))

  // ── Header kolom ──────────────────────────────────────────────────────────
  // Label, align, warna teks (Pemasukan hijau, Pengeluaran merah, lainnya putih)
  const colDefs: { label: string; ha: HAlign; color: string }[] = [
    { label: 'TANGGAL',          ha: 'center', color: XL.WHITE  },
    { label: 'NO. JURNAL',       ha: 'left',   color: XL.WHITE  },
    { label: 'KETERANGAN',       ha: 'left',   color: XL.WHITE  },
    { label: 'AKUN',             ha: 'left',   color: XL.WHITE  },
    { label: 'PEMASUKAN (RP)',   ha: 'right',  color: XL.GREEN  },
    { label: 'PENGELUARAN (RP)', ha: 'right',  color: XL.RED    },
    { label: 'SALDO (RP)',       ha: 'right',  color: XL.WHITE  },
  ]
  colDefs.forEach(({ label, ha, color }, ci) => {
    wc(ws, r, ci, label, sty({
      bold: true, sz: 8, color, bg: XL.BLUE_DARK,
      ha, indent: ha !== 'center' ? 1 : 0,
      borderColor: XL.BLUE_DARK, borderStyle: 'medium',
    }))
  })
  ws['!freeze'] = { xSplit: 0, ySplit: r + 1 } as unknown as XLSX.ColInfo
  r++

  // ── Baris Saldo Awal ──────────────────────────────────────────────────────
  const saLabel = `Saldo Awal — ${formatDate(data.period.start_date)}`
  const saSty   = sty({ italic: true, sz: 8, color: XL.GRAY_MUTED, bg: XL.GRAY_LIGHT, ha: 'left', indent: 1 })
  ;[0, 1, 2, 3].forEach(ci => wc(ws, r, ci, ci === 0 ? saLabel : '', saSty))
  merge(ws, r, 0, r, 3)
  ;[4, 5].forEach(ci => wc(ws, r, ci, '', sty({ bg: XL.GRAY_LIGHT })))
  wc(ws, r, 6, data.opening_balance,
    sty({ bold: true, sz: 9, color: XL.SLATE, bg: XL.GRAY_LIGHT, ha: 'right', numFmt: '"Rp "#,##0', indent: 1 }))
  r++

  // ── Baris transaksi ───────────────────────────────────────────────────────
  if (data.rows.length === 0) {
    banner(ws, r++, TC, 'Tidak ada transaksi Kas/Bank dalam periode ini.',
      sty({ italic: true, sz: 9, color: XL.GRAY_MUTED, bg: XL.GRAY_LIGHT, ha: 'center' }))
  } else {
    data.rows.forEach((row, i) => {
      const alt    = i % 2 === 1
      const rowBg  = alt ? XL.GRAY_ALT : XL.WHITE

      // Tanggal
      wc(ws, r, 0, formatDate(row.date), sty({ sz: 9, color: XL.SLATE, bg: rowBg, ha: 'left', indent: 1 }))

      // No. Jurnal — badge biru seperti UI
      wc(ws, r, 1, row.journal_number, sty({
        bold: true, sz: 8, color: XL.BLUE_DARK,
        bg: alt ? XL.BLUE_LIGHT : XL.BLUE_ROW,
        ha: 'left', indent: 1,
        borderColor: XL.BLUE_MED,
      }))

      // Keterangan
      wc(ws, r, 2, row.description ?? '—', sty({ sz: 9, color: XL.SLATE, bg: rowBg, indent: 1 }))

      // Akun: "kode · nama" seperti di UI
      const akunLabel = `${row.account_code} · ${row.account_name}`
      wc(ws, r, 3, akunLabel, sty({ sz: 8, color: XL.SLATE_MED, bg: rowBg, indent: 1 }))

      // Pemasukan
      wc(ws, r, 4,
        row.pemasukan ?? null,
        sty({
          bold: row.pemasukan != null, sz: 9,
          color: row.pemasukan != null ? XL.GREEN : XL.GRAY_MUTED,
          bg:    row.pemasukan != null ? XL.GREEN_BG : rowBg,
          ha: 'right', numFmt: '"Rp "#,##0', indent: 1,
        }),
      )

      // Pengeluaran
      wc(ws, r, 5,
        row.pengeluaran ?? null,
        sty({
          bold: row.pengeluaran != null, sz: 9,
          color: row.pengeluaran != null ? XL.RED : XL.GRAY_MUTED,
          bg:    row.pengeluaran != null ? XL.RED_BG : rowBg,
          ha: 'right', numFmt: '"Rp "#,##0', indent: 1,
        }),
      )

      // Saldo
      wc(ws, r, 6, row.saldo,
        sty({
          bold: true, sz: 9, color: XL.SLATE,
          bg: alt ? XL.BLUE_LIGHT : XL.BLUE_ROW,
          ha: 'right', numFmt: '"Rp "#,##0', indent: 1,
        }),
      )

      r++
    })

    // ── Baris Saldo Akhir ────────────────────────────────────────────────────
    const endSty = sty({
      bold: true, sz: 9, color: XL.BLUE_DARK, bg: XL.BLUE_ROW,
      ha: 'left', indent: 1, borderColor: XL.BLUE_MED, borderStyle: 'medium',
    })
    const endLabel = `Saldo Akhir — ${formatDate(data.period.end_date)}`
    ;[0, 1, 2, 3].forEach(ci => wc(ws, r, ci, ci === 0 ? endLabel : '', endSty))
    merge(ws, r, 0, r, 3)

    wc(ws, r, 4, data.total_pemasukan,
      sty({ bold: true, sz: 9, color: XL.GREEN, bg: XL.BLUE_ROW, ha: 'right', numFmt: '"Rp "#,##0', indent: 1, borderColor: XL.BLUE_MED, borderStyle: 'medium' }))
    wc(ws, r, 5, data.total_pengeluaran,
      sty({ bold: true, sz: 9, color: XL.RED,   bg: XL.BLUE_ROW, ha: 'right', numFmt: '"Rp "#,##0', indent: 1, borderColor: XL.BLUE_MED, borderStyle: 'medium' }))
    wc(ws, r, 6, data.closing_balance,
      sty({ bold: true, sz: 9, color: XL.BLUE_DARK, bg: XL.BLUE_ROW, ha: 'right', numFmt: '"Rp "#,##0', indent: 1, borderColor: XL.BLUE_MED, borderStyle: 'medium' }))
    r++
  }

  // ── Footer ───────────────────────────────────────────────────────────────
  r++
  banner(ws, r, TC,
    `Dicetak: ${formatDate(new Date().toISOString())}  ·  Dokumen ini digenerate otomatis oleh sistem`,
    sty({ italic: true, sz: 7, color: XL.GRAY_MUTED, ha: 'center' }))

  ws['!ref']  = XLSX.utils.encode_range({ s: { r: 0, c: 0 }, e: { r, c: TC - 1 } })
  ws['!cols'] = [
    { wch: 14 },  // Tanggal
    { wch: 22 },  // No. Jurnal
    { wch: 52 },  // Keterangan
    { wch: 18 },  // Akun
    { wch: 18 },  // Pemasukan
    { wch: 18 },  // Pengeluaran
    { wch: 18 },  // Saldo
  ]

  // Print landscape A4, header ulang tiap halaman
  ws['!pageSetup']    = { orientation: 'landscape', paperSize: 9, fitToWidth: 1, fitToPage: true }
  ws['!printTitles']  = { rows: { min: 1, max: 4 } }

  return ws
}

// ════════════════════════════════════════════════════════════════════════════
// EXPORT PDF (landscape, sudah diperbaiki sebelumnya)
// ════════════════════════════════════════════════════════════════════════════
export function exportCashBookPdf(data: CashBook): void {
  const doc = new jsPDF({ orientation: 'landscape', unit: 'mm', format: 'a4' })
  const pageW = doc.internal.pageSize.getWidth()
  const margin = 14
  const contentW = pageW - margin * 2

  doc.setFillColor(...PDF_BLUE)
  doc.rect(0, 0, pageW, 30, 'F')

  doc.setTextColor(255, 255, 255)
  doc.setFontSize(15)
  doc.setFont('helvetica', 'bold')
  doc.text('Buku Kas Harian', margin, 13)

  doc.setFont('helvetica', 'normal')
  doc.setFontSize(9)
  doc.text(`Mutasi ${formatDate(data.period.start_date)} – ${formatDate(data.period.end_date)}`, margin, 21)

  doc.setFontSize(8)
  doc.text(`Dicetak ${formatDate(new Date().toISOString())}  ·  Kas/Bank: ${data.account_codes.join(', ')}`, margin, 27)

  let y = 38
  doc.setDrawColor(226, 232, 240)
  doc.setFillColor(248, 250, 252)
  doc.roundedRect(margin, y, contentW, 20, 1.5, 1.5, 'FD')

  doc.setFont('helvetica', 'normal')
  doc.setFontSize(7)
  doc.setTextColor(100, 116, 139)
  const quad = contentW / 4
  const summaryItems: { label: string; value: number; rgb: [number, number, number] }[] = [
    { label: 'Saldo Awal',        value: data.opening_balance,   rgb: SLATE           },
    { label: 'Total Pemasukan',   value: data.total_pemasukan,   rgb: [4, 120, 87]    },
    { label: 'Total Pengeluaran', value: data.total_pengeluaran, rgb: [185, 28, 28]   },
    { label: 'Saldo Akhir',       value: data.closing_balance,   rgb: PDF_BLUE        },
  ]
  summaryItems.forEach((item, i) => {
    const x = margin + i * quad + 2
    doc.text(item.label, x, y + 6)
    doc.setFont('helvetica', 'bold')
    doc.setFontSize(9)
    doc.setTextColor(...item.rgb)
    doc.text(formatCurrency(item.value), x, y + 14)
    doc.setFont('helvetica', 'normal')
    doc.setFontSize(7)
    doc.setTextColor(100, 116, 139)
  })

  doc.setTextColor(30, 41, 59)
  y += 26

  // Kolom: Tanggal | No. Jurnal | Keterangan | Akun | Pemasukan | Pengeluaran | Saldo
  const head = [['Tanggal', 'No. Jurnal', 'Keterangan', 'Akun', 'Pemasukan (Rp)', 'Pengeluaran (Rp)', 'Saldo (Rp)']]

  const openingLabel = `Saldo Awal — ${formatDate(data.period.start_date)}`
  const body: unknown[][] = [
    [
      { content: openingLabel, colSpan: 4, styles: { fillColor: [241, 245, 249], fontStyle: 'italic', textColor: [100, 116, 139] } },
      '', '',
      { content: formatCurrency(data.opening_balance), styles: { fontStyle: 'bold' } },
    ],
  ]

  for (const row of data.rows) {
    body.push([
      formatDate(row.date),
      row.journal_number,
      row.description ?? '—',
      `${row.account_code} · ${row.account_name}`,
      row.pemasukan != null
        ? { content: formatCurrency(row.pemasukan), styles: { textColor: [4, 120, 87] } }
        : '',
      row.pengeluaran != null
        ? { content: formatCurrency(row.pengeluaran), styles: { textColor: [185, 28, 28] } }
        : '',
      { content: formatCurrency(row.saldo), styles: { fontStyle: 'bold' } },
    ])
  }

  if (data.rows.length === 0) {
    body.push([{
      content: 'Tidak ada transaksi Kas/Bank dalam periode ini.',
      colSpan: 7,
      styles: { halign: 'center', textColor: [100, 116, 139], fontStyle: 'italic' },
    }])
  } else {
    body.push([
      {
        content: `Saldo Akhir — ${formatDate(data.period.end_date)}`,
        colSpan: 4,
        styles: { fillColor: [239, 246, 255], fontStyle: 'bold', textColor: PDF_BLUE },
      },
      { content: formatCurrency(data.total_pemasukan),   styles: { textColor: [4, 120, 87],   fontStyle: 'bold', fillColor: [239, 246, 255] } },
      { content: formatCurrency(data.total_pengeluaran), styles: { textColor: [185, 28, 28],  fontStyle: 'bold', fillColor: [239, 246, 255] } },
      { content: formatCurrency(data.closing_balance),   styles: { textColor: PDF_BLUE,        fontStyle: 'bold', fillColor: [239, 246, 255] } },
    ])
  }

  autoTable(doc, {
    startY: y,
    head,
    body,
    theme: 'plain',
    margin: { left: margin, right: margin },
    styles: {
      fontSize: 7.5,
      cellPadding: { top: 1.5, bottom: 1.5, left: 2, right: 2 },
      lineColor: [226, 232, 240],
      lineWidth: 0.1,
      valign: 'middle',
    },
    headStyles: {
      fillColor: PDF_BLUE,
      textColor: 255,
      fontStyle: 'bold',
      halign: 'center',
    },
    columnStyles: {
      0: { cellWidth: 26, halign: 'center' },
      1: { cellWidth: 32, halign: 'left'   },
      2: { cellWidth: 72, halign: 'left'   },
      3: { cellWidth: 36, halign: 'left', fontSize: 7 },
      4: { cellWidth: 30, halign: 'right'  },
      5: { cellWidth: 30, halign: 'right'  },
      6: { cellWidth: 32, halign: 'right', fontStyle: 'bold' },
    },
    didDrawPage: (hook) => {
      doc.setFontSize(7)
      doc.setTextColor(148, 163, 184)
      doc.text(
        `Halaman ${hook.pageNumber}`,
        pageW / 2,
        doc.internal.pageSize.getHeight() - 8,
        { align: 'center' },
      )
    },
    alternateRowStyles: { fillColor: [249, 250, 251] },
  })

  doc.save(`${exportBasename(data)}.pdf`)
}

// ════════════════════════════════════════════════════════════════════════════
// EXPORT EXCEL
// ════════════════════════════════════════════════════════════════════════════
export function exportCashBookExcel(data: CashBook): void {
  const wb = XLSX.utils.book_new()
  XLSX.utils.book_append_sheet(wb, buildSummarySheet(data), 'Ringkasan')
  XLSX.utils.book_append_sheet(wb, buildDetailSheet(data),  'Detail Mutasi')
  XLSX.writeFile(wb, `${exportBasename(data)}.xlsx`)
}