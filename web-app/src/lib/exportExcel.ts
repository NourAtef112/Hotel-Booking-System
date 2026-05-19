import type ExcelJS from 'exceljs'

// ── Colour palette (ARGB) ─────────────────────────────────────────────────
const C = {
  brandRed:    'FFB30000',
  darkBg:      'FF181818',
  sectionBg:   'FF2A2A2A',
  sectionText: 'FFBBBBBB',
  stripeBg:    'FFF7F7F7',
  white:       'FFFFFFFF',
  border:      'FFE0E0E0',
  // status
  confirmedBg: 'FFD1FAE5', confirmedFg: 'FF065F46',
  pendingBg:   'FFFEF3C7', pendingFg:   'FF92400E',
  cancelledBg: 'FFFEE2E2', cancelledFg: 'FF991B1B',
  completedBg: 'FFF3F4F6', completedFg: 'FF374151',
} as const

const STATUS_BG: Record<string, string> = {
  confirmed: C.confirmedBg, pending: C.pendingBg,
  cancelled: C.cancelledBg, completed: C.completedBg,
}
const STATUS_FG: Record<string, string> = {
  confirmed: C.confirmedFg, pending: C.pendingFg,
  cancelled: C.cancelledFg, completed: C.completedFg,
}

// ── Low-level helpers ─────────────────────────────────────────────────────

function fill(cell: ExcelJS.Cell, argb: string) {
  cell.fill = { type: 'pattern', pattern: 'solid', fgColor: { argb } }
}

function thinBorder(cell: ExcelJS.Cell) {
  const side = { style: 'thin' as const, color: { argb: C.border } }
  cell.border = { top: side, bottom: side, left: side, right: side }
}

function styleHeaderRow(row: ExcelJS.Row, bgArgb: string, fgArgb: string, size = 10) {
  row.height = 30
  row.eachCell({ includeEmpty: true }, (cell) => {
    fill(cell, bgArgb)
    cell.font = { bold: true, color: { argb: fgArgb }, size }
    cell.alignment = { vertical: 'middle', horizontal: 'center', wrapText: false }
    thinBorder(cell)
  })
}

function addTitleBlock(ws: ExcelJS.Worksheet, title: string, subtitle: string, note: string, cols: number) {
  // Row 1 — brand-red hero
  const r1 = ws.addRow([title])
  ws.mergeCells(r1.number, 1, r1.number, cols)
  fill(r1.getCell(1), C.brandRed)
  r1.getCell(1).font = { bold: true, color: { argb: C.white }, size: 16 }
  r1.getCell(1).alignment = { vertical: 'middle', horizontal: 'center' }
  r1.height = 44

  // Row 2 — dark subtitle
  const r2 = ws.addRow([subtitle])
  ws.mergeCells(r2.number, 1, r2.number, cols)
  fill(r2.getCell(1), C.darkBg)
  r2.getCell(1).font = { bold: true, color: { argb: 'FFE0E0E0' }, size: 11 }
  r2.getCell(1).alignment = { vertical: 'middle', horizontal: 'center' }
  r2.height = 26

  // Row 3 — generated note
  const r3 = ws.addRow([note])
  ws.mergeCells(r3.number, 1, r3.number, cols)
  fill(r3.getCell(1), 'FF2D2D2D')
  r3.getCell(1).font = { italic: true, color: { argb: 'FF888888' }, size: 9 }
  r3.getCell(1).alignment = { vertical: 'middle', horizontal: 'center' }
  r3.height = 18

  ws.addRow([]) // spacer
}

function addSectionHead(ws: ExcelJS.Worksheet, label: string, cols: number) {
  const r = ws.addRow([label])
  ws.mergeCells(r.number, 1, r.number, cols)
  fill(r.getCell(1), C.sectionBg)
  r.getCell(1).font = { bold: true, italic: true, color: { argb: C.sectionText }, size: 10 }
  r.getCell(1).alignment = { vertical: 'middle', horizontal: 'left', indent: 1 }
  r.height = 22
}

async function download(wb: ExcelJS.Workbook, filename: string) {
  const buf = await wb.xlsx.writeBuffer()
  const blob = new Blob([buf], {
    type: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
  })
  const url = URL.createObjectURL(blob)
  const a = document.createElement('a')
  a.href = url
  a.download = filename.endsWith('.xlsx') ? filename : `${filename}.xlsx`
  document.body.appendChild(a)
  a.click()
  document.body.removeChild(a)
  URL.revokeObjectURL(url)
}

// ── Bookings export ───────────────────────────────────────────────────────

export async function exportBookingsExcel(
  bookings: {
    id: number; guest_name: string; guest_email?: string; guest_phone?: string
    room_id: number; start_date: string; end_date: string; status: string
  }[],
  roomMap: Map<number, { room_number: string; type: string; price_per_night: number }>,
  filename: string,
) {
  const ExcelJS = (await import('exceljs')).default
  const wb = new ExcelJS.Workbook()
  wb.creator = 'E-JUST Admin Portal'
  wb.created = new Date()

  const ws = wb.addWorksheet('Reservations', {
    pageSetup: { paperSize: 9, orientation: 'landscape', fitToPage: true, fitToWidth: 1 },
  })

  const COLS = 12
  const today = new Date().toISOString().split('T')[0]

  addTitleBlock(ws, 'E-JUST GUEST HOUSE', 'RESERVATIONS REPORT',
    `Generated: ${today}  ·  Total records: ${bookings.length}`, COLS)

  // Column headers
  const hRow = ws.addRow(['ID', 'Guest Name', 'Email', 'Mobile', 'Room No.', 'Room Type', 'Check-in', 'Check-out', 'Nights', 'Status', 'Price / Night (EGP)', 'Total Cost (EGP)'])
  styleHeaderRow(hRow, C.brandRed, C.white, 10)

  // Data rows
  bookings.forEach((b, idx) => {
    const room = roomMap.get(b.room_id)
    const nights = Math.max(0, Math.round(
      (new Date(b.end_date + 'T00:00:00').getTime() - new Date(b.start_date + 'T00:00:00').getTime()) / 86_400_000,
    ))
    const cost = room ? nights * room.price_per_night : null
    const stripe = idx % 2 === 1

    const row = ws.addRow([
      b.id,
      b.guest_name,
      b.guest_email ?? '',
      b.guest_phone ?? '',
      room ? room.room_number : `#${b.room_id}`,
      room ? room.type.charAt(0).toUpperCase() + room.type.slice(1) : '',
      b.start_date,
      b.end_date,
      nights,
      b.status.charAt(0).toUpperCase() + b.status.slice(1),
      room ? room.price_per_night : '',
      cost !== null ? Math.round(cost) : '',
    ])

    row.height = 22
    row.eachCell({ includeEmpty: true }, (cell, col) => {
      fill(cell, stripe ? C.stripeBg : C.white)
      cell.font = { size: 10 }
      cell.alignment = { vertical: 'middle' }
      thinBorder(cell)

      if (col === 1) cell.alignment = { vertical: 'middle', horizontal: 'center' }
      if (col === 3) { // Email — make clickable-ish
        cell.font = { size: 10, color: { argb: 'FF1D4ED8' } }
      }
      if (col === 5 || col === 6) cell.alignment = { vertical: 'middle', horizontal: 'center' }
      if (col === 7 || col === 8) cell.alignment = { vertical: 'middle', horizontal: 'center' }
      if (col === 9) {
        cell.alignment = { vertical: 'middle', horizontal: 'center' }
        cell.font = { bold: true, size: 10 }
      }
      if (col === 11 || col === 12) {
        cell.numFmt = '#,##0'
        cell.alignment = { vertical: 'middle', horizontal: 'right' }
        cell.font = { size: 10, color: { argb: 'FF065F46' } }
      }
      // Status pill colour
      if (col === 10) {
        const s = b.status
        fill(cell, STATUS_BG[s] ?? C.stripeBg)
        cell.font = { bold: true, size: 10, color: { argb: STATUS_FG[s] ?? 'FF000000' } }
        cell.alignment = { vertical: 'middle', horizontal: 'center' }
      }
    })
  })

  // Column widths
  ws.getColumn(1).width  = 7   // ID
  ws.getColumn(2).width  = 24  // Guest Name
  ws.getColumn(3).width  = 28  // Email
  ws.getColumn(4).width  = 18  // Mobile
  ws.getColumn(5).width  = 12  // Room No.
  ws.getColumn(6).width  = 13  // Room Type
  ws.getColumn(7).width  = 14  // Check-in
  ws.getColumn(8).width  = 14  // Check-out
  ws.getColumn(9).width  = 9   // Nights
  ws.getColumn(10).width = 14  // Status
  ws.getColumn(11).width = 22  // Price/Night
  ws.getColumn(12).width = 20  // Total Cost

  // Freeze header rows (4 title rows + 1 header = row 6)
  ws.views = [{ state: 'frozen', xSplit: 0, ySplit: 5 }]
  ws.autoFilter = { from: { row: 5, column: 1 }, to: { row: 5, column: COLS } }

  await download(wb, filename)
}

// ── Overview full report ──────────────────────────────────────────────────

export async function exportOverviewExcel(
  counts: Record<string, number>,
  revenue: { confirmed: number; pending: number },
  monthly: { label: string; count: number; revenue: number }[],
  revenueByType: [string, number][],
  occupancy: number,
  filename: string,
) {
  const ExcelJS = (await import('exceljs')).default
  const wb = new ExcelJS.Workbook()
  wb.creator = 'E-JUST Admin Portal'
  wb.created = new Date()

  const ws = wb.addWorksheet('Overview Report')
  const today = new Date().toISOString().split('T')[0]
  const COLS = 3

  ws.getColumn(1).width = 36
  ws.getColumn(2).width = 24
  ws.getColumn(3).width = 18

  addTitleBlock(ws, 'E-JUST GUEST HOUSE', 'OVERVIEW DASHBOARD REPORT', `Generated: ${today}`, COLS)

  function kv(rows: [string, string | number][], stripe0 = C.white) {
    rows.forEach(([k, v], i) => {
      const r = ws.addRow([k, v, ''])
      r.height = 21
      const bg = i % 2 === 0 ? stripe0 : C.stripeBg
      r.eachCell({ includeEmpty: true }, (c) => { fill(c, bg); thinBorder(c) })
      r.getCell(1).font = { size: 10, color: { argb: 'FF444444' } }
      r.getCell(2).font = { bold: true, size: 10 }
      r.getCell(2).alignment = { horizontal: 'right' }
    })
  }

  // ── Booking summary
  addSectionHead(ws, '  BOOKING SUMMARY', COLS)
  const bh = ws.addRow(['Metric', 'Value', ''])
  styleHeaderRow(bh, C.sectionBg, C.sectionText, 9)
  kv([
    ['Total Bookings', counts.total],
    ['Confirmed', counts.confirmed],
    ['Pending', counts.pending],
    ['Cancelled', counts.cancelled],
    ['Completed', counts.completed],
    ['Occupancy Rate', `${occupancy}%`],
  ])
  ws.addRow([])

  // ── Revenue summary
  addSectionHead(ws, '  REVENUE SUMMARY', COLS)
  const rh = ws.addRow(['Metric', 'Value (EGP)', ''])
  styleHeaderRow(rh, C.sectionBg, C.sectionText, 9)
  const revRows: [string, number][] = [
    ['Confirmed Revenue', Math.round(revenue.confirmed)],
    ['Pending Revenue', Math.round(revenue.pending)],
    ['Total Pipeline', Math.round(revenue.confirmed + revenue.pending)],
  ]
  revRows.forEach(([k, v], i) => {
    const r = ws.addRow([k, v, ''])
    r.height = 21
    const bg = i % 2 === 0 ? C.white : C.stripeBg
    r.eachCell({ includeEmpty: true }, (c) => { fill(c, bg); thinBorder(c) })
    r.getCell(1).font = { size: 10, color: { argb: 'FF444444' } }
    r.getCell(2).font = { bold: true, size: 10, color: { argb: C.confirmedFg } }
    r.getCell(2).numFmt = '#,##0'
    r.getCell(2).alignment = { horizontal: 'right' }
  })
  ws.addRow([])

  // ── Monthly breakdown
  addSectionHead(ws, '  MONTHLY BREAKDOWN (Last 6 Months)', COLS)
  const mh = ws.addRow(['Month', 'Bookings', 'Revenue (EGP)'])
  styleHeaderRow(mh, C.sectionBg, C.sectionText, 9)
  monthly.forEach((m, i) => {
    const r = ws.addRow([m.label, m.count, Math.round(m.revenue)])
    r.height = 21
    const bg = i % 2 === 0 ? C.white : C.stripeBg
    r.eachCell({ includeEmpty: true }, (c) => { fill(c, bg); thinBorder(c) })
    r.getCell(1).font = { size: 10 }
    r.getCell(1).alignment = { horizontal: 'center' }
    r.getCell(2).font = { bold: true, size: 10 }
    r.getCell(2).alignment = { horizontal: 'center' }
    r.getCell(3).font = { size: 10, color: { argb: C.confirmedFg } }
    r.getCell(3).numFmt = '#,##0'
    r.getCell(3).alignment = { horizontal: 'right' }
  })
  ws.addRow([])

  // ── Revenue by room type
  addSectionHead(ws, '  REVENUE BY ROOM TYPE', COLS)
  const th = ws.addRow(['Room Type', 'Revenue (EGP)', ''])
  styleHeaderRow(th, C.sectionBg, C.sectionText, 9)
  revenueByType.forEach(([type, amt], i) => {
    const r = ws.addRow([type.charAt(0).toUpperCase() + type.slice(1), Math.round(amt), ''])
    r.height = 21
    const bg = i % 2 === 0 ? C.white : C.stripeBg
    r.eachCell({ includeEmpty: true }, (c) => { fill(c, bg); thinBorder(c) })
    r.getCell(1).font = { size: 10 }
    r.getCell(2).font = { bold: true, size: 10, color: { argb: C.confirmedFg } }
    r.getCell(2).numFmt = '#,##0'
    r.getCell(2).alignment = { horizontal: 'right' }
  })

  ws.views = [{ state: 'frozen', xSplit: 0, ySplit: 4 }]
  await download(wb, filename)
}

// ── Monthly chart data export ─────────────────────────────────────────────

export async function exportMonthlyChartExcel(
  monthly: { label: string; count: number; revenue: number }[],
  filename: string,
) {
  const ExcelJS = (await import('exceljs')).default
  const wb = new ExcelJS.Workbook()
  wb.creator = 'E-JUST Admin Portal'
  wb.created = new Date()
  const ws = wb.addWorksheet('Monthly Bookings')
  const today = new Date().toISOString().split('T')[0]
  const COLS = 3

  addTitleBlock(ws, 'E-JUST GUEST HOUSE', 'MONTHLY BOOKINGS — Last 6 Months', `Generated: ${today}`, COLS)

  const hRow = ws.addRow(['Month', 'Bookings Count', 'Revenue (EGP)'])
  styleHeaderRow(hRow, C.brandRed, C.white, 10)

  monthly.forEach((m, i) => {
    const r = ws.addRow([m.label, m.count, Math.round(m.revenue)])
    r.height = 22
    r.eachCell({ includeEmpty: true }, (c) => { fill(c, i % 2 === 0 ? C.white : C.stripeBg); thinBorder(c) })
    r.getCell(1).font = { bold: true, size: 10 }
    r.getCell(1).alignment = { horizontal: 'center', vertical: 'middle' }
    r.getCell(2).font = { size: 10 }
    r.getCell(2).alignment = { horizontal: 'center', vertical: 'middle' }
    r.getCell(3).font = { size: 10, color: { argb: C.confirmedFg } }
    r.getCell(3).numFmt = '#,##0'
    r.getCell(3).alignment = { horizontal: 'right', vertical: 'middle' }
  })

  ws.getColumn(1).width = 14
  ws.getColumn(2).width = 18
  ws.getColumn(3).width = 22
  ws.views = [{ state: 'frozen', xSplit: 0, ySplit: 5 }]
  await download(wb, filename)
}

// ── Revenue trend export ──────────────────────────────────────────────────

export async function exportRevenueTrendExcel(
  monthly: { label: string; count: number; revenue: number }[],
  revenueByType: [string, number][],
  filename: string,
) {
  const ExcelJS = (await import('exceljs')).default
  const wb = new ExcelJS.Workbook()
  wb.creator = 'E-JUST Admin Portal'
  wb.created = new Date()
  const ws = wb.addWorksheet('Revenue Trend')
  const today = new Date().toISOString().split('T')[0]
  const COLS = 2

  addTitleBlock(ws, 'E-JUST GUEST HOUSE', 'REVENUE TREND REPORT', `Generated: ${today}`, COLS)

  addSectionHead(ws, '  MONTHLY CONFIRMED REVENUE', COLS)
  const h1 = ws.addRow(['Month', 'Revenue (EGP)'])
  styleHeaderRow(h1, C.brandRed, C.white, 10)
  monthly.forEach((m, i) => {
    const r = ws.addRow([m.label, Math.round(m.revenue)])
    r.height = 22
    r.eachCell({ includeEmpty: true }, (c) => { fill(c, i % 2 === 0 ? C.white : C.stripeBg); thinBorder(c) })
    r.getCell(1).font = { bold: true, size: 10 }
    r.getCell(1).alignment = { horizontal: 'center', vertical: 'middle' }
    r.getCell(2).font = { size: 10, color: { argb: C.confirmedFg } }
    r.getCell(2).numFmt = '#,##0'
    r.getCell(2).alignment = { horizontal: 'right', vertical: 'middle' }
  })

  ws.addRow([])
  addSectionHead(ws, '  REVENUE BY ROOM TYPE', COLS)
  const h2 = ws.addRow(['Room Type', 'Revenue (EGP)'])
  styleHeaderRow(h2, C.brandRed, C.white, 10)
  revenueByType.forEach(([type, amt], i) => {
    const r = ws.addRow([type.charAt(0).toUpperCase() + type.slice(1), Math.round(amt)])
    r.height = 22
    r.eachCell({ includeEmpty: true }, (c) => { fill(c, i % 2 === 0 ? C.white : C.stripeBg); thinBorder(c) })
    r.getCell(1).font = { bold: true, size: 10 }
    r.getCell(2).font = { size: 10, color: { argb: C.confirmedFg } }
    r.getCell(2).numFmt = '#,##0'
    r.getCell(2).alignment = { horizontal: 'right', vertical: 'middle' }
  })

  ws.getColumn(1).width = 20
  ws.getColumn(2).width = 24
  ws.views = [{ state: 'frozen', xSplit: 0, ySplit: 4 }]
  await download(wb, filename)
}
