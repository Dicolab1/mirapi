const router = require('express').Router();
const pool = require('../config/multiDb');

router.delete('/:id', async (req, res) => {
  const client = await pool.connect();
  
  try {
    const id = Number.parseInt(req.params.id);
    
    if (Number.isNaN(id)) {
      return res.status(400).json({
        erro: 'ID inválido'
      });
    }

    await client.query('BEGIN');
    
    // Verificar se o registro existe
    const existe = await client.query(`
      SELECT id FROM pessoas_mir WHERE id = $1
    `, [id]);
    
    if (existe.rows.length === 0) {
      await client.query('ROLLBACK');
      return res.status(404).json({
        erro: 'Registro não encontrado'
      });
    }
    
    // Deletar das duas tabelas (mantendo integridade referencial)
    // NOTA: As tabelas lexicais NÃO são deletadas porque são compartilhadas
    // entre vários registros. Apenas diminuímos a frequência de uso.
    
    await client.query(`
      DELETE FROM pessoas_mir WHERE id = $1
    `, [id]);
    
    await client.query(`
      DELETE FROM pessoas_normal WHERE id = $1
    `, [id]);
    
    await client.query('COMMIT');
    
    res.json({
      sucesso: true,
      mensagem: 'Registro excluído com sucesso'
    });
    
  } catch (error) {
    await client.query('ROLLBACK');
    console.error('Erro na exclusão:', error);
    res.status(500).json({
      erro: 'Erro ao excluir registro',
      detalhe: error.message
    });
  } finally {
    client.release();
  }
});

module.exports = router;
