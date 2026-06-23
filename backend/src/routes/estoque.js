const express = require('express');
const router  = express.Router();
const ctrl    = require('../controllers/estoqueController');

router.get('/estoques',    ctrl.listarEstoques);
router.get('/estoque/:id', ctrl.buscarEstoquePorId);
router.get('/',            ctrl.listar);
router.get('/:id',         ctrl.buscarPorId);
router.post('/',           ctrl.criar);
router.put('/item/:id',    ctrl.atualizarItem);
router.put('/:id',         ctrl.atualizar);
router.delete('/item/:id', ctrl.excluirItem);
router.delete('/:id',      ctrl.excluir);

module.exports = router;