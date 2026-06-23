const express = require('express');
const router  = express.Router();
const ctrl    = require('../controllers/movimentacaoController');
 
router.get('/',               ctrl.listar);
router.post('/entrada',       ctrl.entrada);
router.post('/saida',         ctrl.saida);
router.post('/transferencia', ctrl.transferencia);
 
module.exports = router;