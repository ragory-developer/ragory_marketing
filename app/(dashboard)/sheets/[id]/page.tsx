'use client'

import { useState, useEffect, useRef, useCallback } from 'react'
import { useRouter, useParams } from 'next/navigation'
import toast from 'react-hot-toast'
import Link from 'next/link'
import { 
  FileDown, FileUp, FileSpreadsheet, Printer, 
  PaintBucket, Type as TypeIcon, AlignLeft, AlignCenter, 
  AlignRight, WrapText, Trash2, Plus, 
  ChevronLeft, Bold, Italic 
} from 'lucide-react'

type CellKey = string // `${row}:${col}`
type CellData = {
  value: string
  bold: boolean
  italic: boolean
  fillColor: string
  textColor: string
  align: 'left' | 'center' | 'right'
  wrap: boolean
  format: 'text' | 'number' | 'currency' | 'percent' | 'date'
}

const DEFAULT: CellData = {
  value: '', bold: false, italic: false,
  fillColor: '', textColor: '',
  align: 'left', wrap: false, format: 'text'
}

function colLabel(i: number): string {
  let label = ''
  let n = i + 1
  while (n > 0) {
    n--
    label = String.fromCharCode(65 + (n % 26)) + label
    n = Math.floor(n / 26)
  }
  return label
}

function formatDisplay(value: string, format: string): string {
  if (!value) return ''
  const num = parseFloat(value)
  switch (format) {
    case 'number': return isNaN(num) ? value : num.toLocaleString()
    case 'currency': return isNaN(num) ? value : '$' + num.toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })
    case 'percent': return isNaN(num) ? value : (num * 100).toFixed(1) + '%'
    case 'date': { const d = new Date(value); return isNaN(d.getTime()) ? value : d.toLocaleDateString() }
    default: return value
  }
}

export default function SheetEditorPage() {
  const params = useParams()
  const id = params.id as string
  const router = useRouter()
  const [sheet, setSheet] = useState<any>(null)
  const [cells, setCells] = useState<Record<CellKey, CellData>>({})
  const [rows, setRows] = useState(10)
  const [cols, setCols] = useState(10)
  const [selection, setSelection] = useState<{ startRow: number; startCol: number; endRow: number; endCol: number } | null>(null)
  const [editCell, setEditCell] = useState<{ row: number; col: number } | null>(null)
  const [editValue, setEditValue] = useState('')
  const [saving, setSaving] = useState(false)
  const [isSelecting, setIsSelecting] = useState(false)
  const [internalClipboard, setInternalClipboard] = useState<any[][] | null>(null)
  const [showPrintDialog, setShowPrintDialog] = useState(false)
  const [printRange, setPrintRange] = useState({ startRow: 1, endRow: 10, startCol: 1, endCol: 10 })
  const [colWidths, setColWidths] = useState<Record<number, number>>({})
  const [isResizing, setIsResizing] = useState<{ col: number; startX: number; startWidth: number } | null>(null)
  const [showFillPalette, setShowFillPalette] = useState(false)
  const [showTextPalette, setShowTextPalette] = useState(false)
  const inputRef = useRef<HTMLInputElement>(null)

  const PALETTE = [
    '#ffffff', '#f8f9fa', '#e8f0fe', '#e6f4ea', '#fef7e0', 
    '#fce8e6', '#e4f7fb', '#feefe3', '#f3e8fd', '#1a73e8',
    '#1e8e3e', '#f9ab00', '#d93025', '#12b5cb', '#9334e6'
  ]

  useEffect(() => {
    const handleMouseMove = (e: MouseEvent) => {
      if (isResizing) {
        const diff = e.clientX - isResizing.startX
        setColWidths(prev => ({ ...prev, [isResizing.col]: Math.max(50, isResizing.startWidth + diff) }))
      }
    }
    const handleMouseUp = () => {
      if (isResizing) {
        setColWidths(prev => {
          const finalWidth = prev[isResizing.col]
          fetch(`/api/sheets/${params.id}/cells`, {
            method: 'PATCH',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ row: -1, col: isResizing.col, value: finalWidth.toString() })
          })
          return prev
        })
        setIsResizing(null)
      }
      setIsSelecting(false)
    }
    window.addEventListener('mousemove', handleMouseMove)
    window.addEventListener('mouseup', handleMouseUp)
    return () => { window.removeEventListener('mousemove', handleMouseMove); window.removeEventListener('mouseup', handleMouseUp) }
  }, [isResizing, id])

  const loadData = useCallback(() => {
    fetch(`/api/sheets/${id}`)
      .then(r => r.json())
      .then(data => {
        if (data.error) { toast.error(data.error); return }
        setSheet(data)
        setRows(data.rowCount || 10)
        setCols(data.colCount || 10)
        const map: Record<CellKey, CellData> = {}
        const loadedWidths: Record<number, number> = {}
        for (const c of data.cells || []) {
          if (c.row === -1) {
            loadedWidths[c.col] = parseInt(c.value) || 120
            continue
          }
          map[`${c.row}:${c.col}`] = {
            value: c.value || '', bold: c.bold, italic: c.italic,
            fillColor: c.fillColor || '', textColor: c.textColor || '',
            align: c.align as any, wrap: c.wrap, format: c.format as any
          }
        }
        setCells(map)
        setColWidths(loadedWidths)
      })
      .catch(() => toast.error('Failed to load sheet'))
  }, [id])

  useEffect(() => {
    loadData()
  }, [loadData])

  const getCell = (row: number, col: number): CellData =>
    cells[`${row}:${col}`] || { ...DEFAULT }

  const selCell = selection ? getCell(selection.startRow, selection.startCol) : { ...DEFAULT }

  const isCellInRange = (r: number, c: number) => {
    if (!selection) return false
    const minR = Math.min(selection.startRow, selection.endRow)
    const maxR = Math.max(selection.startRow, selection.endRow)
    const minC = Math.min(selection.startCol, selection.endCol)
    const maxC = Math.max(selection.startCol, selection.endCol)
    return r >= minR && r <= maxR && c >= minC && c <= maxC
  }

  const isCellSelected = (r: number, c: number) => {
    return selection?.startRow === r && selection?.startCol === c
  }

  const getCellSelectionStyle = (r: number, c: number) => {
    if (!selection) return {}
    const minR = Math.min(selection.startRow, selection.endRow)
    const maxR = Math.max(selection.startRow, selection.endRow)
    const minC = Math.min(selection.startCol, selection.endCol)
    const maxC = Math.max(selection.startCol, selection.endCol)
    
    const inRange = r >= minR && r <= maxR && c >= minC && c <= maxC
    if (!inRange) return {}

    const isStart = r === selection.startRow && c === selection.startCol
    
    return {
      background: isStart ? '#ffffff' : 'rgba(26, 115, 232, 0.1)',
      borderTop: r === minR ? '2px solid #1a73e8' : '1px solid #bbb',
      borderBottom: r === maxR ? '2px solid #1a73e8' : '1px solid #bbb',
      borderLeft: c === minC ? '2px solid #1a73e8' : '1px solid #bbb',
      borderRight: c === maxC ? '2px solid #1a73e8' : '1px solid #bbb',
      zIndex: isStart ? 3 : 2
    }
  }

  const saveCell = useCallback(async (row: number, col: number, data: Partial<CellData>) => {
    setSaving(true)
    try {
      await fetch(`/api/sheets/${id}/cells`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ row, col, ...data })
      })
    } finally {
      setSaving(false)
    }
  }, [id])

  const updateCell = (row: number, col: number, data: Partial<CellData>) => {
    const key = `${row}:${col}`
    setCells(prev => ({ ...prev, [key]: { ...DEFAULT, ...prev[key], ...data } }))
    saveCell(row, col, data)
  }

  const applyFormat = (key: keyof CellData, value: any) => {
    if (!selection) return
    const minR = Math.min(selection.startRow, selection.endRow)
    const maxR = Math.max(selection.startRow, selection.endRow)
    const minC = Math.min(selection.startCol, selection.endCol)
    const maxC = Math.max(selection.startCol, selection.endCol)

    for (let r = Math.max(0, minR); r <= maxR; r++) {
      for (let c = Math.max(0, minC); c <= maxC; c++) {
        updateCell(r, c, { [key]: value })
      }
    }
  }

  const toggleFormat = (key: 'bold' | 'italic') => {
    if (!selection) return
    const cur = getCell(selection.startRow, selection.startCol)
    applyFormat(key, !cur[key])
  }

  const startEdit = (row: number, col: number, initialValue?: string) => {
    if (row < 0 || col < 0) return
    const cur = getCell(row, col)
    setEditCell({ row, col })
    setEditValue(initialValue !== undefined ? initialValue : cur.value)
    setTimeout(() => inputRef.current?.focus(), 0)
  }

  const commitEdit = (row: number, col: number) => {
    updateCell(row, col, { value: editValue })
    setEditCell(null)
    setEditValue('')
  }

  const handleKeyDown = (e: React.KeyboardEvent, row: number, col: number) => {
    if (e.key === 'Enter') { 
      commitEdit(row, col); 
      setSelection({ startRow: Math.min(row + 1, rows - 1), startCol: col, endRow: Math.min(row + 1, rows - 1), endCol: col }) 
    }
    else if (e.key === 'Escape') { setEditCell(null); setEditValue('') }
    else if (e.key === 'Tab') { 
      e.preventDefault(); 
      commitEdit(row, col); 
      setSelection({ startRow: row, startCol: Math.min(col + 1, cols - 1), endRow: row, endCol: Math.min(col + 1, cols - 1) }) 
    }
  }

  const handleCellMouseDown = (row: number, col: number) => {
    if (editCell?.row === row && editCell?.col === col) return
    setSelection({ startRow: row, startCol: col, endRow: row, endCol: col })
    setIsSelecting(true)
    setEditCell(null)
  }

  const handleCellMouseEnter = (row: number, col: number) => {
    if (isSelecting && selection) {
      setSelection(prev => prev ? { ...prev, endRow: row, endCol: col } : null)
    }
  }

  const handleCellDoubleClick = (row: number, col: number) => {
    startEdit(row, col)
  }

  const handleAddRow = async () => {
    const res = await fetch(`/api/sheets/${id}/rows`, { method: 'POST' })
    const data = await res.json()
    if (data.rowCount) setRows(data.rowCount)
  }

  const handleAddCol = async () => {
    const res = await fetch(`/api/sheets/${id}/cols`, { method: 'POST' })
    const data = await res.json()
    if (data.colCount) setCols(data.colCount)
  }

  const handleDeleteRow = async () => {
    if (!selection || selection.startRow < 0) return
    const res = await fetch(`/api/sheets/${id}/rows/${selection.startRow}`, { method: 'DELETE' })
    const data = await res.json()
    if (data.rowCount) {
      setRows(data.rowCount)
      loadData()
      setSelection(null)
    }
  }

  const handleDeleteCol = async () => {
    if (!selection || selection.startCol < 0) return
    const res = await fetch(`/api/sheets/${id}/cols/${selection.startCol}`, { method: 'DELETE' })
    const data = await res.json()
    if (data.colCount) {
      setCols(data.colCount)
      loadData()
      setSelection(null)
    }
  }

  const handleCopy = () => {
    if (!selection) return
    const minR = Math.min(selection.startRow, selection.endRow)
    const maxR = Math.max(selection.startRow, selection.endRow)
    const minC = Math.min(selection.startCol, selection.endCol)
    const maxC = Math.max(selection.startCol, selection.endCol)

    const data: any[][] = []
    for (let r = minR; r <= maxR; r++) {
      const rowData: any[] = []
      for (let c = minC; c <= maxC; c++) {
        rowData.push({ ...getCell(r, c) })
      }
      data.push(rowData)
    }
    setInternalClipboard(data)
    toast.success('Range copied to internal clipboard')
  }

  const handlePaste = () => {
    if (!selection || !internalClipboard) return
    const startR = selection.startRow
    const startC = selection.startCol

    internalClipboard.forEach((rowData, rIdx) => {
      rowData.forEach((cellData, cIdx) => {
        const targetR = startR + rIdx
        const targetC = startC + cIdx
        if (targetR < rows && targetC < cols) {
          updateCell(targetR, targetC, cellData)
        }
      })
    })
    toast.success('Pasted')
  }

  const handleGridKeyDown = (e: React.KeyboardEvent) => {
    if (e.ctrlKey || e.metaKey) {
      if (e.key === 'c') { e.preventDefault(); handleCopy(); return }
      if (e.key === 'v') { e.preventDefault(); handlePaste(); return }
    }
    if (!selection || editCell) return
    const { startRow: row, startCol: col } = selection

    // Basic navigation
    if (e.key === 'ArrowUp') { e.preventDefault(); setSelection({ startRow: Math.max(0, row - 1), startCol: Math.max(0, col), endRow: Math.max(0, row - 1), endCol: Math.max(0, col) }) }
    else if (e.key === 'ArrowDown') { e.preventDefault(); setSelection({ startRow: Math.min(rows - 1, row + 1), startCol: Math.max(0, col), endRow: Math.min(rows - 1, row + 1), endCol: Math.max(0, col) }) }
    else if (e.key === 'ArrowLeft') { e.preventDefault(); setSelection({ startRow: Math.max(0, row), startCol: Math.max(0, col - 1), endRow: Math.max(0, row), endCol: Math.max(0, col - 1) }) }
    else if (e.key === 'ArrowRight') { e.preventDefault(); setSelection({ startRow: Math.max(0, row), startCol: Math.min(cols - 1, col + 1), endRow: Math.max(0, row), endCol: Math.min(cols - 1, col + 1) }) }
    else if (e.key === 'Delete' || e.key === 'Backspace') {
      e.preventDefault()
      const minR = Math.min(selection.startRow, selection.endRow)
      const maxR = Math.max(selection.startRow, selection.endRow)
      const minC = Math.min(selection.startCol, selection.endCol)
      const maxC = Math.max(selection.startCol, selection.endCol)

      for (let r = Math.max(0, minR); r <= maxR; r++) {
        for (let c = Math.max(0, minC); c <= maxC; c++) {
          updateCell(r, c, { value: '' })
        }
      }
    }
    else if (e.key === 'Enter') {
      e.preventDefault()
      if (row >= 0 && col >= 0) startEdit(row, col)
    }
    else if (e.key.length === 1 && !e.ctrlKey && !e.metaKey && !e.altKey) {
      if (row >= 0 && col >= 0) startEdit(row, col, e.key)
    }
  }

  const handleExportCSV = () => {
    // Find used range
    let maxUsedR = 0
    let maxUsedC = 0
    let hasData = false
    Object.keys(cells).forEach(key => {
      const [r, c] = key.split(':').map(Number)
      if (r >= 0 && c >= 0 && cells[key].value) {
        maxUsedR = Math.max(maxUsedR, r)
        maxUsedC = Math.max(maxUsedC, c)
        hasData = true
      }
    })

    if (!hasData) { toast.error('Sheet is empty'); return }

    let csv = ''
    for (let r = 0; r <= maxUsedR; r++) {
      const rowData: string[] = []
      for (let c = 0; c <= maxUsedC; c++) {
        rowData.push(`"${getCell(r, c).value.replace(/"/g, '""')}"`)
      }
      csv += rowData.join(',') + '\n'
    }
    const blob = new Blob([csv], { type: 'text/csv' })
    const url = URL.createObjectURL(blob)
    const a = document.createElement('a')
    a.href = url
    a.download = `${sheet.name || 'sheet'}.csv`
    a.click()
  }

  const handlePrint = () => {
    setShowPrintDialog(false)
    // Basic window print - in a real app you might generate a PDF on the backend or use a library
    window.print()
  }

  const handleExportExcel = () => {
    // For now, Excel export is CSV-based as it's the most compatible
    handleExportCSV()
  }

  const handleImportCSV = () => {
    const input = document.createElement('input')
    input.type = 'file'
    input.accept = '.csv'
    input.onchange = (e: any) => {
      const file = e.target.files[0]
      const reader = new FileReader()
      reader.onload = (event: any) => {
        const text = event.target.result
        const lines = text.split('\n')
        lines.forEach((line: string, r: number) => {
          const cols = line.split(',')
          cols.forEach((val: string, c: number) => {
            if (r < rows && c < cols.length) {
              updateCell(r, c, { value: val.replace(/^"|"$/g, '') })
            }
          })
        })
        toast.success('CSV Imported')
      }
      reader.readAsText(file)
    }
    input.click()
  }

  // Toolbar button style
  const tb = (active: boolean) => ({
    padding: '4px 8px', background: active ? '#e8f0fe' : 'transparent',
    border: '1px solid transparent',
    borderRadius: '4px', color: active ? '#1a73e8' : '#5f6368',
    cursor: 'pointer', fontSize: '13px', fontWeight: 600, transition: 'all 0.15s'
  })

  if (!sheet) return (
    <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', height: '60vh', color: '#6B7280' }}>
      Loading sheet...
    </div>
  )

  const selectedAddr = selection ? `${colLabel(Math.max(0, selection.startCol))}${Math.max(0, selection.startRow) + 1}` : ''

  return (
    <div style={{ display: 'flex', flexDirection: 'column', height: 'calc(100vh - 64px)', overflow: 'hidden', margin: '-32px', background: '#f8f9fa' }}>
      
      {/* ── TOOLBAR ── */}
      <div style={{ background: '#ffffff', borderBottom: '1px solid #e0e0e0', padding: '8px 16px', display: 'flex', alignItems: 'center', gap: '4px', flexWrap: 'wrap', flexShrink: 0 }}>
        
        <Link href="/sheets" style={{ color: '#5f6368', fontSize: '13px', textDecoration: 'none', marginRight: '12px', display: 'flex', alignItems: 'center', gap: '6px' }}>
          <ChevronLeft size={16} /> Sheets
        </Link>
        <span style={{ color: '#202124', fontWeight: 600, fontSize: '14px', marginRight: '16px' }}>{sheet.name}</span>
        
        {/* File Actions */}
        <div style={{ display: 'flex', gap: '4px', marginRight: '12px' }}>
          <button onClick={handleImportCSV} style={{ ...tb(false), display: 'flex', alignItems: 'center', gap: '4px' }} title="Import CSV">
            <FileUp size={16} /> Import
          </button>
          <button onClick={handleExportExcel} style={{ ...tb(false), display: 'flex', alignItems: 'center', gap: '4px' }} title="Export Excel">
            <FileSpreadsheet size={16} /> Excel
          </button>
          <button onClick={handleExportCSV} style={{ ...tb(false), display: 'flex', alignItems: 'center', gap: '4px' }} title="Export CSV">
            <FileDown size={16} /> CSV
          </button>
          <button onClick={() => setShowPrintDialog(true)} style={{ ...tb(false), display: 'flex', alignItems: 'center', gap: '4px' }} title="Print / PDF">
            <Printer size={16} /> Print
          </button>
        </div>

        {saving && <span style={{ fontSize: '11px', color: '#5f6368' }}>Saving…</span>}

        <div style={{ width: '1px', height: '20px', background: '#e0e0e0', margin: '0 6px' }} />

        {/* Cell Address */}
        <div style={{ background: '#f1f3f4', border: '1px solid #e0e0e0', borderRadius: '4px', padding: '4px 8px', fontSize: '12px', color: '#3c4043', minWidth: '40px', textAlign: 'center', fontWeight: 500 }}>
          {selectedAddr || '—'}
        </div>

        <div style={{ width: '1px', height: '20px', background: '#e0e0e0', margin: '0 8px' }} />

        {/* Bold / Italic */}
        <button style={tb(selCell.bold)} onClick={() => toggleFormat('bold')} title="Bold">
          <Bold size={16} />
        </button>
        <button style={tb(selCell.italic)} onClick={() => toggleFormat('italic')} title="Italic">
          <Italic size={16} />
        </button>

        <div style={{ width: '1px', height: '20px', background: '#e0e0e0', margin: '0 8px' }} />

        {/* Fill Color */}
        <div style={{ position: 'relative' }}>
          <button 
            style={{ ...tb(false), display: 'flex', alignItems: 'center', gap: '6px' }} 
            onClick={() => { setShowFillPalette(!showFillPalette); setShowTextPalette(false) }}
            title="Fill Color"
          >
            <PaintBucket size={16} />
            <div style={{ width: '14px', height: '14px', borderRadius: '2px', background: selCell.fillColor || '#ffffff', border: '1px solid #dadce0' }} />
          </button>
          {showFillPalette && (
            <div style={{ position: 'absolute', top: '100%', left: 0, background: '#fff', border: '1px solid #dadce0', borderRadius: '4px', padding: '6px', display: 'grid', gridTemplateColumns: 'repeat(5, 1fr)', gap: '4px', zIndex: 100, boxShadow: '0 4px 12px rgba(0,0,0,0.1)' }}>
              {PALETTE.map(c => (
                <div key={c} onClick={() => { applyFormat('fillColor', c); setShowFillPalette(false) }} style={{ width: '20px', height: '20px', background: c, border: '1px solid #eee', cursor: 'pointer', borderRadius: '2px' }} />
              ))}
              <div onClick={() => { applyFormat('fillColor', ''); setShowFillPalette(false) }} style={{ gridColumn: 'span 5', fontSize: '11px', textAlign: 'center', padding: '4px', cursor: 'pointer', borderTop: '1px solid #eee', marginTop: '4px', color: '#5f6368' }}>None</div>
            </div>
          )}
        </div>

        {/* Text Color */}
        <div style={{ position: 'relative' }}>
          <button 
            style={{ ...tb(false), display: 'flex', alignItems: 'center', gap: '4px' }} 
            onClick={() => { setShowTextPalette(!showTextPalette); setShowFillPalette(false) }}
            title="Text Color"
          >
            <span style={{ fontSize: '15px', fontWeight: 700, color: selCell.textColor || '#000000', borderBottom: `3px solid ${selCell.textColor || '#000000'}`, lineHeight: '14px' }}>A</span>
          </button>
          {showTextPalette && (
            <div style={{ position: 'absolute', top: '100%', left: 0, background: '#fff', border: '1px solid #dadce0', borderRadius: '4px', padding: '6px', display: 'grid', gridTemplateColumns: 'repeat(5, 1fr)', gap: '4px', zIndex: 100, boxShadow: '0 4px 12px rgba(0,0,0,0.1)' }}>
              {PALETTE.map(c => (
                <div key={c} onClick={() => { applyFormat('textColor', c); setShowTextPalette(false) }} style={{ width: '20px', height: '20px', background: c, border: '1px solid #eee', cursor: 'pointer', borderRadius: '2px' }} />
              ))}
              <div onClick={() => { applyFormat('textColor', '#000000'); setShowTextPalette(false) }} style={{ gridColumn: 'span 5', fontSize: '11px', textAlign: 'center', padding: '4px', cursor: 'pointer', borderTop: '1px solid #eee', marginTop: '4px', color: '#5f6368' }}>Reset</div>
            </div>
          )}
        </div>

        <div style={{ width: '1px', height: '20px', background: '#e0e0e0', margin: '0 6px' }} />

        {/* Alignment */}
        <button style={tb(selCell.align === 'left')} onClick={() => applyFormat('align', 'left')} title="Align Left">
          <AlignLeft size={16} />
        </button>
        <button style={tb(selCell.align === 'center')} onClick={() => applyFormat('align', 'center')} title="Align Center">
          <AlignCenter size={16} />
        </button>
        <button style={tb(selCell.align === 'right')} onClick={() => applyFormat('align', 'right')} title="Align Right">
          <AlignRight size={16} />
        </button>

        <div style={{ width: '1px', height: '20px', background: '#e0e0e0', margin: '0 8px' }} />

        {/* Wrap */}
        <button style={tb(selCell.wrap)} onClick={() => applyFormat('wrap', !selCell.wrap)} title="Wrap Text">
          <WrapText size={16} />
        </button>

        <div style={{ width: '1px', height: '20px', background: '#e0e0e0', margin: '0 8px' }} />

        {/* Clear Format */}
        <button 
          onClick={() => selection && updateCell(selection.startRow, selection.startCol, { bold: false, italic: false, fillColor: '', textColor: '', align: 'left', wrap: false, format: 'text' })} 
          style={tb(false)} 
          title="Clear Formatting"
        >
          <TypeIcon size={16} />
        </button>

        <div style={{ width: '1px', height: '20px', background: '#e0e0e0', margin: '0 8px' }} />

        {/* Format */}
        <select
          value={selCell.format}
          onChange={e => applyFormat('format', e.target.value)}
          style={{ background: '#f8f9fa', color: '#202124', border: '1px solid #dadce0', borderRadius: '4px', padding: '4px 8px', fontSize: '13px', cursor: 'pointer', outline: 'none' }}
        >
          <option value="text">Text</option>
          <option value="number">Number</option>
          <option value="currency">Currency ($)</option>
          <option value="percent">Percent (%)</option>
          <option value="date">Date</option>
        </select>

        <div style={{ width: '1px', height: '20px', background: '#e0e0e0', margin: '0 6px' }} />

        {/* Add / Delete Row */}
        <button onClick={handleAddRow} style={{ ...tb(false), color: '#0F9D58', border: '1px solid #ceead6', background: '#e6f4ea', display: 'flex', alignItems: 'center', gap: '4px' }}>
          <Plus size={14} /> Row
        </button>
        <button 
          onClick={handleDeleteRow} 
          disabled={!selection || selection.startRow < 0}
          style={{ ...tb(false), color: '#D93025', border: '1px solid #fad2cf', background: '#feefee', opacity: (!selection || selection.startRow < 0) ? 0.5 : 1, display: 'flex', alignItems: 'center', gap: '4px' }}
          title="Delete selected row"
        >
          <Trash2 size={14} /> Row
        </button>

        {/* Add / Delete Col */}
        <button onClick={handleAddCol} style={{ ...tb(false), color: '#0F9D58', border: '1px solid #ceead6', background: '#e6f4ea', display: 'flex', alignItems: 'center', gap: '4px' }}>
          <Plus size={14} /> Col
        </button>
        <button 
          onClick={handleDeleteCol} 
          disabled={!selection || selection.startCol < 0}
          style={{ ...tb(false), color: '#D93025', border: '1px solid #fad2cf', background: '#feefee', opacity: (!selection || selection.startCol < 0) ? 0.5 : 1, display: 'flex', alignItems: 'center', gap: '4px' }}
          title="Delete selected column"
        >
          <Trash2 size={14} /> Col
        </button>
      </div>

      {/* ── FORMULA BAR ── */}
      <div style={{ background: '#ffffff', borderBottom: '1px solid #e0e0e0', padding: '4px 16px', display: 'flex', alignItems: 'center', gap: '12px' }}>
        <span style={{ color: '#9aa0a6', fontStyle: 'italic', fontWeight: 600, fontSize: '14px', userSelect: 'none' }}>fx</span>
        <input 
          value={selection ? getCell(selection.startRow, selection.startCol).value : ''}
          onChange={e => selection && updateCell(selection.startRow, selection.startCol, { value: e.target.value })}
          style={{ flex: 1, border: 'none', outline: 'none', fontSize: '13px', color: '#000000', padding: '4px 0', fontFamily: 'monospace' }}
          placeholder={selection ? "" : "Select a cell..."}
          disabled={!selection}
        />
      </div>

      {/* ── GRID ── */}
      <div 
        tabIndex={0}
        onKeyDown={handleGridKeyDown}
        style={{ flex: 1, overflow: 'auto', background: '#f8f9fa', padding: '0 16px 16px 16px', outline: 'none' }}
      >
        <table style={{ borderCollapse: 'separate', borderSpacing: 0, tableLayout: 'fixed', background: '#ffffff', boxShadow: '0 1px 2px rgba(0,0,0,0.1)', border: '1px solid #bbb' }}>
          <thead>
            <tr>
              <th 
                onClick={() => setSelection(null)}
                style={{ width: '48px', minWidth: '48px', position: 'sticky', top: 0, left: 0, zIndex: 10, background: '#f1f3f4', borderRight: '1px solid #bbb', borderBottom: '1px solid #bbb', cursor: 'pointer' }} 
              />
              {Array.from({ length: cols }, (_, c) => (
                <th 
                  key={c} 
                  onClick={() => setSelection({ startRow: 0, startCol: c, endRow: rows - 1, endCol: c })}
                  style={{ 
                    position: 'sticky', top: 0, zIndex: 5, 
                    background: selection?.startCol === c && selection?.startRow === 0 && selection?.endRow === rows - 1 ? '#e8eaed' : '#f1f3f4', 
                    borderRight: '1px solid #bbb',
                    borderBottom: (selection?.startCol === c && selection?.startRow === 0 && selection?.endRow === rows - 1) ? '2px solid #1a73e8' : '1px solid #bbb',
                    color: (selection?.startCol === c && selection?.startRow === 0 && selection?.endRow === rows - 1) ? '#1a73e8' : '#5f6368', 
                    fontSize: '13px', fontWeight: 500, padding: '4px', textAlign: 'center', userSelect: 'none', 
                    width: colWidths[c] || 120, minWidth: colWidths[c] || 120, maxWidth: colWidths[c] || 120,
                    cursor: 'pointer'
                  }}
                >
                  {colLabel(c)}
                  <div 
                    onMouseDown={(e) => { e.stopPropagation(); setIsResizing({ col: c, startX: e.clientX, startWidth: colWidths[c] || 120 }) }}
                    style={{ position: 'absolute', right: 0, top: 0, bottom: 0, width: '4px', cursor: 'col-resize', background: isResizing?.col === c ? '#1a73e8' : 'transparent', zIndex: 10 }}
                  />
                </th>
              ))}
            </tr>
          </thead>
          <tbody>
            {Array.from({ length: rows }, (_, r) => (
              <tr key={r}>
                <td 
                  onClick={() => setSelection({ startRow: r, startCol: 0, endRow: r, endCol: cols - 1 })}
                  style={{ 
                    position: 'sticky', left: 0, zIndex: 5, 
                    background: selection?.startRow === r && selection?.startCol === 0 && selection?.endCol === cols - 1 ? '#e8eaed' : '#f1f3f4', 
                    borderRight: (selection?.startRow === r && selection?.startCol === 0 && selection?.endCol === cols - 1) ? '2px solid #1a73e8' : '1px solid #bbb', 
                    borderBottom: '1px solid #bbb', 
                    color: (selection?.startRow === r && selection?.startCol === 0 && selection?.endCol === cols - 1) ? '#1a73e8' : '#5f6368', 
                    fontSize: '13px', fontWeight: 500, textAlign: 'center', padding: '0 8px', userSelect: 'none', minWidth: '48px',
                    cursor: 'pointer'
                  }}
                >
                  {r + 1}
                </td>
                {Array.from({ length: cols }, (_, c) => {
                  const cell = getCell(r, c)
                  const isEdit = editCell?.row === r && editCell?.col === c
                  const selStyle = getCellSelectionStyle(r, c)
                  return (
                    <td
                      key={c}
                      onMouseDown={() => handleCellMouseDown(r, c)}
                      onMouseEnter={() => handleCellMouseEnter(r, c)}
                      onDoubleClick={() => handleCellDoubleClick(r, c)}
                      style={{
                        width: colWidths[c] || 120, minWidth: colWidths[c] || 120, maxWidth: colWidths[c] || 120,
                        height: '26px', padding: 0,
                        borderRight: '1px solid #bbb',
                        borderBottom: '1px solid #bbb',
                        background: cell.fillColor || 'transparent',
                        position: 'relative', cursor: 'cell',
                        userSelect: 'none',
                        zIndex: 0,
                        ...selStyle
                      }}
                    >
                      {isEdit ? (
                        <input
                          ref={inputRef}
                          value={editValue}
                          onChange={e => setEditValue(e.target.value)}
                          onBlur={() => commitEdit(r, c)}
                          onKeyDown={e => handleKeyDown(e, r, c)}
                          style={{
                            position: 'absolute', inset: -2, width: 'calc(100% + 4px)', height: 'calc(100% + 4px)',
                            background: '#ffffff', color: '#000000', border: '2px solid #1a73e8',
                            outline: 'none', padding: '0 5px', fontSize: '13px', zIndex: 10,
                            boxShadow: '0 2px 6px rgba(0,0,0,0.2)'
                          }}
                        />
                      ) : (
                        <div style={{
                          padding: '0 6px', fontSize: '13px', height: '26px', lineHeight: '26px',
                          fontWeight: cell.bold ? 700 : 400,
                          fontStyle: cell.italic ? 'italic' : 'normal',
                          color: cell.textColor || '#000000',
                          textAlign: cell.align,
                          whiteSpace: cell.wrap ? 'pre-wrap' : 'nowrap',
                          overflow: 'hidden', textOverflow: 'ellipsis'
                        }}>
                          {formatDisplay(cell.value, cell.format)}
                        </div>
                      )}
                    </td>
                  )
                })}
              </tr>
            ))}
          </tbody>
        </table>
      </div>
      {/* ── PRINT DIALOG ── */}
      {showPrintDialog && (
        <div style={{ position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.5)', zIndex: 1000, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
          <div style={{ background: '#fff', padding: '24px', borderRadius: '8px', width: '320px', boxShadow: '0 4px 20px rgba(0,0,0,0.2)' }}>
            <h3 style={{ marginTop: 0, fontSize: '18px', color: '#202124' }}>Print Settings</h3>
            <div style={{ display: 'grid', gap: '12px', margin: '20px 0' }}>
              <div>
                <label style={{ fontSize: '12px', color: '#5f6368', display: 'block', marginBottom: '4px' }}>Row Range (Start - End)</label>
                <div style={{ display: 'flex', gap: '8px' }}>
                  <input type="number" value={printRange.startRow} onChange={e => setPrintRange({ ...printRange, startRow: parseInt(e.target.value) })} style={{ width: '100%', padding: '6px', border: '1px solid #dadce0', borderRadius: '4px' }} />
                  <input type="number" value={printRange.endRow} onChange={e => setPrintRange({ ...printRange, endRow: parseInt(e.target.value) })} style={{ width: '100%', padding: '6px', border: '1px solid #dadce0', borderRadius: '4px' }} />
                </div>
              </div>
              <div>
                <label style={{ fontSize: '12px', color: '#5f6368', display: 'block', marginBottom: '4px' }}>Column Range (Start - End)</label>
                <div style={{ display: 'flex', gap: '8px' }}>
                  <input type="number" value={printRange.startCol} onChange={e => setPrintRange({ ...printRange, startCol: parseInt(e.target.value) })} style={{ width: '100%', padding: '6px', border: '1px solid #dadce0', borderRadius: '4px' }} />
                  <input type="number" value={printRange.endCol} onChange={e => setPrintRange({ ...printRange, endCol: parseInt(e.target.value) })} style={{ width: '100%', padding: '6px', border: '1px solid #dadce0', borderRadius: '4px' }} />
                </div>
              </div>
            </div>
            <div style={{ display: 'flex', justifyContent: 'flex-end', gap: '8px' }}>
              <button onClick={() => setShowPrintDialog(false)} style={{ padding: '8px 16px', border: 'none', background: '#f1f3f4', borderRadius: '4px', cursor: 'pointer' }}>Cancel</button>
              <button onClick={handlePrint} style={{ padding: '8px 16px', border: 'none', background: '#1a73e8', color: '#fff', borderRadius: '4px', cursor: 'pointer' }}>Print PDF</button>
            </div>
          </div>
        </div>
      )}

      {/* PRINT STYLES */}
      <style>{`
        #print-area { display: none; }
        @media print {
          nav, .toolbar, .formula-bar, .grid-container, button, select, .sidebar, #header-container, .modal { display: none !important; }
          body, html { margin: 0; padding: 0; background: #fff !important; width: 100%; height: auto; }
          #print-area { display: block !important; padding: 40px; width: 100%; box-sizing: border-box; }
          table.print-table { border-collapse: collapse; width: 100%; table-layout: fixed; }
          table.print-table td, table.print-table th { 
            border: 1px solid #000 !important; 
            padding: 8px; 
            font-size: 10pt; 
            word-wrap: break-word;
            overflow-wrap: break-word;
          }
          h2 { margin-bottom: 20px; color: #000; font-family: sans-serif; }
        }
      `}</style>

      {/* Hidden Print Area */}
      <div id="print-area">
        <h2 style={{ fontSize: '16px', marginBottom: '10px' }}>{sheet.name}</h2>
        <table className="print-table">
          <tbody>
            {Array.from({ length: Math.max(0, printRange.endRow - printRange.startRow + 1) }, (_, rIdx) => {
              const r = printRange.startRow - 1 + rIdx
              return (
                <tr key={r}>
                  {Array.from({ length: Math.max(0, printRange.endCol - printRange.startCol + 1) }, (_, cIdx) => {
                    const c = printRange.startCol - 1 + cIdx
                    const cell = getCell(r, c)
                    return (
                      <td key={c} style={{ 
                        textAlign: cell.align, 
                        fontWeight: cell.bold ? 'bold' : 'normal',
                        fontStyle: cell.italic ? 'italic' : 'normal',
                        color: cell.textColor || '#000',
                        background: cell.fillColor || '#fff'
                      }}>
                        {formatDisplay(cell.value, cell.format)}
                      </td>
                    )
                  })}
                </tr>
              )
            })}
          </tbody>
        </table>
      </div>
    </div>
  )
}

