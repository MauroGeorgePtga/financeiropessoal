import { useState } from 'react'
import { supabase } from '../lib/supabase'
import { Upload, Download, X, AlertCircle, CheckCircle, FileText } from 'lucide-react'
import './ImportarInvestimentos.css'

export default function ImportarInvestimentos({ onClose, onSuccess, userId }) {
  const [arquivo, setArquivo] = useState(null)
  const [preview, setPreview] = useState([])
  const [erros, setErros] = useState([])
  const [processando, setProcessando] = useState(false)
  const [resultado, setResultado] = useState(null)

  const templateCSV = `tipo_operacao,tipo_ativo,ticker,nome_ativo,quantidade,preco_unitario,taxa_corretagem,emolumentos,outros_custos,data_operacao,observacoes
compra,acao,PETR4,Petrobras PN,100,25.50,5.00,0.50,0,2023-01-15,Primeira compra
compra,acao,VALE3,Vale ON,50,62.80,5.00,0.30,0,2023-02-20,
venda,acao,PETR4,Petrobras PN,50,38.00,5.00,0.25,0,2025-08-15,Realizacao de lucro
compra,fii,HGLG11,CSHG Logística,100,150.00,0,0,0,2023-03-10,Primeiro FII
compra,renda_fixa,CDB-BANCO,CDB 120% CDI,1,10000.00,0,0,0,2023-04-01,Vencimento 2025`

  const downloadTemplate = () => {
    const blob = new Blob([templateCSV], { type: 'text/csv;charset=utf-8;' })
    const url = window.URL.createObjectURL(blob)
    const link = document.createElement('a')
    link.href = url
    link.download = 'template_investimentos.csv'
    link.click()
    window.URL.revokeObjectURL(url)
  }

  const validarLinha = (linha, numeroLinha) => {
    const errosLinha = []

    // Validar tipo_operacao
    if (!['compra', 'venda'].includes(linha.tipo_operacao?.toLowerCase())) {
      errosLinha.push(`Tipo de operação inválido (deve ser 'compra' ou 'venda')`)
    }

    // Validar tipo_ativo
    const tiposValidos = ['acao', 'fii', 'renda_fixa', 'etf', 'fundo', 'cripto']
    if (!tiposValidos.includes(linha.tipo_ativo?.toLowerCase())) {
      errosLinha.push(`Tipo de ativo inválido (deve ser: ${tiposValidos.join(', ')})`)
    }

    // Validar campos obrigatórios
    if (!linha.ticker || linha.ticker.trim() === '') {
      errosLinha.push('Ticker é obrigatório')
    }

    if (!linha.nome_ativo || linha.nome_ativo.trim() === '') {
      errosLinha.push('Nome do ativo é obrigatório')
    }

    // Validar números
    const quantidade = parseFloat(linha.quantidade)
    if (isNaN(quantidade) || quantidade <= 0) {
      errosLinha.push('Quantidade inválida (deve ser número maior que 0)')
    }

    const preco = parseFloat(linha.preco_unitario)
    if (isNaN(preco) || preco <= 0) {
      errosLinha.push('Preço unitário inválido (deve ser número maior que 0)')
    }

    // Validar data
    if (!linha.data_operacao || !linha.data_operacao.match(/^\d{4}-\d{2}-\d{2}$/)) {
      errosLinha.push('Data inválida (formato deve ser AAAA-MM-DD)')
    }

    return errosLinha
  }

  const parseCSV = (texto) => {
    const linhas = texto.split('\n').filter(linha => linha.trim())
    
    if (linhas.length < 2) {
      throw new Error('Arquivo vazio ou sem dados')
    }

    const cabecalho = linhas[0].split(',').map(c => c.trim())
    const camposObrigatorios = [
      'tipo_operacao', 
      'tipo_ativo', 
      'ticker', 
      'nome_ativo', 
      'quantidade', 
      'preco_unitario', 
      'data_operacao'
    ]

    // Validar cabeçalho
    const camposFaltando = camposObrigatorios.filter(campo => !cabecalho.includes(campo))
    if (camposFaltando.length > 0) {
      throw new Error(`Campos obrigatórios faltando no cabeçalho: ${camposFaltando.join(', ')}`)
    }

    const dados = []
    const errosValidacao = []

    for (let i = 1; i < linhas.length; i++) {
      const valores = linhas[i].split(',').map(v => v.trim())
      
      if (valores.length !== cabecalho.length) {
        errosValidacao.push({
          linha: i + 1,
          erros: ['Número de colunas não corresponde ao cabeçalho']
        })
        continue
      }

      const objeto = {}
      cabecalho.forEach((campo, index) => {
        objeto[campo] = valores[index]
      })

      const errosLinha = validarLinha(objeto, i + 1)
      
      if (errosLinha.length > 0) {
        errosValidacao.push({
          linha: i + 1,
          dados: objeto,
          erros: errosLinha
        })
      } else {
        dados.push({
          tipo_operacao: objeto.tipo_operacao.toLowerCase(),
          tipo_ativo: objeto.tipo_ativo.toLowerCase(),
          ticker: objeto.ticker.toUpperCase(),
          nome_ativo: objeto.nome_ativo,
          quantidade: parseFloat(objeto.quantidade),
          preco_unitario: parseFloat(objeto.preco_unitario),
          taxa_corretagem: parseFloat(objeto.taxa_corretagem) || 0,
          emolumentos: parseFloat(objeto.emolumentos) || 0,
          outros_custos: parseFloat(objeto.outros_custos) || 0,
          data_operacao: objeto.data_operacao,
          observacoes: objeto.observacoes || null,
          user_id: userId
        })
      }
    }

    return { dados, errosValidacao }
  }

  const handleArquivo = (e) => {
    const file = e.target.files[0]
    if (!file) return

    if (!file.name.endsWith('.csv')) {
      setErros([{ mensagem: 'Por favor, selecione um arquivo CSV' }])
      return
    }

    setArquivo(file)
    setErros([])
    setResultado(null)

    const reader = new FileReader()
    reader.onload = (event) => {
      try {
        const texto = event.target.result
        const { dados, errosValidacao } = parseCSV(texto)
        
        setPreview(dados)
        setErros(errosValidacao)
      } catch (error) {
        setErros([{ mensagem: error.message }])
        setPreview([])
      }
    }
    reader.readAsText(file)
  }

  const handleImportar = async () => {
    if (preview.length === 0) {
      setErros([{ mensagem: 'Nenhum dado válido para importar' }])
      return
    }

    try {
      setProcessando(true)

      const { data, error } = await supabase
        .from('investimentos_operacoes')
        .insert(preview)

      if (error) throw error

      setResultado({
        sucesso: true,
        total: preview.length,
        mensagem: `${preview.length} operação(ões) importada(s) com sucesso!`
      })

      setTimeout(() => {
        onSuccess()
        onClose()
      }, 2000)
    } catch (error) {
      console.error('Erro ao importar:', error)
      setResultado({
        sucesso: false,
        mensagem: error.message || 'Erro ao importar operações'
      })
    } finally {
      setProcessando(false)
    }
  }

  const formatCurrency = (value) => {
    return new Intl.NumberFormat('pt-BR', {
      style: 'currency',
      currency: 'BRL'
    }).format(value)
  }

  const formatDate = (date) => {
    return new Date(date + 'T00:00:00').toLocaleDateString('pt-BR')
  }

  return (
    <div className="modal-overlay" onClick={onClose}>
      <div className="modal-content modal-import" onClick={(e) => e.stopPropagation()}>
        <div className="modal-header">
          <h2>Importar Operações (CSV)</h2>
          <button className="btn-close" onClick={onClose}>
            <X size={24} />
          </button>
        </div>

        <div className="import-body">
          {/* Instruções */}
          <div className="import-instrucoes">
            <h3>📋 Como importar:</h3>
            <ol>
              <li>Baixe o template CSV clicando no botão abaixo</li>
              <li>Preencha com suas operações seguindo o exemplo</li>
              <li>Salve o arquivo e faça o upload aqui</li>
              <li>Confira o preview e confirme a importação</li>
            </ol>

            <button className="btn-download" onClick={downloadTemplate}>
              <Download size={20} />
              Baixar Template CSV
            </button>
          </div>

          {/* Campos Obrigatórios */}
          <div className="import-campos">
            <h4>Campos do CSV:</h4>
            <ul>
              <li><strong>tipo_operacao:</strong> compra ou venda</li>
              <li><strong>tipo_ativo:</strong> acao, fii, renda_fixa, etf, fundo ou cripto</li>
              <li><strong>ticker:</strong> código do ativo (ex: PETR4, HGLG11)</li>
              <li><strong>nome_ativo:</strong> nome completo do ativo</li>
              <li><strong>quantidade:</strong> número de ativos (use ponto como decimal)</li>
              <li><strong>preco_unitario:</strong> preço por unidade (use ponto como decimal)</li>
              <li><strong>taxa_corretagem:</strong> taxa de corretagem (opcional, padrão 0)</li>
              <li><strong>emolumentos:</strong> emolumentos (opcional, padrão 0)</li>
              <li><strong>outros_custos:</strong> outros custos (opcional, padrão 0)</li>
              <li><strong>data_operacao:</strong> data no formato AAAA-MM-DD (ex: 2023-01-15)</li>
              <li><strong>observacoes:</strong> anotações (opcional)</li>
            </ul>
          </div>

          {/* Upload */}
          <div className="import-upload">
            <label className="upload-area">
              <Upload size={48} />
              <span>Clique para selecionar o arquivo CSV</span>
              <input
                type="file"
                accept=".csv"
                onChange={handleArquivo}
                style={{ display: 'none' }}
              />
            </label>
            {arquivo && (
              <div className="arquivo-selecionado">
                <FileText size={20} />
                <span>{arquivo.name}</span>
              </div>
            )}
          </div>

          {/* Erros */}
          {erros.length > 0 && (
            <div className="import-erros">
              <div className="erro-header">
                <AlertCircle size={20} />
                <h4>Erros encontrados ({erros.length}):</h4>
              </div>
              <div className="erros-list">
                {erros.map((erro, index) => (
                  <div key={index} className="erro-item">
                    {erro.linha && <strong>Linha {erro.linha}:</strong>}
                    {erro.mensagem && <p>{erro.mensagem}</p>}
                    {erro.erros && (
                      <ul>
                        {erro.erros.map((e, i) => (
                          <li key={i}>{e}</li>
                        ))}
                      </ul>
                    )}
                    {erro.dados && (
                      <pre>{JSON.stringify(erro.dados, null, 2)}</pre>
                    )}
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* Preview */}
          {preview.length > 0 && (
            <div className="import-preview">
              <div className="preview-header">
                <CheckCircle size={20} />
                <h4>Preview: {preview.length} operação(ões) válida(s)</h4>
              </div>
              <div className="preview-table-container">
                <table className="preview-table">
                  <thead>
                    <tr>
                      <th>Operação</th>
                      <th>Tipo</th>
                      <th>Ticker</th>
                      <th>Nome</th>
                      <th>Qtd</th>
                      <th>Preço</th>
                      <th>Total</th>
                      <th>Data</th>
                    </tr>
                  </thead>
                  <tbody>
                    {preview.slice(0, 10).map((op, index) => {
                      const total = (op.quantidade * op.preco_unitario) + 
                                   op.taxa_corretagem + 
                                   op.emolumentos + 
                                   op.outros_custos
                      return (
                        <tr key={index}>
                          <td>
                            <span className={`badge-${op.tipo_operacao}`}>
                              {op.tipo_operacao === 'compra' ? '🟢' : '🔴'}
                            </span>
                          </td>
                          <td>{op.tipo_ativo}</td>
                          <td><strong>{op.ticker}</strong></td>
                          <td>{op.nome_ativo}</td>
                          <td>{op.quantidade}</td>
                          <td>{formatCurrency(op.preco_unitario)}</td>
                          <td><strong>{formatCurrency(total)}</strong></td>
                          <td>{formatDate(op.data_operacao)}</td>
                        </tr>
                      )
                    })}
                  </tbody>
                </table>
                {preview.length > 10 && (
                  <p className="preview-mais">
                    ... e mais {preview.length - 10} operação(ões)
                  </p>
                )}
              </div>
            </div>
          )}

          {/* Resultado */}
          {resultado && (
            <div className={`import-resultado ${resultado.sucesso ? 'sucesso' : 'erro'}`}>
              {resultado.sucesso ? <CheckCircle size={24} /> : <AlertCircle size={24} />}
              <p>{resultado.mensagem}</p>
            </div>
          )}
        </div>

        <div className="modal-footer">
          <button className="btn-secondary" onClick={onClose} disabled={processando}>
            Cancelar
          </button>
          <button 
            className="btn-primary"
            onClick={handleImportar}
            disabled={preview.length === 0 || processando || resultado?.sucesso}
          >
            {processando ? 'Importando...' : `Importar ${preview.length} Operação(ões)`}
          </button>
        </div>
      </div>
    </div>
  )
}
